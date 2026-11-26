import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { unreadByConversation } from "@/lib/conversations";
import ChatShell from "@/components/chat/ChatShell";
import ChatList, { type ChatSummary, type Person } from "@/components/chat/ChatList";
import { ROLE_NAME, type RoleKey } from "@/lib/roles";

export default async function ObrolanLayout({ children }: { children: React.ReactNode }) {
  const session = await requireUser("/obrolan");
  const me = session.user.id;

  const [convs, unread, users] = await Promise.all([
    prisma.conversation.findMany({
      where: { members: { some: { userId: me } } },
      orderBy: { lastMessageAt: "desc" },
      take: 200,
      select: {
        id: true,
        type: true,
        title: true,
        imageUrl: true,
        lastMessageAt: true,
        members: {
          select: {
            lastReadAt: true,
            deliveredAt: true,
            clearedAt: true,
            user: { select: { id: true, name: true, image: true } },
          },
        },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { content: true, kind: true, deletedAt: true, createdAt: true, senderId: true, sender: { select: { name: true } } },
        },
      },
    }),
    unreadByConversation(me),
    prisma.user.findMany({
      where: { isActive: true, id: { not: me } },
      orderBy: { name: "asc" },
      select: { id: true, name: true, image: true, role: true },
    }),
  ]);

  const directWith = new Map<string, string>();
  const visible = convs.filter((c) => {
    const cleared = c.members.find((m) => m.user.id === me)?.clearedAt;
    return !(c.type === "DIRECT" && cleared && c.lastMessageAt <= cleared);
  });
  for (const c of convs) {
    if (c.type !== "DIRECT") continue;
    const other = c.members.find((m) => m.user.id !== me)?.user;
    if (other) directWith.set(other.id, c.id);
  }
  const chats: ChatSummary[] = visible.map((c) => {
    const other = c.type === "DIRECT" ? c.members.find((m) => m.user.id !== me)?.user : undefined;
    const cleared = c.members.find((x) => x.user.id === me)?.clearedAt;
    const raw = c.messages[0];
    const m = raw && (!cleared || raw.createdAt > cleared) ? raw : undefined;
    const others = c.members.filter((x) => x.user.id !== me);
    const status: "sent" | "delivered" | "read" =
      m && others.length && others.every((x) => x.lastReadAt >= m.createdAt)
        ? "read"
        : m && others.length && others.every((x) => x.deliveredAt >= m.createdAt)
          ? "delivered"
          : "sent";
    return {
      id: c.id,
      type: c.type,
      title: c.type === "GROUP" ? c.title ?? "Grup" : other?.name ?? "Akun tidak aktif",
      image: c.type === "GROUP" ? c.imageUrl : other?.image ?? null,
      seed: other?.id ?? c.id,
      at: c.lastMessageAt.toISOString(),
      unread: unread.get(c.id) ?? 0,
      last: m
        ? {
            name: m.senderId === me ? "Kamu" : m.sender.name.split(" ")[0],
            text: m.deletedAt ? "Pesan ini telah dihapus" : m.content.replace(/\s+/g, " ").slice(0, 120),
            mine: m.senderId === me,
            system: m.kind === "SYSTEM",
            deleted: !!m.deletedAt,
            status,
          }
        : null,
    };
  });

  const people: Person[] = users.map((u) => ({
    id: u.id,
    name: u.name,
    image: u.image,
    role: ROLE_NAME[u.role as RoleKey] ?? "Anggota",
    chatId: directWith.get(u.id) ?? null,
  }));

  return (
    <ChatShell
      titles={Object.fromEntries(chats.map((c) => [c.id, c.title]))}
      list={<ChatList chats={chats} people={people} />}
    >
      {children}
    </ChatShell>
  );
}
