"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { audit } from "@/lib/audit";
import { notifyUser } from "@/lib/notify";
import type { ActionState } from "@/lib/ui";

type Status = "PENDING" | "APPROVED" | "REJECTED" | "HIDDEN";
const STATUSES: Status[] = ["PENDING", "APPROVED", "REJECTED", "HIDDEN"];

function refresh() {
  revalidatePath("/");
  revalidatePath("/dinding");
  revalidatePath("/admin", "layout");
}

export async function setNoteStatus(id: string, status: Status) {
  if (!STATUSES.includes(status)) return;
  const session = await requireAdmin();
  const note = await prisma.note.findUnique({ where: { id }, select: { status: true, authorId: true } });
  if (!note) return;

  await prisma.note.update({
    where: { id },
    data: { status, moderatedById: session.user.id, moderatedAt: new Date() },
  });
  if (status === "APPROVED" || status === "HIDDEN") {
    await prisma.noteReport.deleteMany({ where: { noteId: id } });
  }
  if (note.status === "PENDING" && status === "APPROVED" && note.authorId && note.authorId !== session.user.id) {
    await notifyUser(note.authorId, {
      type: "note",
      message: "Catatanmu sudah ditempel di dinding.",
      link: "/dinding",
    });
  }
  await audit(session.user.id, `note.${status.toLowerCase()}`, "Note", id);
  refresh();
}

export async function dismissReports(id: string) {
  const session = await requireAdmin();
  await prisma.noteReport.deleteMany({ where: { noteId: id } });
  await audit(session.user.id, "note.approved", "Note", id);
  refresh();
}

export async function togglePin(id: string) {
  const session = await requireAdmin();
  const note = await prisma.note.findUnique({ where: { id }, select: { isPinned: true } });
  if (!note) return;
  await prisma.note.update({ where: { id }, data: { isPinned: !note.isPinned } });
  await audit(session.user.id, "note.pin", "Note", id);
  refresh();
}

export async function deleteNote(id: string) {
  const session = await requireAdmin();
  await prisma.note.deleteMany({ where: { id } });
  await audit(session.user.id, "note.delete", "Note", id);
  refresh();
}

export async function bulkApprovePending() {
  const session = await requireAdmin();
  const res = await prisma.note.updateMany({
    where: { status: "PENDING" },
    data: { status: "APPROVED", moderatedById: session.user.id, moderatedAt: new Date() },
  });
  if (res.count) await audit(session.user.id, "note.approved", "Note", `${res.count} catatan`);
  refresh();
}

export async function blockSender(id: string) {
  const session = await requireAdmin();
  const note = await prisma.note.findUnique({ where: { id }, select: { deviceId: true, ipHash: true } });
  if (!note || (!note.deviceId && !note.ipHash)) return { error: "Data perangkat pengirim tidak tersedia." };

  const match = [
    ...(note.deviceId ? [{ deviceId: note.deviceId }] : []),
    ...(note.ipHash ? [{ ipHash: note.ipHash }] : []),
  ];
  const already = await prisma.blockedDevice.findFirst({ where: { OR: match } });
  if (!already) {
    await prisma.blockedDevice.create({
      data: { deviceId: note.deviceId, ipHash: note.ipHash, reason: "Diblokir dari moderasi dinding" },
    });
  }
  await prisma.note.updateMany({
    where: { OR: match, status: { in: ["PENDING", "APPROVED"] }, authorKind: "GUEST" },
    data: { status: "REJECTED", moderatedById: session.user.id, moderatedAt: new Date() },
  });
  await prisma.note.update({
    where: { id },
    data: { status: "REJECTED", moderatedById: session.user.id, moderatedAt: new Date() },
  });
  await audit(session.user.id, "note.block_sender", "Note", id);
  refresh();
}

export async function unblockDevice(id: string) {
  const session = await requireAdmin();
  await prisma.blockedDevice.deleteMany({ where: { id } });
  await audit(session.user.id, "device.unblock", "BlockedDevice", id);
  revalidatePath("/admin/dinding/filter");
}

export async function addBannedWords(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireAdmin();
  const words = String(formData.get("words") ?? "")
    .split(/[,\n]/)
    .map((w) => w.trim().toLowerCase())
    .filter((w) => w.length >= 2 && w.length <= 40);
  if (words.length === 0) return { error: "Tulis minimal satu kata (2–40 huruf)." };

  const unique = [...new Set(words)];
  const res = await prisma.bannedWord.createMany({ data: unique.map((word) => ({ word })), skipDuplicates: true });
  await audit(session.user.id, "word.create", "BannedWord", unique.join(", ").slice(0, 100));
  revalidatePath("/admin/dinding/filter");
  return { ok: true, message: `${res.count} kata ditambahkan.` };
}

export async function deleteBannedWord(id: string) {
  const session = await requireAdmin();
  await prisma.bannedWord.deleteMany({ where: { id } });
  await audit(session.user.id, "word.delete", "BannedWord", id);
  revalidatePath("/admin/dinding/filter");
}
