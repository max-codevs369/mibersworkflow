import { prisma } from "@/lib/prisma";
import { addDays, dateKey, getPiketPlan, keyToDate, weekdayOf, type PiketCourse, type PiketPerson } from "@/lib/piket";
import type { EventTypeKey } from "@/lib/labels";
import type { WeekdayKey } from "@/lib/format";
import type { Prisma } from "@/generated/prisma/client";

export type CalEvent = {
  id: string;
  title: string;
  type: EventTypeKey;
  description: string | null;
  location: string | null;
  startAt: Date;
  endAt: Date | null;
  allDay: boolean;
};

export type CalDay = {
  key: string;
  day: number;
  weekday: WeekdayKey;
  inMonth: boolean;
  isToday: boolean;
  weekend: boolean;
  holiday: string | null;
  events: CalEvent[];
  piket: PiketPerson | null;
  courses: PiketCourse[];
};

export const isMonthKey = (v?: string) => !!v && /^\d{4}-(0[1-9]|1[0-2])$/.test(v);
export const isDayKey = (v?: string) => {
  if (!v || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
};

export const shiftMonth = (ym: string, n: number) => {
  const [y, m] = ym.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 + n, 1)).toISOString().slice(0, 7);
};

export const monthTitle = (ym: string) =>
  new Date(`${ym}-01T05:00:00Z`).toLocaleDateString("id-ID", { month: "long", year: "numeric", timeZone: "UTC" });

const jakartaTime = (d: Date) =>
  d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Jakarta" }).replace(".", ":");

export function eventTime(e: CalEvent) {
  if (e.allDay) return "Seharian";
  const start = jakartaTime(e.startAt);
  if (!e.endAt) return start;
  return dateKey(e.startAt) === dateKey(e.endAt) ? `${start}–${jakartaTime(e.endAt)}` : `mulai ${start}`;
}

export async function buildMonth(ym: string, filter: Prisma.EventWhereInput = {}) {
  const todayKey = dateKey(new Date());
  let start = `${ym}-01`;
  while (weekdayOf(start) !== "MONDAY") start = addDays(start, -1);
  const lastOfMonth = addDays(`${shiftMonth(ym, 1)}-01`, -1);
  let end = lastOfMonth;
  while (weekdayOf(end) !== "SUNDAY") end = addDays(end, 1);
  const span = Math.round((new Date(`${end}T00:00:00Z`).getTime() - new Date(`${start}T00:00:00Z`).getTime()) / 86_400_000) + 1;

  const rangeStart = new Date(`${start}T00:00:00+07:00`);
  const rangeEnd = new Date(`${end}T23:59:59+07:00`);

  const [rows, { plan }] = await Promise.all([
    prisma.event.findMany({
      where: {
        AND: [
          filter,
          { startAt: { lte: rangeEnd } },
          { OR: [{ endAt: { gte: rangeStart } }, { endAt: null, startAt: { gte: rangeStart } }] },
        ],
      },
      orderBy: { startAt: "asc" },
    }),
    getPiketPlan(start, span),
  ]);

  const events: CalEvent[] = rows.map((e) => {
    const s = jakartaTime(e.startAt);
    const en = e.endAt ? jakartaTime(e.endAt) : null;
    return {
      id: e.id,
      title: e.title,
      type: e.type as EventTypeKey,
      description: e.description,
      location: e.location,
      startAt: e.startAt,
      endAt: e.endAt,
      allDay: s === "00:00" && (!en || en === "23:59"),
    };
  });

  const days: CalDay[] = plan.map((p) => {
    const dayEvents = events.filter((e) => dateKey(e.startAt) <= p.key && dateKey(e.endAt ?? e.startAt) >= p.key);
    return {
      key: p.key,
      day: Number(p.key.slice(8, 10)),
      weekday: p.weekday,
      inMonth: p.key.slice(0, 7) === ym,
      isToday: p.key === todayKey,
      weekend: p.weekday === "SATURDAY" || p.weekday === "SUNDAY",
      holiday: p.holiday,
      events: dayEvents,
      piket: p.person,
      courses: p.holiday ? [] : p.courses,
    };
  });

  const weeks: CalDay[][] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));

  const monthEvents = events.filter((e) => dateKey(e.startAt) <= lastOfMonth && dateKey(e.endAt ?? e.startAt) >= `${ym}-01`);
  return { weeks, days, monthEvents, todayKey };
}

export const longDay = (key: string) =>
  keyToDate(key).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jakarta" });
