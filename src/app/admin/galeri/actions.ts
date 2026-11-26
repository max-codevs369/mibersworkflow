"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { audit } from "@/lib/audit";
import { notifyUser } from "@/lib/notify";
import { parseInputDate, slugify } from "@/lib/format";
import { deleteUpload, isFile, saveUpload } from "@/lib/upload";
import { MEDIA_LIMITS } from "@/lib/media-limits";
import type { ActionState } from "@/lib/ui";
import { ALBUM_CATEGORY_LABEL, FEATURED_MAX, type AlbumCategoryKey } from "@/lib/labels";

const schema = z.object({
  title: z.string().trim().min(2, "Judul album minimal 2 karakter.").max(100, "Judul terlalu panjang."),
  description: z.string().trim().max(1000, "Deskripsi terlalu panjang."),
  eventDate: z.string(),
  visibility: z.enum(["PUBLIC", "MEMBERS_ONLY"]),
  category: z.enum(Object.keys(ALBUM_CATEGORY_LABEL) as [AlbumCategoryKey, ...AlbumCategoryKey[]]),
});

async function uniqueSlug(title: string, exceptId?: string) {
  const base = slugify(title) || "album";
  let slug = base;
  for (let i = 2; i < 200; i++) {
    const hit = await prisma.album.findUnique({ where: { slug }, select: { id: true } });
    if (!hit || hit.id === exceptId) return slug;
    slug = `${base}-${i}`;
  }
  return `${base}-${Date.now()}`;
}

function refresh(slug?: string) {
  revalidatePath("/");
  revalidatePath("/kenangan");
  if (slug) revalidatePath(`/kenangan/${slug}`);
  revalidatePath("/admin", "layout");
}

function parse(fd: FormData) {
  const r = schema.safeParse({
    title: fd.get("title"),
    description: fd.get("description") ?? "",
    eventDate: fd.get("eventDate") ?? "",
    visibility: fd.get("visibility"),
    category: fd.get("category") ?? "KEGIATAN",
  });
  if (!r.success) return { error: r.error.issues[0].message } as const;
  const eventDate = r.data.eventDate ? parseInputDate(r.data.eventDate) : null;
  if (r.data.eventDate && !eventDate) return { error: "Tanggal kegiatan tidak valid." } as const;
  return {
    data: {
      title: r.data.title,
      description: r.data.description || null,
      eventDate,
      visibility: r.data.visibility,
      category: r.data.category,
    },
  } as const;
}

async function storeMedia(albumId: string, userId: string, files: File[], caption: string | null) {
  const urls: { url: string; kind: "image" | "video" }[] = [];
  const errors: string[] = [];
  for (const f of files) {
    const res = await saveUpload(f, { image: true, video: true }, MEDIA_LIMITS.videoMB);
    if ("error" in res) {
      errors.push(res.error);
      continue;
    }
    await prisma.media.create({
      data: {
        albumId,
        url: res.url,
        type: res.kind === "video" ? "VIDEO" : "PHOTO",
        caption,
        uploadedBy: userId,
        status: "APPROVED",
        reviewedBy: userId,
        reviewedAt: new Date(),
      },
    });
    urls.push({ url: res.url, kind: res.kind === "video" ? "video" : "image" });
  }
  return { urls, errors };
}

export async function createAlbum(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const session = await requireAdmin();
  const p = parse(fd);
  if ("error" in p) return { error: p.error };
  const files = fd.getAll("files").filter(isFile);
  if (files.length > 30) return { error: "Maksimal 30 file sekali unggah." };

  const album = await prisma.album.create({
    data: { ...p.data, slug: await uniqueSlug(p.data.title), createdBy: session.user.id },
  });
  if (files.length) {
    const { urls } = await storeMedia(album.id, session.user.id, files, null);
    const cover = urls.find((u) => u.kind === "image");
    if (cover) await prisma.album.update({ where: { id: album.id }, data: { coverUrl: cover.url } });
  }
  await audit(session.user.id, "album.create", "Album", album.id);
  refresh(album.slug);
  redirect(`/admin/galeri/${album.id}`);
}

export async function updateAlbum(id: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  const session = await requireAdmin();
  const album = await prisma.album.findUnique({ where: { id }, select: { slug: true, coverUrl: true } });
  if (!album) return { error: "Album sudah dihapus." };
  const p = parse(fd);
  if ("error" in p) return { error: p.error };

  let coverUrl = album.coverUrl;
  const cover = fd.get("cover");
  if (isFile(cover)) {
    const res = await saveUpload(cover, { image: true }, 8);
    if ("error" in res) return { error: res.error };
    if (album.coverUrl && !(await prisma.media.findFirst({ where: { url: album.coverUrl } }))) {
      await deleteUpload(album.coverUrl);
    }
    coverUrl = res.url;
    await prisma.media.create({
      data: {
        albumId: id,
        url: res.url,
        type: "PHOTO",
        uploadedBy: session.user.id,
        status: "APPROVED",
        reviewedBy: session.user.id,
        reviewedAt: new Date(),
      },
    });
  } else if (fd.get("cover_remove")) {
    if (album.coverUrl && !(await prisma.media.findFirst({ where: { url: album.coverUrl } }))) {
      await deleteUpload(album.coverUrl);
    }
    coverUrl = null;
  }

  const slug = await uniqueSlug(p.data.title, id);
  await prisma.album.update({ where: { id }, data: { ...p.data, slug, coverUrl } });
  await audit(session.user.id, "album.update", "Album", id);
  refresh(album.slug);
  refresh(slug);
  return { ok: true, message: "Album disimpan." };
}

