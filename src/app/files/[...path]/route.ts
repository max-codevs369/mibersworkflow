import { createReadStream } from "fs";
import { stat } from "fs/promises";
import path from "path";
import { Readable } from "stream";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { isAdminRole } from "@/lib/roles";
import { UPLOAD_ROOT, FOLDERS, MIME_BY_EXT } from "@/lib/upload";

const NAME = /^[a-f0-9-]{36}\.([a-z0-9]{2,5})$/;

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

  const type = MIME_BY_EXT[ext] ?? "application/octet-stream";
  const inline = type.startsWith("image/") || type.startsWith("video/") || ext === "pdf";
  const baseHeaders: Record<string, string> = {
    "Content-Type": type,
    "Cache-Control": access === "public" ? "public, max-age=31536000, immutable" : "private, max-age=3600",
    "X-Content-Type-Options": "nosniff",
    "Cross-Origin-Resource-Policy": "same-origin",
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
