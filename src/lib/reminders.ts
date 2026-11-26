import { prisma } from "@/lib/prisma";
import { notifyAll, notifyUser } from "@/lib/notify";
import { dateKey, getPiketPlan } from "@/lib/piket";
import { daysUntil, timeOf } from "@/lib/format";

const EVERY_MS = 5 * 60_000;
const PIKET_HOUR = 6;
const g = globalThis as unknown as { __m26Reminders?: ReturnType<typeof setInterval> };

export function startReminders() {
  if (g.__m26Reminders) return;
  const tick = () => runReminders().catch((e) => console.error("[pengingat]", e instanceof Error ? e.message : e));
  setTimeout(tick, 20_000).unref?.();
  g.__m26Reminders = setInterval(tick, EVERY_MS);
  g.__m26Reminders.unref?.();
}

export async function runReminders(now = new Date()) {
  await scheduledAnnouncements(now);
  await upcomingEvents(now);
  await piketToday(now);
}

async function scheduledAnnouncements(now: Date) {
  const due = await prisma.announcement.findMany({
    where: { status: "PUBLISHED", notifiedAt: null, publishedAt: { lte: now } },
    orderBy: { publishedAt: "asc" },
    take: 20,
    select: { id: true, title: true, priority: true, authorId: true, expiresAt: true },
  });
  for (const a of due) {
    const claimed = await prisma.announcement.updateMany({ where: { id: a.id, notifiedAt: null }, data: { notifiedAt: now } });
    if (!claimed.count || (a.expiresAt && a.expiresAt <= now)) continue;
    await notifyAll({
      exceptUserId: a.authorId,
      type: "announcement",
      message: `${a.priority === "URGENT" ? "[Mendesak] " : ""}Pengumuman baru: ${a.title}`,
      link: `/pengumuman/${a.id}`,
    });
  }
}

async function upcomingEvents(now: Date) {
  const soon = await prisma.event.findMany({
    where: { remindedAt: null, startAt: { gt: now, lte: new Date(now.getTime() + 24 * 3_600_000) } },
    orderBy: { startAt: "asc" },
    take: 20,
  });
  for (const e of soon) {
    const claimed = await prisma.event.updateMany({ where: { id: e.id, remindedAt: null }, data: { remindedAt: now } });
    if (!claimed.count) continue;
    const when = daysUntil(e.startAt, now) === 0 ? "Hari ini" : "Besok";
    await notifyAll({
      type: "reminder",
      message: `${when} jam ${timeOf(e.startAt)}: ${e.title}${e.location ? ` di ${e.location}` : ""}. Jangan lupa ya!`,
      link: "/agenda",
    });
  }
}

async function piketToday(now: Date) {
  const hour = Number(now.toLocaleString("en-US", { timeZone: "Asia/Jakarta", hour: "numeric", hourCycle: "h23" }));
  if (hour < PIKET_HOUR) return;
  const today = dateKey(now);
  const key = "piket_reminded_on";
  const row = await prisma.siteSetting.findUnique({ where: { key } });
  if (row?.value === today) return;

  if (row) {
    const claimed = await prisma.siteSetting.updateMany({ where: { key, value: row.value }, data: { value: today } });
    if (!claimed.count) return;
  } else {
    try {
      await prisma.siteSetting.create({ data: { key, value: today } });
    } catch {
      return;
    }
  }
  const { plan } = await getPiketPlan(today, 1);
  const d = plan[0];
  if (!d?.duty || !d.person?.userId) return;
  await notifyUser(d.person.userId, {
    type: "piket",
    message: `Hari ini giliranmu piket kelas, ${d.person.name}. Semangat! 💪`,
    link: "/agenda/piket",
  });
}
