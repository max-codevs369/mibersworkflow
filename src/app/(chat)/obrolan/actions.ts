"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { isAdminRole } from "@/lib/roles";
import { directKeyOf, systemMessage } from "@/lib/conversations";
import { deleteUpload, isFile, saveUpload } from "@/lib/upload";
import { notifyUser, notifyUsers } from "@/lib/notify";
import { inBackground, pushToUsers } from "@/lib/push";
import { isViewingRoom } from "@/lib/presence";

async function wordFilter(text: string) {
  const words = await prisma.bannedWord.findMany({ select: { word: true } });
  const lower = text.toLowerCase();
  return words.some((w) => w.word && lower.includes(w.word.toLowerCase()));
}

async function membership(conversationId: string, userId: string) {
  return prisma.conversationMember.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
    select: { id: true, conversation: { select: { type: true } } },
  });
}

export async function openDirect(otherId: string) {
  const session = await requireUser("/obrolan");
  const me = session.user.id;
  if (otherId === me) redirect("/obrolan");

  const other = await prisma.user.findFirst({ where: { id: otherId, isActive: true }, select: { id: true } });
  if (!other) redirect("/obrolan");

  const key = directKeyOf(me, otherId);
  let conv = await prisma.conversation.findUnique({ where: { directKey: key }, select: { id: true } });
  if (!conv) {
    try {
      conv = await prisma.conversation.create({
        data: {
          type: "DIRECT",
          directKey: key,
          createdBy: me,
          members: { create: [{ userId: me }, { userId: otherId }] },
        },
        select: { id: true },
      });
    } catch {
      conv = await prisma.conversation.findUnique({ where: { directKey: key }, select: { id: true } });
    }
  }
  if (!conv) redirect("/obrolan");
  revalidatePath("/obrolan", "layout");
  redirect(`/obrolan/${conv.id}`);
}

export async function sendMessage(
  conversationId: string,
  raw: string,
  replyToId?: string | null
): Promise<{ ok?: true; error?: string }> {
  const session = await requireUser("/obrolan");
  const me = session.user.id;
  const content = String(raw ?? "").trim();
  if (!content) return { error: "Pesan masih kosong." };
  if (content.length > 2000) return { error: "Pesan maksimal 2000 karakter." };

  if (!(await membership(conversationId, me))) return { error: "Kamu bukan anggota obrolan ini." };
  if (await wordFilter(content)) return { error: "Pesan mengandung kata yang tidak diperbolehkan." };

  let replyTo: string | null = null;
  if (replyToId) {
    if (typeof replyToId !== "string" || replyToId.length > 64) return { error: "Pesan yang dibalas tidak ditemukan." };
    const target = await prisma.message.findFirst({
      where: { id: replyToId, conversationId, kind: "TEXT", deletedAt: null },
      select: { id: true },
    });
    if (!target) return { error: "Pesan yang dibalas sudah dihapus." };
    replyTo = target.id;
  }

  const recent = await prisma.message.count({
    where: { senderId: me, createdAt: { gte: new Date(Date.now() - 60_000) } },
  });
  if (recent >= 30) return { error: "Terlalu cepat. Tunggu sebentar sebelum mengirim lagi." };

  const now = new Date();
  await prisma.$transaction([
    prisma.message.create({ data: { conversationId, senderId: me, content, createdAt: now, replyToId: replyTo } }),
    prisma.conversation.update({ where: { id: conversationId }, data: { lastMessageAt: now } }),
    prisma.conversationMember.update({
      where: { conversationId_userId: { conversationId, userId: me } },
      data: { lastReadAt: now },
    }),
  ]);
  pushChat(conversationId, me, session.user.name, content);
  revalidatePath("/obrolan", "layout");
  return { ok: true };
}

