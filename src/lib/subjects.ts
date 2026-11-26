import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { WEEKDAYS } from "@/lib/format";

export const getSubjects = cache(async (): Promise<string[]> => {
  const rows = await prisma.schedule.findMany({
    select: { subject: true, day: true, startTime: true, semester: { select: { number: true } } },
  });
  rows.sort(
    (a, b) =>
      a.semester.number - b.semester.number ||
      WEEKDAYS.indexOf(a.day as never) - WEEKDAYS.indexOf(b.day as never) ||
      a.startTime.localeCompare(b.startTime)
  );
  const seen = new Set<string>();
  const out: string[] = [];
  for (const r of rows) {
    const name = r.subject.trim();
    const key = name.toLowerCase();
    if (name && !seen.has(key)) {
      seen.add(key);
      out.push(name);
    }
  }
  return out;
});
