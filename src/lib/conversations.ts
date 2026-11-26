import { prisma } from "@/lib/prisma";

export const directKeyOf = (a: string, b: string) => [a, b].sort().join(":");

export async function unreadByConversation(userId: string) {
  const rows = await prisma.$queryRaw<{ conversationId: string; n: bigint }[]>`
    SELECT m."conversationId", COUNT(*)::bigint AS n
    FROM "Message" m
    JOIN "ConversationMember" cm
      ON cm."conversationId" = m."conversationId" AND cm."userId" = ${userId}
    WHERE m."senderId" <> ${userId}
      AND m."kind" = 'TEXT'
      AND m."deletedAt" IS NULL
      AND m."createdAt" > cm."lastReadAt"
    GROUP BY m."conversationId"`;
  return new Map(rows.map((r) => [r.conversationId, Number(r.n)]));
}

export async function totalUnread(userId: string) {
  const map = await unreadByConversation(userId);
  let n = 0;
  for (const v of map.values()) n += v;
  return n;
}

export async function systemMessage(conversationId: string, actorId: string, content: string) {
  const now = new Date();
  await prisma.$transaction([
    prisma.message.create({
      data: { conversationId, senderId: actorId, kind: "SYSTEM", content: content.slice(0, 500), createdAt: now },
    }),
    prisma.conversation.update({ where: { id: conversationId }, data: { lastMessageAt: now } }),
  ]);
}

export function namesList(names: string[]) {
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} dan ${names[names.length - 1]}`;
}

export async function markDelivered(userId: string) {
  await prisma.$executeRaw`
    UPDATE "ConversationMember" cm
    SET "deliveredAt" = ${new Date()}
    FROM "Conversation" c
    WHERE cm."conversationId" = c.id
      AND cm."userId" = ${userId}
      AND cm."deliveredAt" < c."lastMessageAt"`;
}

export async function chatSignature(userId: string, conversationId?: string | null) {
  const mine = await prisma.conversationMember.findMany({
    where: { userId },
    select: { conversationId: true, lastReadAt: true, conversation: { select: { lastMessageAt: true } } },
  });
  const latest = mine.reduce((t, m) => Math.max(t, m.conversation.lastMessageAt.getTime()), 0);
  const unread = await totalUnread(userId);
  let room = "";
  if (conversationId && mine.some((m) => m.conversationId === conversationId)) {
    const [others, last, deleted, conv] = await Promise.all([
      prisma.conversationMember.findMany({
        where: { conversationId, userId: { not: userId } },
        select: { userId: true, lastReadAt: true, deliveredAt: true },
      }),
      prisma.message.findFirst({ where: { conversationId }, orderBy: { createdAt: "desc" }, select: { id: true } }),
      prisma.message.count({ where: { conversationId, deletedAt: { not: null } } }),
      prisma.conversation.findUnique({ where: { id: conversationId }, select: { title: true, description: true, createdBy: true, imageUrl: true } }),
    ]);
    const minRead = others.reduce((t, o) => Math.min(t, o.lastReadAt.getTime()), Infinity);
    const minDelivered = others.reduce((t, o) => Math.min(t, o.deliveredAt.getTime()), Infinity);
    room = [last?.id, deleted, others.length, minRead, minDelivered, conv?.title, conv?.description, conv?.createdBy, conv?.imageUrl].join("|");
  }
  return `${mine.length}|${latest}|${unread}|${room}`;
}
