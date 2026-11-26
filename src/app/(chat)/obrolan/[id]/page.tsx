import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { getSession, requireUser } from "@/lib/session";
import { isAdminRole, ROLE_NAME, type RoleKey } from "@/lib/roles";
import ChatRoom from "@/components/chat/ChatRoom";

export const dynamic = "force-dynamic";

const LIMIT = 300;

async function loadTitle(id: string, me: string) {
  const c = await prisma.conversation.findFirst({
    where: { id, members: { some: { userId: me } } },
    select: { type: true, title: true, members: { select: { user: { select: { id: true, displayName: true } } } } },
  });
  if (!c) return null;
  return c.type === "GROUP" ? c.title ?? "Grup" : c.members.find((m) => m.user.id !== me)?.user.displayName ?? "Obrolan";
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const session = await getSession();
  const title = session ? await loadTitle((await params).id, session.user.id) : null;
  return { title: title ?? "Obrolan", robots: { index: false, follow: false } };
}

export default async function ChatRoomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireUser(`/obrolan/${id}`);
  const me = session.user;

  const mine = await prisma.conversationMember.findUnique({
    where: { conversationId_userId: { conversationId: id, userId: me.id } },
    select: { clearedAt: true },
  });
  if (!mine) notFound();
  await prisma.conversationMember.update({
    where: { conversationId_userId: { conversationId: id, userId: me.id } },
    data: { deliveredAt: new Date() },
  });
  const since = mine.clearedAt ?? new Date(0);

  const conv = await prisma.conversation.findFirst({
    where: { id, members: { some: { userId: me.id } } },
    select: {
      id: true,
      type: true,
      title: true,
      description: true,
      imageUrl: true,
      createdAt: true,
      createdBy: true,
      _count: { select: { messages: { where: { createdAt: { gt: since } } } } },
      members: {
        orderBy: { joinedAt: "asc" },
        select: {
          lastReadAt: true,
          deliveredAt: true,
          user: { select: { id: true, displayName: true, image: true, role: true, isActive: true } },
        },
      },
      messages: {
        where: { createdAt: { gt: since } },
        orderBy: { createdAt: "desc" },
        take: LIMIT,
        select: {
          id: true,
          kind: true,
          content: true,
          createdAt: true,
          deletedAt: true,
          sender: { select: { id: true, displayName: true, image: true } },
          replyTo: {
            select: { id: true, content: true, deletedAt: true, sender: { select: { id: true, displayName: true } } },
          },
        },
      },
    },
  });
  if (!conv) notFound();

  const group = conv.type === "GROUP";
  const others = conv.members.filter((m) => m.user.id !== me.id);
  const other = group ? undefined : others[0]?.user;
  const readUpTo = others.length
    ? new Date(Math.min(...others.map((m) => m.lastReadAt.getTime()))).toISOString()
    : new Date(0).toISOString();
  const deliveredUpTo = others.length
    ? new Date(Math.min(...others.map((m) => m.deliveredAt.getTime()))).toISOString()
    : new Date(0).toISOString();

  const memberIds = new Set(conv.members.map((m) => m.user.id));
  const canManage = group && (isAdminRole(me.role) || conv.createdBy === me.id);
  const candidates = canManage
    ? (
        await prisma.user.findMany({
          where: { isActive: true, id: { notIn: [...memberIds] } },
          orderBy: { displayName: "asc" },
          select: { id: true, displayName: true, image: true, role: true },
        })
      ).map((u) => ({ id: u.id, name: u.displayName, image: u.image, role: ROLE_NAME[u.role as RoleKey] ?? "Anggota" }))
    : [];

  const messages = conv.messages.reverse().map((m) => ({
    id: m.id,
    kind: m.kind,
    authorId: m.sender.id,
    name: m.sender.displayName,
    image: m.sender.image,
    text: m.content,
    at: m.createdAt.toISOString(),
    deleted: !!m.deletedAt,
    reply: m.replyTo
      ? {
          id: m.replyTo.id,
          authorId: m.replyTo.sender.id,
          name: m.replyTo.sender.displayName,
          text: m.replyTo.deletedAt ? "" : m.replyTo.content.slice(0, 300),
          deleted: !!m.replyTo.deletedAt,
        }
      : null,
  }));

  return (
    <ChatRoom
      key={conv.id}
      chat={{
          
        id: conv.id,
        group,
        title: group ? conv.title ?? "Grup" : other?.displayName ?? "Akun tidak aktif",
        description: conv.description,
        image: group ? conv.imageUrl : other?.image ?? null,
        seed: other?.id ?? conv.id,
        otherRole: other ? ROLE_NAME[other.role as RoleKey] ?? "Anggota" : null,
        createdAt: conv.createdAt.toISOString(),
      }}
      members={conv.members.map((m) => ({
        id: m.user.id,
        name: m.user.displayName,
        image: m.user.image,
        role: ROLE_NAME[m.user.role as RoleKey] ?? "Anggota",
      }))}
      messages={messages}
      truncated={conv._count.messages > LIMIT}
      readUpTo={readUpTo}
      deliveredUpTo={deliveredUpTo}
      me={{ id: me.id, name: me.displayName, image: me.image ?? null }}
      moderator={group && isAdminRole(me.role)}
      creatorId={group ? conv.createdBy : null}
      canManage={canManage}
      candidates={candidates}
    />
  );
}
