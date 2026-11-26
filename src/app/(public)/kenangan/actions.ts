"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { getSettings, flag } from "@/lib/settings";
import { isAdminRole } from "@/lib/roles";
import { isFile, saveUpload } from "@/lib/upload";
import { MEDIA_LIMITS } from "@/lib/media-limits";
import { notifyAll } from "@/lib/notify";
import { audit } from "@/lib/audit";
import type { ActionState } from "@/lib/ui";

const MAX_FILES = 20;

export async function contributeMedia(albumId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await getSession();
  if (!session) return { error: "Masuk dulu untuk mengunggah foto." };

  const album = await prisma.album.findUnique({ where: { id: albumId }, select: { id: true, slug: true, title: true } });
  if (!album) return { error: "Album tidak ditemukan." };

  const files = formData.getAll("files").filter(isFile);
  if (files.length === 0) return { error: "Pilih minimal satu foto." };
  if (files.length > MAX_FILES) return { error: `Maksimal ${MAX_FILES} file sekali unggah.` };

  const caption = String(formData.get("caption") ?? "").trim().slice(0, 200) || null;
  const settings = await getSettings();
  const admin = isAdminRole(session.user.role);

  if (!admin) {
    const today = await prisma.media.count({
      where: { uploadedBy: session.user.id, createdAt: { gte: new Date(Date.now() - 86_400_000) } },
    });
    if (today + files.length > 100) return { error: "Batas 100 file per hari tercapai. Coba lagi besok." };
  }
  const approved = admin || flag(settings.gallery_member_auto_approve);

  let saved = 0;
  const errors: string[] = [];
  for (const f of files) {
    const res = await saveUpload(f, { image: true, video: true }, MEDIA_LIMITS.videoMB);
    if ("error" in res) {
      errors.push(`${f.name}: ${res.error}`);
      continue;
    }
    await prisma.media.create({
      data: {
        albumId,
        url: res.url,
        type: res.kind === "video" ? "VIDEO" : "PHOTO",
        caption,
        uploadedBy: session.user.id,
        status: approved ? "APPROVED" : "PENDING",
        reviewedBy: approved ? session.user.id : null,
        reviewedAt: approved ? new Date() : null,
      },
    });
    saved++;
  }

  if (saved === 0) return { error: errors[0] ?? "Tidak ada file yang tersimpan." };

  await audit(session.user.id, "media.upload", "Album", albumId);
  if (!approved) {
    await notifyAll({
      adminsOnly: true,
      exceptUserId: session.user.id,
      type: "moderation",
      message: `${session.user.displayName} mengunggah ${saved} foto ke album “${album.title}”.`,
      link: "/admin/galeri/moderasi",
    });
  }

  revalidatePath(`/kenangan/${album.slug}`);
  revalidatePath("/kenangan");
  revalidatePath("/");
  revalidatePath("/admin", "layout");

  const note = errors.length ? ` ${errors.length} file dilewati.` : "";
  return {
    ok: true,
    message: approved
      ? `${saved} file berhasil ditambahkan.${note}`
      : `${saved} file terkirim dan menunggu persetujuan pengurus.${note}`,
  };
}
