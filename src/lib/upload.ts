import { mkdir, writeFile, unlink } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { MB, MEDIA_LIMITS } from "@/lib/media-limits";

export const UPLOAD_ROOT = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : path.join(process.cwd(), "storage", "uploads");

export const FOLDERS = ["images", "videos", "docs"] as const;
export type Folder = (typeof FOLDERS)[number];

export const MIME_BY_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  mp4: "video/mp4",
  webm: "video/webm",
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  txt: "text/plain; charset=utf-8",
  zip: "application/zip",
};

const DOC_EXT = ["pdf", "doc", "docx", "ppt", "pptx", "xls", "xlsx", "txt", "zip"];

function sniff(buf: Buffer): string | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpg";
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
  if (buf.subarray(0, 3).toString("ascii") === "GIF") return "gif";
  if (buf.subarray(0, 4).toString("ascii") === "RIFF" && buf.subarray(8, 12).toString("ascii") === "WEBP") return "webp";
  if (buf.subarray(4, 8).toString("ascii") === "ftyp") return "mp4";
  if (buf[0] === 0x1a && buf[1] === 0x45 && buf[2] === 0xdf && buf[3] === 0xa3) return "webm";
  return null;
}

export function isFile(v: FormDataEntryValue | null): v is File {
  return typeof v === "object" && v !== null && "arrayBuffer" in v && v.size > 0;
}

type Result = { url: string; kind: "image" | "video" | "doc" } | { error: string };

export async function saveUpload(
  file: File,
  accept: { image?: boolean; video?: boolean; doc?: boolean },
  maxMB = 10
): Promise<Result> {
  if (file.size > maxMB * MB) return { error: `Ukuran file maksimal ${maxMB} MB.` };

  const buf = Buffer.from(await file.arrayBuffer());
  const sniffed = sniff(buf);
  let ext: string | null = null;
  let folder: Folder = "images";
  let kind: "image" | "video" | "doc" = "image";

  if (sniffed && ["jpg", "png", "gif", "webp"].includes(sniffed) && accept.image) {
    ext = sniffed;
  } else if (sniffed && ["mp4", "webm"].includes(sniffed) && accept.video) {
    ext = sniffed;
    folder = "videos";
    kind = "video";
  } else if (accept.doc) {
    const nameExt = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (DOC_EXT.includes(nameExt)) {
      if (nameExt === "pdf" && buf.subarray(0, 4).toString("ascii") !== "%PDF") {
        return { error: "File PDF tidak valid." };
      }
      ext = nameExt;
      folder = "docs";
      kind = "doc";
    } else if (sniffed && ["jpg", "png", "gif", "webp"].includes(sniffed)) {
      ext = sniffed;
    }
  }

  if (ext && kind === "image" && file.size > MEDIA_LIMITS.imageMB * MB) {
    return { error: `Foto maksimal ${MEDIA_LIMITS.imageMB} MB. Pilih ulang fotonya agar otomatis dikompres.` };
  }
  if (ext && kind === "video" && file.size > MEDIA_LIMITS.videoMB * MB) {
    return { error: `Video maksimal ${MEDIA_LIMITS.videoMB} MB. Pilih ulang videonya agar otomatis dikompres.` };
  }

  if (!ext) {
    const allowed = [
      accept.image && "JPG/PNG/WEBP/GIF",
      accept.video && "MP4/WEBM",
      accept.doc && "PDF/Word/PowerPoint/Excel/TXT/ZIP",
    ]
      .filter(Boolean)
      .join(", ");
    return { error: `Jenis file tidak didukung. Gunakan ${allowed}.` };
  }

  let data: Buffer = buf;
  if (folder === "images" && ext !== "gif") {
    const slim = await optimizeImage(buf);
    if (slim) {
      data = slim;
      ext = "webp";
    }
  }

  const name = `${randomUUID()}.${ext}`;
  const dir = path.join(UPLOAD_ROOT, folder);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, name), data);
  return { url: `/files/${folder}/${name}`, kind };
}

const MAX_SIDE = 1920;

async function optimizeImage(buf: Buffer): Promise<Buffer | null> {
  try {
    const { default: sharp } = await import("sharp");
    const out = await sharp(buf, { limitInputPixels: 80_000_000 })
      .rotate()
      .resize({ width: MAX_SIDE, height: MAX_SIDE, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82, effort: 4 })
      .toBuffer();
    if (out.length < buf.length) return out;

    return await sharp(buf).rotate().webp({ lossless: true }).toBuffer();
  } catch (e) {
    console.error("[upload] optimasi gambar dilewati:", e instanceof Error ? e.message : e);
    return null;
  }
}

export async function deleteUpload(url?: string | null) {
  if (!url) return;
  const m = url.match(/^\/files\/(images|videos|docs)\/([a-f0-9-]{36}\.[a-z0-9]{2,5})$/);
  if (!m) return;
  try {
    await unlink(path.join(UPLOAD_ROOT, m[1], m[2]));
  } catch {
  }
}
