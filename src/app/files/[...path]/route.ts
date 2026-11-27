import { createReadStream } from "fs";
import { mkdir, rename, stat } from "fs/promises";
import path from "path";
import { Readable } from "stream";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { isAdminRole } from "@/lib/roles";
import { UPLOAD_ROOT, FOLDERS, MIME_BY_EXT, THUMB_DIR } from "@/lib/upload";
import { THUMB_WIDTHS } from "@/lib/thumb";

const NAME = /^[a-f0-9-]{36}\.([a-z0-9]{2,5})$/;

const pending = new Map<string, Promise<boolean>>();

function makeThumb(src: string, out: string, width: number) {
  let job = pending.get(out);
  if (!job) {
    job = (async () => {
      try {
        const { default: sharp } = await import("sharp");
        await mkdir(path.dirname(out), { recursive: true });
        const tmp = `${out}.${process.pid}.tmp`;
        await sharp(src, { limitInputPixels: 80_000_000 })
          .rotate()
          .resize({ width, withoutEnlargement: true })
          .webp({ quality: 74, effort: 4 })
          .toFile(tmp);
        await rename(tmp, out);
        return true;
      } catch (e) {
        console.error("[thumb]", e instanceof Error ? e.message : e);
        return false;
      } finally {
        pending.delete(out);
      }
    })();
    pending.set(out, job);
  }
  return job;
}

const notFound = () => new Response("Tidak ditemukan", { status: 404, headers: { "Cache-Control": "no-store" } });

type Access = "public" | "member" | "deny";

async function accessFor(url: string, folder: string): Promise<{ access: Access; uploader?: string }> {
  if (folder === "docs") return { access: "member" };

  const [media, cover, material, groupPhoto] = await Promise.all([
    prisma.media.findFirst({
      where: { url },
      select: { status: true, uploadedBy: true, album: { select: { visibility: true } } },
    }),
    prisma.album.findFirst({ where: { coverUrl: url }, select: { visibility: true } }),
    prisma.material.findFirst({ where: { fileUrl: url }, select: { id: true } }),
    prisma.conversation.findFirst({ where: { imageUrl: url }, select: { id: true } }),
  ]);

  if (material || groupPhoto) return { access: "member" };
  if (media) {
    if (media.status !== "APPROVED") return { access: "deny", uploader: media.uploadedBy };
    if (media.album.visibility !== "PUBLIC") return { access: "member" };
    return { access: "public" };
  }
  if (cover && cover.visibility !== "PUBLIC") return { access: "member" };
  return { access: "public" };
}

export async function GET(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const parts = (await params).path;
  if (parts.length !== 2 || !(FOLDERS as readonly string[]).includes(parts[0])) return notFound();
  const match = parts[1].match(NAME);
  if (!match) return notFound();

  const [folder, file] = parts;
  const ext = match[1];
  const filePath = path.join(UPLOAD_ROOT, folder, file);

  let size: number;
  try {
    size = (await stat(filePath)).size;
  } catch {
    return notFound();
  }

  const { access, uploader } = await accessFor(`/files/${folder}/${file}`, folder);
  if (access !== "public") {
    const session = await getSession();
    const allowed =
      !!session &&
      (access === "member" || isAdminRole(session.user.role) || (uploader !== undefined && uploader === session.user.id));
    if (!allowed) return notFound();
  }

  const w = Number(new URL(request.url).searchParams.get("w"));
  if (folder === "images" && ext !== "gif" && (THUMB_WIDTHS as readonly number[]).includes(w)) {
    const thumbPath = path.join(THUMB_DIR, String(w), file.replace(/\.[a-z0-9]+$/, ".webp"));
    let thumbSize = await stat(thumbPath).then((s) => s.size).catch(() => 0);
    if (!thumbSize && (await makeThumb(filePath, thumbPath, w))) {
      thumbSize = await stat(thumbPath).then((s) => s.size).catch(() => 0);
    }
    if (thumbSize) {
      const body = Readable.toWeb(createReadStream(thumbPath)) as ReadableStream<Uint8Array>;
      return new Response(body, {
        headers: {
          "Content-Type": "image/webp",
          "Content-Length": String(thumbSize),
          "Cache-Control": access === "public" ? "public, max-age=31536000, immutable" : "private, max-age=86400",
          "X-Content-Type-Options": "nosniff",
          "Cross-Origin-Resource-Policy": "same-site",
          "Content-Security-Policy": "default-src 'none'; sandbox",
        },
      });
    }
  }

  const type = MIME_BY_EXT[ext] ?? "application/octet-stream";
  const inline = type.startsWith("image/") || type.startsWith("video/") || ext === "pdf";
  const baseHeaders: Record<string, string> = {
    "Content-Type": type,
    "Cache-Control": access === "public" ? "public, max-age=31536000, immutable" : "private, max-age=3600",
    "X-Content-Type-Options": "nosniff",
    "Cross-Origin-Resource-Policy": type.startsWith("image/") ? "same-site" : "same-origin",
    "Accept-Ranges": "bytes",
    "Content-Disposition": inline ? "inline" : `attachment; filename="materi.${ext}"`,
  };

  if (ext !== "pdf") baseHeaders["Content-Security-Policy"] = "default-src 'none'; style-src 'unsafe-inline'; sandbox";

  let start = 0;
  let end = size - 1;
  let status = 200;
  const range = request.headers.get("range");
  if (range) {
    const m = range.match(/^bytes=(\d*)-(\d*)$/);
    if (!m || (!m[1] && !m[2])) {
      return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
    }
    if (m[1]) {
      start = Number(m[1]);
      end = m[2] ? Math.min(Number(m[2]), size - 1) : size - 1;
    } else {
      start = Math.max(0, size - Number(m[2]));
    }
    if (start > end || start >= size) {
      return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
    }
    status = 206;
    baseHeaders["Content-Range"] = `bytes ${start}-${end}/${size}`;
  }

  const stream = Readable.toWeb(createReadStream(filePath, { start, end })) as ReadableStream<Uint8Array>;
  return new Response(stream, {
    status,
    headers: { ...baseHeaders, "Content-Length": String(end - start + 1) },
  });
}
