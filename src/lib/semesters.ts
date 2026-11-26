import { cache } from "react";
import { prisma } from "@/lib/prisma";

export const TOTAL_SEMESTERS = 6;

export type SemesterInfo = {
  id: string;
  number: number;
  name: string;
  startDate: string | null;
  endDate: string | null;
  isActive: boolean;
  scheduleCount: number;
};

export const getSemesters = cache(async (): Promise<SemesterInfo[]> => {
  const rows = await prisma.semester.findMany({
    orderBy: { number: "asc" },
    select: {
      id: true,
      number: true,
      name: true,
      startDate: true,
      endDate: true,
      isActive: true,
      _count: { select: { schedules: true } },
    },
  });
  return rows.map(({ _count, ...s }) => ({ ...s, scheduleCount: _count.schedules }));
});

export const getActiveSemester = cache(async () => {
  const all = await getSemesters();
  return all.find((s) => s.isActive) ?? all.at(-1) ?? null;
});

export function semesterForDay<T extends Pick<SemesterInfo, "startDate" | "endDate" | "isActive" | "number">>(
  semesters: T[],
  key: string
): T | null {
  let best: T | null = null;
  let bestScore = -1;
  for (const s of semesters) {
    if (!s.startDate && !s.endDate && !s.isActive) continue;
    if (s.startDate && key < s.startDate) continue;
    if (s.endDate && key > s.endDate) continue;
    const score = (s.startDate ? 4 : 0) + (s.endDate ? 4 : 0) + (s.isActive ? 2 : 0);
    if (score > bestScore || (score === bestScore && best && s.number > best.number)) {
      best = s;
      bestScore = score;
    }
  }
  return best;
}

const fmt = (key: string) =>
  new Date(`${key}T05:00:00Z`).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

export function semesterRange(s: Pick<SemesterInfo, "startDate" | "endDate">) {
  if (s.startDate && s.endDate) return `${fmt(s.startDate)} – ${fmt(s.endDate)}`;
  if (s.startDate) return `Mulai ${fmt(s.startDate)}`;
  if (s.endDate) return `Sampai ${fmt(s.endDate)}`;
  return "Tanggal belum ditentukan";
}
