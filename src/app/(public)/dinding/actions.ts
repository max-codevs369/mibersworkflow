"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { ensureDeviceId, getIpHash } from "@/lib/device";
import { REACTIONS } from "@/lib/notes";
import { getSettings, flag, num } from "@/lib/settings";
import { isAdminRole } from "@/lib/roles";
import { notifyAll } from "@/lib/notify";

export type NoteFormState = { error?: string; ok?: string };

const schema = z.object({
  content: z
    .string()
    .trim()
    .min(3, "Catatan minimal 3 karakter.")
    .max(280, "Catatan maksimal 280 karakter."),
  type: z.enum(["DAILY", "MOTIVATION", "MESSAGE", "REMINDER"], { message: "Pilih jenis catatan." }),
  color: z.enum(["YELLOW", "PINK", "BLUE", "GREEN", "ORANGE"], { message: "Pilih warna kertas." }),
  anonymous: z.boolean(),
});

const URL_PATTERN = /(https?:\/\/|www\.|[a-z0-9-]+\.(com|net|org|id|co|io|me|xyz|link)\b)/i;

export async function submitNote(_prev: NoteFormState, formData: FormData): Promise<NoteFormState> {
  if (formData.get("website")) return { ok: "Catatan terkirim." };

  const parsed = schema.safeParse({
    content: formData.get("content"),
    type: formData.get("type"),
    color: formData.get("color"),
    anonymous: formData.get("anonymous") === "on",
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const input = parsed.data;

  const [session, settings] = await Promise.all([getSession(), getSettings()]);
  const isAdmin = isAdminRole(session?.user.role);
  const kind = isAdmin ? "ADMIN" : session ? "MEMBER" : "GUEST";

  if (kind === "GUEST" && !flag(settings.note_guest_enabled)) {
    return { error: "Saat ini hanya anggota yang bisa menempel catatan. Silakan masuk dulu." };
  }

  const type = input.type;

  const deviceId = await ensureDeviceId();
  const ipHash = await getIpHash();

  if (!isAdmin) {
    const blocked = await prisma.blockedDevice.findFirst({ where: { OR: [{ deviceId }, { ipHash }] } });
    if (blocked) return { error: "Pengiriman dari perangkat ini sedang diblokir." };

    const limit =
      kind === "MEMBER"
        ? num(settings.note_member_daily_limit, 10)
        : num(settings.note_guest_daily_limit, 3);
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [byDevice, byIp] = await Promise.all([
      prisma.note.count({
        where: {
          createdAt: { gte: since },
          OR: [{ deviceId }, ...(session ? [{ authorId: session.user.id }] : [])],
        },
      }),
      prisma.note.count({ where: { createdAt: { gte: since }, ipHash } }),
    ]);
    if (byDevice >= limit || byIp >= limit * 5) {
      return { error: `Batas ${limit} catatan per hari sudah tercapai. Coba lagi besok, ya.` };
    }
  }

  const words = await prisma.bannedWord.findMany({ select: { word: true } });
  const lower = input.content.toLowerCase();
  if (words.some((w) => w.word && lower.includes(w.word.toLowerCase()))) {
    return { error: "Catatan mengandung kata yang tidak diperbolehkan." };
  }

  if (kind === "GUEST" && URL_PATTERN.test(input.content)) {
    return { error: "Tamu tidak bisa mengirim tautan. Masuk dulu untuk itu." };
  }

  const status =
    kind === "ADMIN" || (kind === "MEMBER" && flag(settings.note_member_auto_approve)) ? "APPROVED" : "PENDING";
  const anonymous = kind === "GUEST" || (kind === "MEMBER" && input.anonymous);
  const pins = ["PUSHPIN", "TAPE", "CLIP"] as const;

  await prisma.note.create({
    data: {
      content: input.content,
      type,
      color: input.color,
      pinStyle: pins[Math.floor(Math.random() * pins.length)],
      rotation: Math.round((Math.random() * 6 - 3) * 10) / 10,
      authorId: session?.user.id ?? null,
      authorName: anonymous ? "Anonim" : session?.user.displayName ?? "Anonim",
      authorKind: kind,
      isAnonymous: anonymous,
      status,
      ipHash,
      deviceId,
    },
  });

  if (status === "PENDING") {
    await notifyAll({
      adminsOnly: true,
      type: "moderation",
      message: "Ada catatan baru di dinding yang menunggu persetujuan.",
      link: "/admin/dinding",
    });
  }

  revalidatePath("/dinding");
  revalidatePath("/");
  revalidatePath("/admin", "layout");

  return {
    ok:
      status === "APPROVED"
        ? "Catatanmu sudah tertempel di dinding!"
        : "Catatanmu terkirim dan akan tampil setelah dicek pengurus.",
  };
}

export async function toggleReaction(noteId: string, emoji: string) {
  if (typeof noteId !== "string" || typeof emoji !== "string" || noteId.length > 64 || !REACTIONS.includes(emoji)) return;

  const note = await prisma.note.findFirst({ where: { id: noteId, status: "APPROVED" }, select: { id: true } });
  if (!note) return;

  const session = await getSession();
  const deviceId = await ensureDeviceId();
  const key = { noteId_deviceId_emoji: { noteId, deviceId, emoji } };

  const existing = await prisma.noteReaction.findUnique({ where: key });
  try {
    if (existing) {
      await prisma.noteReaction.delete({ where: key });
    } else {
      await prisma.noteReaction.create({
        data: { noteId, deviceId, emoji, userId: session?.user.id ?? null },
      });
    }
  } catch {
  }

  revalidatePath("/dinding");
}

export async function reportNote(noteId: string, reason: string) {
  if (typeof noteId !== "string" || noteId.length > 64) return { error: "Catatan tidak ditemukan." };
  const text = typeof reason === "string" ? reason.trim().slice(0, 200) : "";
  const deviceId = await ensureDeviceId();
  const ipHash = await getIpHash();

  const note = await prisma.note.findFirst({ where: { id: noteId, status: "APPROVED" }, select: { id: true } });
  if (!note) return { error: "Catatan tidak ditemukan." };

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [already, byIp, byIpOnNote] = await Promise.all([
    prisma.noteReport.findFirst({ where: { noteId, deviceId } }),
    prisma.noteReport.count({ where: { ipHash, createdAt: { gte: since } } }),
    prisma.noteReport.count({ where: { ipHash, noteId } }),
  ]);
  if (!already && byIp < 30 && byIpOnNote < 3) {
    await prisma.noteReport.create({
      data: { noteId, deviceId, ipHash, reason: text || null },
    });
    if ((await prisma.noteReport.count({ where: { noteId } })) === 1) {
      await notifyAll({
        adminsOnly: true,
        type: "moderation",
        message: `Ada catatan di dinding yang dilaporkan${text ? `: “${text.slice(0, 80)}”` : "."}`,
        link: "/admin/dinding",
      });
    }
  }

  revalidatePath("/admin/dinding");
  return { ok: true };
}