function pushChat(conversationId: string, senderId: string, senderName: string, content: string) {
  inBackground(async () => {
    const conv = await prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { type: true, title: true, members: { where: { userId: { not: senderId } }, select: { userId: true } } },
    });
    if (!conv) return;
    const targets = conv.members.map((m) => m.userId).filter((id) => !isViewingRoom(id, conversationId));
    const text = content.length > 140 ? `${content.slice(0, 140)}…` : content;
    await pushToUsers(targets, {
      title: conv.type === "GROUP" ? `💬 ${conv.title ?? "Grup"}` : `💬 ${senderName}`,
      body: conv.type === "GROUP" ? `${firstName(senderName)}: ${text}` : text,
      url: `/obrolan/${conversationId}`,
      tag: `chat-${conversationId}`,
    });
  });
}

export async function markRead(conversationId: string) {
  const session = await requireUser("/obrolan");
  await prisma.conversationMember.updateMany({
    where: { conversationId, userId: session.user.id },
    data: { lastReadAt: new Date() },
  });
}

export async function deleteMessage(id: string) {
  const session = await requireUser("/obrolan");
  const msg = await prisma.message.findUnique({
    where: { id },
    select: { senderId: true, kind: true, deletedAt: true, conversationId: true, conversation: { select: { type: true } } },
  });
  if (!msg || msg.kind !== "TEXT" || msg.deletedAt) return;
  const mine = msg.senderId === session.user.id;
  const moderator = msg.conversation.type === "GROUP" && isAdminRole(session.user.role);
  if (!mine && !moderator) return { error: "Kamu tidak bisa menghapus pesan ini." };
  if (!(await membership(msg.conversationId, session.user.id))) return { error: "Kamu bukan anggota obrolan ini." };

  await prisma.message.update({ where: { id }, data: { deletedAt: new Date(), content: "" } });
  revalidatePath("/obrolan", "layout");
}

export async function leaveGroup(conversationId: string) {
  const session = await requireUser("/obrolan");
  const me = session.user.id;
  const m = await membership(conversationId, me);
  if (!m || m.conversation.type !== "GROUP") return { error: "Grup tidak ditemukan." };
  await systemMessage(conversationId, me, `${session.user.name} keluar dari grup`);
  await prisma.conversationMember.delete({ where: { id: m.id } });

  const conv = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: { createdBy: true, imageUrl: true, _count: { select: { members: true } } },
  });
  if (conv && conv._count.members === 0) {
    await prisma.conversation.delete({ where: { id: conversationId } });
    await deleteUpload(conv.imageUrl);
    revalidatePath("/obrolan", "layout");
    revalidatePath("/admin/obrolan");
    redirect("/obrolan");
  }
  if (conv?.createdBy === me) {
    const heir = await prisma.conversationMember.findFirst({
      where: { conversationId },
      orderBy: { joinedAt: "asc" },
      select: { userId: true, user: { select: { name: true } } },
    });
    await prisma.conversation.update({ where: { id: conversationId }, data: { createdBy: heir?.userId ?? null } });
    if (heir) await systemMessage(conversationId, heir.userId, `${heir.user.name} sekarang menjadi pengelola grup`);
  }

  revalidatePath("/obrolan", "layout");
  revalidatePath("/admin/obrolan");
  redirect("/obrolan");
}

const firstName = (n: string) => n.split(" ")[0];
const listNames = (names: string[]) =>
  names.length <= 1 ? names.join("") : `${names.slice(0, -1).join(", ")} dan ${names[names.length - 1]}`;

async function manageable(conversationId: string) {
  const session = await requireUser("/obrolan");
  const conv = await prisma.conversation.findFirst({
    where: { id: conversationId, type: "GROUP" },
    select: { id: true, title: true, createdBy: true, members: { select: { userId: true } } },
  });
  if (!conv) return { error: "Grup tidak ditemukan." } as const;
  const isMember = conv.members.some((m) => m.userId === session.user.id);
  const allowed = isAdminRole(session.user.role) || (isMember && conv.createdBy === session.user.id);
  if (!allowed) return { error: "Hanya pembuat grup atau pengurus yang bisa mengatur grup ini." } as const;
  return { session, conv } as const;
}

