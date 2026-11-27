import { prisma } from "@/lib/prisma";
import { inBackground, pushToUsers } from "@/lib/push";

type Payload = { type: string; message: string; link?: string | null; title?: string };

const TITLE: Record<string, string> = {
  announcement: "📢 Pengumuman",
  material: "📚 Materi kuliah",
  event: "📅 Agenda kelas",
  reminder: "⏰ Pengingat",
  piket: "🧹 Piket hari ini",
  group: "💬 Obrolan",
  moderation: "🛡️ Perlu dicek",
  media: "🖼️ Galeri",
  note: "📌 Dinding catatan",
  finance: "💰 Kas kelas",
};

const titleOf = (p: Payload) => p.title ?? TITLE[p.type] ?? "Mibers Duo Anam";

function pushLater(userIds: string[], p: Payload) {
  if (userIds.length === 0) return;
  inBackground(() =>
    pushToUsers(userIds, { title: titleOf(p), body: p.message, url: p.link ?? "/akun/notifikasi", tag: `${p.type}-${p.link ?? ""}` })
  );
}

export async function notifyUser(userId: string, p: Payload) {
  return notifyUsers([userId], p);
}

export async function notifyUsers(userIds: string[], p: Payload) {
  const ids = [...new Set(userIds)].filter(Boolean);
  if (ids.length === 0) return;
  try {
    await prisma.notification.createMany({
      data: ids.map((userId) => ({ userId, type: p.type, message: p.message.slice(0, 300), link: p.link ?? null })),
    });
  } catch (e) {
    console.error("[notify]", e instanceof Error ? e.message : e);
  }
  pushLater(ids, p);
}

export async function notifyAll(p: Payload & { exceptUserId?: string; adminsOnly?: boolean }) {
  try {
    const users = await prisma.user.findMany({
      where: {
        isActive: true,
        ...(p.exceptUserId ? { id: { not: p.exceptUserId } } : {}),
        ...(p.adminsOnly ? { role: { in: ["ADMIN", "SUPER_ADMIN"] } } : {}),
      },
      select: { id: true },
    });
    await notifyUsers(
      users.map((u) => u.id),
      p
    );
  } catch (e) {
    console.error("[notify]", e instanceof Error ? e.message : e);
  }
}
