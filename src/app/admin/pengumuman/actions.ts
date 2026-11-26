"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { parseInputDateTime } from "@/lib/format";
import { audit } from "@/lib/audit";
import { notifyAll } from "@/lib/notify";
import { deleteUpload, isFile, saveUpload } from "@/lib/upload";
import type { ActionState } from "@/lib/ui";

const optionalUrl = z
  .string()
  .trim()
  .max(500, "Tautan terlalu panjang.")
  .refine((v) => v === "" || /^https?:\/\//i.test(v), "Tautan harus diawali http:// atau https://");

const schema = z.object({
  title: z.string().trim().min(3, "Judul minimal 3 karakter.").max(120, "Judul maksimal 120 karakter."),
  content: z.string().trim().min(3, "Isi minimal 3 karakter.").max(5000, "Isi maksimal 5000 karakter."),
  category: z.enum(["GENERAL", "ACADEMIC", "ACTIVITY", "FINANCE", "DUTY", "OTHER"]),
  priority: z.enum(["NORMAL", "IMPORTANT", "URGENT"]),
  status: z.enum(["DRAFT", "PUBLISHED"]),
  isPinned: z.boolean(),
  publishedAt: z.string(),
  expiresAt: z.string(),
  actionLabel: z.string().trim().max(40, "Label tombol maksimal 40 karakter."),
  actionUrl: optionalUrl,
});

function parse(formData: FormData) {
  const raw = schema.safeParse({
    title: formData.get("title"),
    content: formData.get("content"),
    category: formData.get("category"),
    priority: formData.get("priority"),
    status: formData.get("status"),
    isPinned: formData.get("isPinned") === "on",
    publishedAt: formData.get("publishedAt") ?? "",
    expiresAt: formData.get("expiresAt") ?? "",
    actionLabel: formData.get("actionLabel") ?? "",
    actionUrl: formData.get("actionUrl") ?? "",
  });
  if (!raw.success) return { error: raw.error.issues[0].message } as const;

  const d = raw.data;
  if (d.actionUrl && !d.actionLabel) return { error: "Isi label untuk tombol aksi." } as const;
  if (d.actionLabel && !d.actionUrl) return { error: "Isi tautan untuk tombol aksi." } as const;

  const parsedPublished = parseInputDateTime(d.publishedAt);
  if (d.publishedAt && !parsedPublished) return { error: "Tanggal tayang tidak valid." } as const;
  const publishedAt = parsedPublished ?? new Date();
  const expiresAt = parseInputDateTime(d.expiresAt);
  if (d.expiresAt && !expiresAt) return { error: "Tanggal berakhir tidak valid." } as const;
  if (expiresAt && expiresAt <= publishedAt) {
    return { error: "Tanggal berakhir harus setelah tanggal tayang." } as const;
  }

  return {
    data: {
      title: d.title,
      content: d.content,
      category: d.category,
      priority: d.priority,
      status: d.status,
      isPinned: d.isPinned,
      publishedAt,
      expiresAt,
      actionLabel: d.actionLabel || null,
      actionUrl: d.actionUrl || null,
    },
  } as const;
}

async function handleCover(formData: FormData, current: string | null) {
  const file = formData.get("cover");
  if (isFile(file)) {
    const res = await saveUpload(file, { image: true }, 8);
    if ("error" in res) return { error: res.error };
    await deleteUpload(current);
    return { url: res.url };
  }
  if (formData.get("cover_remove")) {
    await deleteUpload(current);
    return { url: null };
  }
  return { url: current };
}

function refresh() {
  revalidatePath("/");
  revalidatePath("/pengumuman", "layout");
  revalidatePath("/admin", "layout");
}

export async function createAnnouncement(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireAdmin();
  const result = parse(formData);
  if ("error" in result) return { error: result.error };

  const cover = await handleCover(formData, null);
  if ("error" in cover) return { error: cover.error };

  const created = await prisma.announcement.create({
    data: { ...result.data, coverUrl: cover.url ?? null, authorId: session.user.id },
  });
  await audit(session.user.id, "announcement.create", "Announcement", created.id);
  const sent = await notifyIfLive(created.id, session.user.id);

  refresh();
  return {
    ok: true,
    message:
      created.status === "DRAFT"
        ? "Pengumuman disimpan sebagai draf."
        : sent
          ? "Pengumuman dibuat. Semua anggota sudah diberi tahu."
          : "Pengumuman dijadwalkan. Anggota diberi tahu otomatis saat tayang.",
  };
}

async function notifyIfLive(id: string, actorId: string) {
  const now = new Date();
  const a = await prisma.announcement.findUnique({ where: { id }, select: { title: true, priority: true, status: true, publishedAt: true, expiresAt: true } });
  if (!a || a.status !== "PUBLISHED" || a.publishedAt > now || (a.expiresAt && a.expiresAt <= now)) return false;
  const claimed = await prisma.announcement.updateMany({ where: { id, notifiedAt: null }, data: { notifiedAt: now } });
  if (!claimed.count) return false;
  await notifyAll({
    exceptUserId: actorId,
    type: "announcement",
    message: `${a.priority === "URGENT" ? "[Mendesak] " : ""}Pengumuman baru: ${a.title}`,
    link: `/pengumuman/${id}`,
  });
  return true;
}

export async function updateAnnouncement(id: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireAdmin();
  const existing = await prisma.announcement.findUnique({ where: { id }, select: { coverUrl: true, status: true } });
  if (!existing) return { error: "Pengumuman sudah dihapus." };

  const result = parse(formData);
  if ("error" in result) return { error: result.error };

  const cover = await handleCover(formData, existing.coverUrl);
  if ("error" in cover) return { error: cover.error };

  const updated = await prisma.announcement.update({
    where: { id },
    data: { ...result.data, coverUrl: cover.url ?? null },
  });
  await audit(session.user.id, "announcement.update", "Announcement", id);
  await notifyIfLive(updated.id, session.user.id);

  refresh();
  return { ok: true, message: "Pengumuman disimpan." };
}

export async function deleteAnnouncement(id: string) {
  const session = await requireAdmin();
  const a = await prisma.announcement.findUnique({ where: { id }, select: { coverUrl: true } });
  if (!a) return;
  await prisma.announcement.delete({ where: { id } });
  await deleteUpload(a.coverUrl);
  await audit(session.user.id, "announcement.delete", "Announcement", id);
  refresh();
}

export async function togglePinAnnouncement(id: string) {
  const session = await requireAdmin();
  const a = await prisma.announcement.findUnique({ where: { id }, select: { isPinned: true } });
  if (!a) return;
  await prisma.announcement.update({ where: { id }, data: { isPinned: !a.isPinned } });
  await audit(session.user.id, "announcement.update", "Announcement", id);
  refresh();
}