export async function createGroupChat(fd: FormData): Promise<{ error?: string } | void> {
  const session = await requireUser("/obrolan");
  const me = session.user.id;
  const name = String(fd.get("title") ?? "").trim();
  const memberIds = fd.getAll("members").map(String);
  const photo = fd.get("photo");
  if (name.length < 2 || name.length > 60) return { error: "Nama grup harus 2 sampai 60 karakter." };
  if (await wordFilter(name)) return { error: "Nama grup mengandung kata yang tidak diperbolehkan." };

  const ids = [...new Set((Array.isArray(memberIds) ? memberIds : []).map(String))].filter((id) => id !== me).slice(0, 300);
  if (!ids.length) return { error: "Pilih minimal satu anggota." };
  const users = await prisma.user.findMany({ where: { id: { in: ids }, isActive: true }, select: { id: true, name: true } });
  if (!users.length) return { error: "Anggota yang dipilih tidak ditemukan." };

  const recent = await prisma.conversation.count({
    where: { type: "GROUP", createdBy: me, createdAt: { gte: new Date(Date.now() - 86_400_000) } },
  });
  if (recent >= 10) return { error: "Kamu sudah membuat 10 grup hari ini. Coba lagi besok." };

  let imageUrl: string | null = null;
  if (isFile(photo)) {
    const up = await saveUpload(photo, { image: true }, 5);
    if ("error" in up) return { error: up.error };
    imageUrl = up.url;
  }

  const conv = await prisma.conversation.create({
    data: {
      type: "GROUP",
      title: name,
      imageUrl,
      createdBy: me,
      members: { create: [{ userId: me }, ...users.map((u) => ({ userId: u.id }))] },
    },
    select: { id: true },
  });
  await systemMessage(conv.id, me, `${session.user.name} membuat grup “${name}”`);
  await systemMessage(conv.id, me, `${session.user.name} menambahkan ${listNames(users.map((u) => firstName(u.name)))}`);
  await notifyUsers(
    users.map((u) => u.id),
    { type: "group", message: `${session.user.name} menambahkanmu ke grup “${name}”`, link: `/obrolan/${conv.id}` }
  );
  revalidatePath("/obrolan", "layout");
  revalidatePath("/admin/obrolan");
  redirect(`/obrolan/${conv.id}`);
}

export async function addGroupMembers(conversationId: string, memberIds: string[]): Promise<{ error?: string; ok?: true }> {
  const r = await manageable(conversationId);
  if ("error" in r) return { error: r.error };
  const existing = new Set(r.conv.members.map((m) => m.userId));
  const ids = [...new Set((Array.isArray(memberIds) ? memberIds : []).map(String))].filter((id) => !existing.has(id)).slice(0, 300);
  if (!ids.length) return { error: "Tidak ada anggota baru yang dipilih." };
  const users = await prisma.user.findMany({ where: { id: { in: ids }, isActive: true }, select: { id: true, name: true } });
  if (!users.length) return { error: "Anggota tidak ditemukan." };

  await prisma.conversationMember.createMany({
    data: users.map((u) => ({ conversationId, userId: u.id })),
    skipDuplicates: true,
  });
  await systemMessage(conversationId, r.session.user.id, `${r.session.user.name} menambahkan ${listNames(users.map((u) => firstName(u.name)))}`);
  await notifyUsers(
    users.map((u) => u.id),
    { type: "group", message: `${r.session.user.name} menambahkanmu ke grup “${r.conv.title ?? "Grup"}”`, link: `/obrolan/${conversationId}` }
  );
  revalidatePath("/obrolan", "layout");
  revalidatePath("/admin/obrolan");
  return { ok: true };
}

