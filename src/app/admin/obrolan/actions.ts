"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { audit } from "@/lib/audit";
import { namesList, systemMessage } from "@/lib/conversations";
import { deleteUpload } from "@/lib/upload";
import { notifyUsers } from "@/lib/notify";
import type { ActionState } from "@/lib/ui";

const schema = z.object({
  title: z.string().trim().min(2, "Nama grup minimal 2 karakter.").max(80, "Nama grup maksimal 80 karakter."),
  description: z.string().trim().max(500, "Deskripsi maksimal 500 karakter."),
});

function refresh() {
  revalidatePath("/obrolan", "layout");
  revalidatePath("/admin/obrolan");
}

async function validMembers(fd: FormData) {
  const ids = [...new Set(fd.getAll("members").map(String).filter(Boolean))];
  if (!ids.length) return [];
  const users = await prisma.user.findMany({ where: { id: { in: ids }, isActive: true }, select: { id: true, displayName: true } });
  return users;
}

export async function createGroup(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const session = await requireAdmin();
  const parsed = schema.safeParse({ title: fd.get("title"), description: fd.get("description") ?? "" });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const users = await validMembers(fd);
  const ids = new Set(users.map((u) => u.id));
  if (fd.get("join")) ids.add(session.user.id);
  if (ids.size < 2) return { error: "Pilih minimal 2 orang untuk grup (termasuk kamu bila ikut)." };

  const group = await prisma.conversation.create({
    data: {
      type: "GROUP",
      title: parsed.data.title,
      description: parsed.data.description || null,
      createdBy: session.user.id,
      members: { create: [...ids].map((userId) => ({ userId })) },
    },
    select: { id: true },
  });
  await systemMessage(group.id, session.user.id, `${session.user.displayName} membuat grup “${parsed.data.title}”`);
  const added = users.filter((u) => u.id !== session.user.id).map((u) => u.displayName);
  if (added.length) await systemMessage(group.id, session.user.id, `${session.user.displayName} menambahkan ${namesList(added)}`);
  await notifyUsers(
    users.filter((u) => u.id !== session.user.id).map((u) => u.id),
    { type: "group", message: `${session.user.displayName} menambahkanmu ke grup “${parsed.data.title}”`, link: `/obrolan/${group.id}` }
  );

  await audit(session.user.id, "group.create", "Conversation", group.id);
  refresh();
  return { ok: true, message: "Grup dibuat." };
}

export async function updateGroup(id: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  const session = await requireAdmin();
  const group = await prisma.conversation.findFirst({
    where: { id, type: "GROUP" },
    select: { title: true, createdBy: true, members: { select: { userId: true, user: { select: { displayName: true } } } } },
  });
  if (!group) return { error: "Grup sudah dihapus." };

  const parsed = schema.safeParse({ title: fd.get("title"), description: fd.get("description") ?? "" });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const users = await validMembers(fd);
  const next = new Set(users.map((u) => u.id));
  if (next.size < 1) return { error: "Grup harus punya minimal 1 anggota." };
  const current = new Set(group.members.map((m) => m.userId));
  const add = users.filter((u) => !current.has(u.id));
  const remove = group.members.filter((m) => !next.has(m.userId));

  const createdBy =
    group.createdBy && next.has(group.createdBy)
      ? group.createdBy
      : (group.members.find((m) => next.has(m.userId))?.userId ?? users[0]?.id ?? null);

  await prisma.$transaction([
    prisma.conversation.update({
      where: { id },
      data: { title: parsed.data.title, description: parsed.data.description || null, createdBy },
    }),
    ...(add.length ? [prisma.conversationMember.createMany({ data: add.map((u) => ({ conversationId: id, userId: u.id })), skipDuplicates: true })] : []),
    ...(remove.length ? [prisma.conversationMember.deleteMany({ where: { conversationId: id, userId: { in: remove.map((m) => m.userId) } } })] : []),
  ]);

  const actor = session.user.displayName;
  if (group.title !== parsed.data.title) {
    await systemMessage(id, session.user.id, `${actor} mengubah nama grup menjadi “${parsed.data.title}”`);
  }
  if (add.length) await systemMessage(id, session.user.id, `${actor} menambahkan ${namesList(add.map((u) => u.displayName))}`);
  if (remove.length) {
    await systemMessage(id, session.user.id, `${actor} mengeluarkan ${namesList(remove.map((m) => m.user.displayName))}`);
  }
  await notifyUsers(
    add.filter((u) => u.id !== session.user.id).map((u) => u.id),
    { type: "group", message: `${actor} menambahkanmu ke grup “${parsed.data.title}”`, link: `/obrolan/${id}` }
  );
  await notifyUsers(
    remove.filter((m) => m.userId !== session.user.id).map((m) => m.userId),
    { type: "group", message: `Kamu dikeluarkan dari grup “${parsed.data.title}”`, link: "/obrolan" }
  );

  await audit(session.user.id, "group.update", "Conversation", id);
  refresh();
  return { ok: true, message: "Grup disimpan." };
}

export async function deleteGroup(id: string) {
  const session = await requireAdmin();
  const g = await prisma.conversation.findFirst({ where: { id, type: "GROUP" }, select: { imageUrl: true } });
  await prisma.conversation.deleteMany({ where: { id, type: "GROUP" } });
  await deleteUpload(g?.imageUrl ?? null);
  await audit(session.user.id, "group.delete", "Conversation", id);
  refresh();
}