export async function deleteAlbum(id: string) {
  const session = await requireAdmin();
  const album = await prisma.album.findUnique({
    where: { id },
    select: { coverUrl: true, media: { select: { url: true } } },
  });
  if (!album) redirect("/admin/galeri");
  await prisma.album.delete({ where: { id } });
  await Promise.all([...album.media.map((m) => deleteUpload(m.url)), deleteUpload(album.coverUrl)]);
  await audit(session.user.id, "album.delete", "Album", id);
  refresh();
  redirect("/admin/galeri");
}

export async function uploadMedia(albumId: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  const session = await requireAdmin();
  const album = await prisma.album.findUnique({ where: { id: albumId }, select: { slug: true } });
  if (!album) return { error: "Album tidak ditemukan." };

  const files = fd.getAll("files").filter(isFile);
  if (files.length === 0) return { error: "Pilih minimal satu foto." };
  if (files.length > 30) return { error: "Maksimal 30 file sekali unggah." };
  const caption = String(fd.get("caption") ?? "").trim().slice(0, 200) || null;

  const { urls, errors } = await storeMedia(albumId, session.user.id, files, caption);
  const saved = urls.length;
  if (!saved) return { error: errors[0] ?? "Tidak ada file tersimpan." };
  await audit(session.user.id, "media.upload", "Album", albumId);
  refresh(album.slug);
  return { ok: true, message: `${saved} file diunggah${errors.length ? `, ${errors.length} dilewati` : ""}.` };
}

export async function updateCaption(id: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  const caption = String(fd.get("caption") ?? "").trim().slice(0, 200) || null;
  const m = await prisma.media.findUnique({ where: { id }, select: { album: { select: { slug: true } } } });
  if (!m) return { error: "Foto sudah dihapus." };
  await prisma.media.update({ where: { id }, data: { caption } });
  refresh(m.album.slug);
  return { ok: true };
}

export async function setCover(albumId: string, url: string) {
  await requireAdmin();
  const media = await prisma.media.findFirst({
    where: { albumId, url, type: "PHOTO", status: "APPROVED" },
    select: { id: true },
  });
  if (!media) return;
  const a = await prisma.album.update({ where: { id: albumId }, data: { coverUrl: url }, select: { slug: true } });
  refresh(a.slug);
}

export async function reviewMedia(id: string, status: "APPROVED" | "REJECTED") {
  const session = await requireAdmin();
  const m = await prisma.media.findUnique({
    where: { id },
    select: { url: true, albumId: true, uploadedBy: true, album: { select: { slug: true, title: true, coverUrl: true } } },
  });
  if (!m) return;

  if (status === "REJECTED") {
    await prisma.media.delete({ where: { id } });
    if (m.album.coverUrl === m.url) {
      await prisma.album.update({ where: { id: m.albumId }, data: { coverUrl: null } });
    }
    await deleteUpload(m.url);
  } else {
    await prisma.media.update({
      where: { id },
      data: { status, reviewedBy: session.user.id, reviewedAt: new Date() },
    });
  }
  if (m.uploadedBy !== session.user.id) {
    await notifyUser(m.uploadedBy, {
      type: "media",
      message:
        status === "APPROVED"
          ? `Fotomu di album “${m.album.title}” sudah tampil.`
          : `Fotomu di album “${m.album.title}” tidak disetujui pengurus.`,
      link: status === "APPROVED" ? `/kenangan/${m.album.slug}` : null,
    });
  }
  await audit(session.user.id, `media.${status.toLowerCase()}`, "Media", id);
  refresh(m.album.slug);
}

export async function approveAllMedia() {
  const session = await requireAdmin();
  const pending = await prisma.media.findMany({ where: { status: "PENDING" }, select: { id: true } });
  for (const p of pending) await reviewMedia(p.id, "APPROVED");
  if (pending.length) await audit(session.user.id, "media.approved", "Media", `${pending.length} file`);
}

export async function deleteMedia(id: string) {
  const session = await requireAdmin();
  const m = await prisma.media.findUnique({
    where: { id },
    select: { url: true, albumId: true, album: { select: { slug: true, coverUrl: true } } },
  });
  if (!m) return;
  await prisma.media.delete({ where: { id } });
  if (m.album.coverUrl === m.url) await prisma.album.update({ where: { id: m.albumId }, data: { coverUrl: null } });
  await deleteUpload(m.url);
  await audit(session.user.id, "media.delete", "Media", id);
  refresh(m.album.slug);
}



export async function toggleFeatured(id: string) {
  const session = await requireAdmin();
  const m = await prisma.media.findUnique({
    where: { id },
    select: { type: true, status: true, featuredAt: true, album: { select: { slug: true, visibility: true } } },
  });
  if (!m) return { error: "Foto sudah dihapus." };

  if (m.featuredAt) {
    await prisma.media.update({ where: { id }, data: { featuredAt: null } });
  } else {
    if (m.type !== "PHOTO" || m.status !== "APPROVED") return { error: "Hanya foto yang sudah disetujui yang bisa dipilih." };
    if (m.album.visibility !== "PUBLIC") {
      return { error: "Foto dari album khusus anggota tidak bisa tampil di beranda karena beranda bisa dilihat semua orang." };
    }
    const count = await prisma.media.count({ where: { featuredAt: { not: null } } });
    if (count >= FEATURED_MAX) {
      return { error: `Maksimal ${FEATURED_MAX} foto pilihan. Lepas salah satu foto pilihan dulu.` };
    }
    await prisma.media.update({ where: { id }, data: { featuredAt: new Date() } });
  }
  await audit(session.user.id, m.featuredAt ? "media.unfeature" : "media.feature", "Media", id);
  refresh(m.album.slug);
  revalidatePath("/admin/galeri");
}
