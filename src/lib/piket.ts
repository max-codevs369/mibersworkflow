import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { getSemesters, semesterForDay } from "@/lib/semesters";
import { getSettings } from "@/lib/settings";
import { isValidDateKey, type WeekdayKey } from "@/lib/format";

const TZ = "Asia/Jakarta";
const BY_INDEX: WeekdayKey[] = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
const WORKDAYS: WeekdayKey[] = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"];
const MAX_SPAN = 3660;

export const dateKey = (d: Date) => d.toLocaleDateString("sv-SE", { timeZone: TZ });
const toUtc = (key: string) => new Date(`${key}T00:00:00Z`);
export const addDays = (key: string, n: number) => {
  const d = toUtc(key);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
export const weekdayOf = (key: string) => BY_INDEX[toUtc(key).getUTCDay()];
export const keyToDate = (key: string) => new Date(`${key}T05:00:00Z`);
const isKey = isValidDateKey;

export type PiketPerson = { id: string; userId: string | null; name: string; image: string | null; absenNo: number };
export type PiketCourse = { subject: string; startTime: string; endTime: string; room: string | null; teacher: string | null };
export type PiketDay = {
  key: string;
  weekday: WeekdayKey;
  duty: boolean;
  holiday: string | null;
  person: PiketPerson | null;
  courses: PiketCourse[];

  semesterId: string | null;
};

type SchedRow = { semesterId: string; day: string; subject: string; startTime: string; endTime: string; room: string | null; teacher: string | null };

const loadBase = cache(async () => {
  const [rows, schedule, semesters] = await Promise.all([
    prisma.rosterEntry.findMany({
      orderBy: { absenNo: "asc" },
      select: { id: true, absenNo: true, name: true, user: { select: { id: true, image: true, isActive: true } } },
    }),
    prisma.schedule.findMany({
      orderBy: { startTime: "asc" },
      select: { semesterId: true, day: true, subject: true, startTime: true, endTime: true, room: true, teacher: true },
    }),
    getSemesters(),
  ]);
  const bySemester = new Map<string, SchedRow[]>();
  for (const s of schedule) {
    const list = bySemester.get(s.semesterId) ?? [];
    list.push(s);
    bySemester.set(s.semesterId, list);
  }
  return { rows, bySemester, semesters };
});

export async function getPiketPlan(from: string, days: number) {
  const settings = await getSettings();
  const anchor = isKey(settings.piket_start_date) ? settings.piket_start_date : from;
  const startAbsen = Math.max(1, Math.floor(Number(settings.piket_start_absen)) || 1);
  const end = addDays(from, Math.max(1, days) - 1);
  const rangeStart = anchor < from ? anchor : from;
  const rangeEnd = anchor > end ? anchor : end;

  const [{ rows, bySemester, semesters }, holidays] = await Promise.all([
    loadBase(),
    prisma.event.findMany({
      where: {
        type: "HOLIDAY",
        startAt: { lte: keyToDate(addDays(rangeEnd, 1)) },
        OR: [{ endAt: null, startAt: { gte: keyToDate(addDays(rangeStart, -1)) } }, { endAt: { gte: keyToDate(addDays(rangeStart, -1)) } }],
      },
      select: { title: true, startAt: true, endAt: true },
    }),
  ]);

  const roster: PiketPerson[] = rows.map((r) => ({
    id: r.id,
    userId: r.user?.isActive ? r.user.id : null,
    name: r.name,
    image: r.user?.isActive ? r.user.image : null,
    absenNo: r.absenNo,
  }));

  const classDaysOf = new Map<string | null, Set<WeekdayKey>>();
  const daysFor = (semId: string | null) => {
    let set = classDaysOf.get(semId);
    if (!set) {
      const list = semId ? bySemester.get(semId) : undefined;
      set = new Set<WeekdayKey>(list?.length ? list.map((s) => s.day as WeekdayKey) : WORKDAYS);
      classDaysOf.set(semId, set);
    }
    return set;
  };
  const semCache = new Map<string, string | null>();
  const semOf = (k: string) => {
    let id = semCache.get(k);
    if (id === undefined) {
      id = semesterForDay(semesters, k)?.id ?? null;
      semCache.set(k, id);
    }
    return id;
  };

  const holidayOf = new Map<string, string>();
  for (const h of holidays) {
    let k = dateKey(h.startAt);
    const last = dateKey(h.endAt ?? h.startAt);
    for (let i = 0; k <= last && i < 120; i++, k = addDays(k, 1)) holidayOf.set(k, h.title);
  }

  const isDuty = (k: string) => daysFor(semOf(k)).has(weekdayOf(k)) && !holidayOf.has(k);

  let anchorIdx = roster.findIndex((r) => r.absenNo >= startAbsen);
  if (anchorIdx < 0) anchorIdx = 0;

  let steps = 0;
  if (from > anchor) {
    for (let k = addDays(anchor, 1), i = 0; k <= from && i < MAX_SPAN; k = addDays(k, 1), i++) if (isDuty(k)) steps++;
  } else if (from < anchor) {
    for (let k = addDays(from, 1), i = 0; k <= anchor && i < MAX_SPAN; k = addDays(k, 1), i++) if (isDuty(k)) steps--;
  }

  const n = roster.length;
  const plan: PiketDay[] = [];
  for (let i = 0, k = from; i < days; i++, k = addDays(k, 1)) {
    if (i > 0 && isDuty(k)) steps++;
    const weekday = weekdayOf(k);
    const duty = k >= anchor && isDuty(k);
    const semesterId = semOf(k);
    plan.push({
      key: k,
      weekday,
      duty,
      holiday: holidayOf.get(k) ?? null,
      person: duty && n ? roster[(((anchorIdx + steps) % n) + n) % n] : null,
      courses: (semesterId ? bySemester.get(semesterId) ?? [] : [])
        .filter((s) => s.day === weekday)
        .map((s) => ({ subject: s.subject, startTime: s.startTime, endTime: s.endTime, room: s.room, teacher: s.teacher })),
      semesterId,
    });
  }

  const ORDER: WeekdayKey[] = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];
  return {
    plan,
    roster,
    usesSchedule: !!bySemester.get(semOf(from) ?? "")?.length,
    classDays: ORDER.filter((d) => daysFor(semOf(from)).has(d)),
    startKey: anchor,
  };
}

export async function nextDutyOf(userId: string, from = dateKey(new Date()), lookahead = 120) {
  const { plan } = await getPiketPlan(from, lookahead);
  return plan.find((d) => d.person?.userId === userId) ?? null;
}
