import Link from "next/link";
import { BookOpen, Brush, CalendarCheck, ChevronLeft, ChevronRight } from "lucide-react";
import type { CalDay } from "@/lib/calendar";
import { monthTitle, shiftMonth } from "@/lib/calendar";
import { cx } from "@/lib/ui";

const HEAD = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

export const EVENT_DOT: Record<string, string> = {
  EXAM: "bg-danger",
  ACTIVITY: "bg-brand",
  BIRTHDAY: "bg-pink",
  HOLIDAY: "bg-ok",
  OTHER: "bg-muted",
};

const EVENT_CHIP: Record<string, string> = {
  EXAM: "bg-danger/15 text-danger",
  ACTIVITY: "bg-brand/15 text-brand",
  BIRTHDAY: "bg-pink/15 text-pink",
  HOLIDAY: "bg-ok/15 text-ok",
  OTHER: "bg-surface-3 text-muted",
};

export default function MonthCalendar({
  month,
  weeks,
  selected,
  todayKey,
  href,
  min,
  max,
}: {
  month: string;
  weeks: CalDay[][];
  selected: string;
  todayKey: string;
  href: (params: { bulan?: string; tanggal?: string }) => string;
  min?: string;
  max?: string;
}) {
  const prev = shiftMonth(month, -1);
  const next = shiftMonth(month, 1);
  const thisMonth = todayKey.slice(0, 7);
  const canPrev = !min || prev >= min;
  const canNext = !max || next <= max;

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-3 py-3 sm:px-5">
        <h2 className="text-lg font-bold capitalize sm:text-xl">{monthTitle(month)}</h2>
        <div className="flex items-center gap-1.5">
          {month !== thisMonth && (
            <Link
              href={href({ bulan: thisMonth, tanggal: todayKey })}
              scroll={false}
              className="mr-1 inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-line px-3 text-sm font-medium text-muted transition hover:border-line-strong hover:text-fg"
            >
              <CalendarCheck size={15} /> Hari ini
            </Link>
          )}
          <Link
            href={href({ bulan: prev })}
            scroll={false}
            aria-label="Bulan sebelumnya"
            aria-disabled={!canPrev}
            className={cx(
              "flex h-9 w-9 items-center justify-center rounded-lg border border-line text-muted transition hover:border-line-strong hover:text-fg",
              !canPrev && "pointer-events-none opacity-30"
            )}
          >
            <ChevronLeft size={18} />
          </Link>
          <Link
            href={href({ bulan: next })}
            scroll={false}
            aria-label="Bulan berikutnya"
            aria-disabled={!canNext}
            className={cx(
              "flex h-9 w-9 items-center justify-center rounded-lg border border-line text-muted transition hover:border-line-strong hover:text-fg",
              !canNext && "pointer-events-none opacity-30"
            )}
          >
            <ChevronRight size={18} />
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-7 border-b border-line bg-surface-2/60 text-center text-[11px] font-semibold uppercase tracking-wider text-faint">
        {HEAD.map((h, i) => (
          <span key={h} className={cx("py-2", i >= 5 && "text-danger/70")}>
            {h}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {weeks.flat().map((d, i) => {
          const isSel = d.key === selected;
          const chips = d.events.filter((e) => !(d.holiday && e.type === "HOLIDAY"));
          return (
            <Link
              key={d.key}
              href={href({ bulan: month, tanggal: d.key })}
              scroll={false}
              aria-current={isSel ? "date" : undefined}
              aria-label={`${d.day}${d.holiday ? `, libur ${d.holiday}` : ""}${chips.length ? `, ${chips.length} acara` : ""}`}
              className={cx(
                "group relative flex min-h-[3.6rem] flex-col border-line p-1.5 text-left transition sm:min-h-[6.5rem] sm:p-2 lg:min-h-[7.75rem]",
                i % 7 !== 6 && "border-r",
                i < weeks.flat().length - 7 && "border-b",
                !d.inMonth && "bg-ink/40",
                d.holiday && d.inMonth && "bg-danger/[0.07]",
                isSel ? "z-10 outline outline-2 -outline-offset-2 outline-brand" : "hover:bg-surface-2"
              )}
            >
              <span className="flex items-center justify-between gap-1">
                <span
                  className={cx(
                    "flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-xs font-semibold tabular-nums sm:h-7 sm:min-w-7 sm:text-sm",
                    d.isToday ? "bg-brand text-ink" : !d.inMonth ? "text-faint/60" : d.holiday || d.weekday === "SUNDAY" ? "text-danger" : d.weekend ? "text-muted" : "text-fg"
                  )}
                >
                  {d.day}
                </span>
                {d.courses.length > 0 && d.inMonth && (
                  <span className="hidden items-center gap-0.5 rounded bg-info/15 px-1 text-[10px] font-medium text-info lg:inline-flex" title={`${d.courses.length} mata kuliah`}>
                    <BookOpen size={10} /> {d.courses.length}
                  </span>
                )}
              </span>

              {d.holiday && d.inMonth && (
                <span className="mt-1 hidden truncate text-[11px] font-medium text-danger sm:block">{d.holiday}</span>
              )}

              <span className="mt-1 hidden min-w-0 flex-col gap-0.5 sm:flex">
                {chips.slice(0, 2).map((e) => (
                  <span key={e.id} className={cx("truncate rounded px-1.5 py-0.5 text-[11px] font-medium leading-tight", EVENT_CHIP[e.type])}>
                    {e.title}
                  </span>
                ))}
                {chips.length > 2 && <span className="px-1 text-[10px] text-faint">+{chips.length - 2} lagi</span>}
              </span>

              {d.piket && d.inMonth && (
                <span className="mt-auto hidden items-center gap-1 pt-1 text-[11px] text-muted sm:flex">
                  <Brush size={11} className="flex-none text-brand" />
                  <span className="font-mono tabular-nums text-faint">{d.piket.absenNo}</span>
                  <span className="truncate">{d.piket.name}</span>
                </span>
              )}

              {d.inMonth && (chips.length > 0 || d.piket || d.holiday) && (
                <span className="mt-auto flex flex-wrap gap-0.5 pt-1 sm:hidden" aria-hidden>
                  {d.holiday && <span className="h-1.5 w-1.5 rounded-full bg-danger" />}
                  {chips.slice(0, 3).map((e) => (
                    <span key={e.id} className={cx("h-1.5 w-1.5 rounded-full", EVENT_DOT[e.type])} />
                  ))}
                  {d.piket && <span className="h-1.5 w-1.5 rounded-full bg-fg/40" />}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1.5 border-t border-line px-3 py-2.5 text-[11px] text-muted sm:px-5">
        <Legend tone="bg-danger" label="Ujian / libur" />
        <Legend tone="bg-brand" label="Kegiatan" />
        <Legend tone="bg-pink" label="Ulang tahun" />
        <span className="inline-flex items-center gap-1.5">
          <Brush size={11} className="text-brand" /> Petugas piket
        </span>
        <span className="inline-flex items-center gap-1.5">
          <BookOpen size={11} className="text-info" /> Jumlah mata kuliah
        </span>
      </div>
    </div>
  );
}

function Legend({ tone, label }: { tone: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cx("h-2 w-2 rounded-full", tone)} />
      {label}
    </span>
  );
}