export async function removeGroupMember(conversationId: string, userId: string): Promise<{ error?: string; ok?: true }> {
  const r = await manageable(conversationId);
  if ("error" in r) return { error: r.error };
  if (userId === r.session.user.id) return { error: "Gunakan menu “Keluar dari grup” untuk keluar." };
  if (userId === r.conv.createdBy && !isAdminRole(r.session.user.role)) return { error: "Pembuat grup tidak bisa dikeluarkan." };

  const target = await prisma.conversationMember.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
    select: { id: true, user: { select: { name: true } } },
  });
  if (!target) return { error: "Orang itu sudah tidak ada di grup." };
  await prisma.conversationMember.delete({ where: { id: target.id } });
  await systemMessage(conversationId, r.session.user.id, `${r.session.user.name} mengeluarkan ${firstName(target.user.name)}`);
  await notifyUser(userId, { type: "group", message: `Kamu dikeluarkan dari grup “${r.conv.title ?? "Grup"}”`, link: "/obrolan" });
  if (userId === r.conv.createdBy) {
    const heir = await prisma.conversationMember.findFirst({
      where: { conversationId },
      orderBy: { joinedAt: "asc" },
      select: { userId: true, user: { select: { name: true } } },
    });
    await prisma.conversation.update({ where: { id: conversationId }, data: { createdBy: heir?.userId ?? null } });
    if (heir) await systemMessage(conversationId, heir.userId, `${heir.user.name} sekarang menjadi pengelola grup`);
  }
  revalidatePath("/obrolan", "layout");
  revalidatePath("/admin/obrolan");
  return { ok: true };
}

export async function renameGroup(conversationId: string, title: string, description: string): Promise<{ error?: string; ok?: true }> {
  const r = await manageable(conversationId);
  if ("error" in r) return { error: r.error };
  const name = String(title ?? "").trim();
  const desc = String(description ?? "").trim().slice(0, 500);
  if (name.length < 2 || name.length > 60) return { error: "Nama grup harus 2 sampai 60 karakter." };
  if (await wordFilter(`${name} ${desc}`)) return { error: "Nama atau deskripsi mengandung kata yang tidak diperbolehkan." };

  await prisma.conversation.update({ where: { id: conversationId }, data: { title: name, description: desc || null } });
  if (name !== r.conv.title) await systemMessage(conversationId, r.session.user.id, `${r.session.user.name} mengubah nama grup menjadi “${name}”`);
  revalidatePath("/obrolan", "layout");
  revalidatePath("/admin/obrolan");
  return { ok: true };
}

export async function clearChat(conversationId: string): Promise<{ error?: string; ok?: true } | void> {
  const session = await requireUser("/obrolan");
  const m = await membership(conversationId, session.user.id);
  if (!m) return { error: "Obrolan tidak ditemukan." };
  const now = new Date();
  await prisma.conversationMember.update({ where: { id: m.id }, data: { clearedAt: now, lastReadAt: now } });
  revalidatePath("/obrolan", "layout");
  if (m.conversation.type === "DIRECT") redirect("/obrolan");
  return { ok: true };
}

export async function updateGroupPhoto(conversationId: string, fd: FormData): Promise<{ error?: string; ok?: true }> {
  const r = await manageable(conversationId);
  if ("error" in r) return { error: r.error };
  const current = await prisma.conversation.findUnique({ where: { id: conversationId }, select: { imageUrl: true } });
  const photo = fd.get("photo");

  if (isFile(photo)) {
    const up = await saveUpload(photo, { image: true }, 5);
    if ("error" in up) return { error: up.error };
    await prisma.conversation.update({ where: { id: conversationId }, data: { imageUrl: up.url } });
    await deleteUpload(current?.imageUrl ?? null);
    await systemMessage(conversationId, r.session.user.id, `${r.session.user.name} mengubah foto grup`);
  } else if (fd.get("remove")) {
    if (!current?.imageUrl) return { ok: true };
    await prisma.conversation.update({ where: { id: conversationId }, data: { imageUrl: null } });
    await deleteUpload(current.imageUrl);
    await systemMessage(conversationId, r.session.user.id, `${r.session.user.name} menghapus foto grup`);
  } else {
    return { error: "Pilih foto dulu." };
  }
  revalidatePath("/obrolan", "layout");
  revalidatePath("/admin/obrolan");
  return { ok: true };
}
