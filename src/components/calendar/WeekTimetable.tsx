import { MapPin } from "lucide-react";
import { WEEKDAY_LABEL, type WeekdayKey } from "@/lib/format";
import { cx } from "@/lib/ui";

type Slot = { id: string; day: string; startTime: string; endTime: string; subject: string; teacher: string | null; room: string | null };

const ORDER: WeekdayKey[] = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];
const TONES = [
  "border-l-brand bg-brand/10",
  "border-l-info bg-info/10",
  "border-l-ok bg-ok/10",
  "border-l-pink bg-pink/10",
  "border-l-gold bg-gold/10",
  "border-l-violet bg-violet/10",
];
const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
const ROW = 56;

export default function WeekTimetable({ slots, today, edit }: { slots: Slot[]; today: WeekdayKey | null; edit?: (slot: Slot) => React.ReactNode }) {
  const days = ORDER.filter((d) => ORDER.indexOf(d) < 5 || slots.some((s) => s.day === d));
  const subjects = [...new Set(slots.map((s) => s.subject))];
  const tone = (subject: string) => TONES[subjects.indexOf(subject) % TONES.length];

  const minStart = Math.min(...slots.map((s) => toMin(s.startTime)));
  const maxEnd = Math.max(...slots.map((s) => toMin(s.endTime)));
  const firstHour = Math.floor(minStart / 60);
  const lastHour = Math.ceil(maxEnd / 60);
  const hours = Array.from({ length: Math.max(1, lastHour - firstHour) }, (_, i) => firstHour + i);
  const height = hours.length * ROW;

  return (
    <>
      <div className="hidden overflow-x-auto rounded-2xl border border-line bg-surface md:block">
        <div className="min-w-[44rem]">
          <div className="grid border-b border-line bg-surface-2/60" style={{ gridTemplateColumns: `3.5rem repeat(${days.length}, minmax(0, 1fr))` }}>
            <span />
            {days.map((d) => (
              <span
                key={d}
                className={cx("border-l border-line px-3 py-2.5 text-sm font-semibold", d === today ? "text-brand" : "text-fg")}
              >
                {WEEKDAY_LABEL[d]}
                {d === today && <span className="ml-1.5 rounded-full bg-brand px-1.5 py-0.5 text-[10px] font-bold text-ink">HARI INI</span>}
              </span>
            ))}
          </div>
          <div className="relative grid" style={{ gridTemplateColumns: `3.5rem repeat(${days.length}, minmax(0, 1fr))`, height }}>
            <div className="relative">
              {hours.map((h, i) => (
                <span key={h} className="absolute right-2 -translate-y-1/2 font-mono text-[11px] text-faint" style={{ top: i * ROW }}>
                  {i === 0 ? "" : `${String(h).padStart(2, "0")}:00`}
                </span>
              ))}
            </div>
            {days.map((d) => (
              <div key={d} className={cx("relative border-l border-line", d === today && "bg-brand/[0.03]")}>
                {hours.map((h, i) => (
                  <span key={h} aria-hidden className="absolute inset-x-0 border-t border-dashed border-line/70" style={{ top: i * ROW }} />
                ))}
                {slots
                  .filter((s) => s.day === d)
                  .map((s) => {
                    const top = ((toMin(s.startTime) - firstHour * 60) / 60) * ROW;
                    const h = Math.max(((toMin(s.endTime) - toMin(s.startTime)) / 60) * ROW, 30);
                    return (
                      <div
                        key={s.id}
                        className={cx("group absolute inset-x-1 overflow-hidden rounded-lg border-l-4 px-2 py-1.5", tone(s.subject))}
                        style={{ top: top + 2, height: h - 4 }}
                      >
                        <p className="truncate text-[12.5px] font-semibold leading-tight text-fg">{s.subject}</p>
                        <p className="truncate font-mono text-[10.5px] text-muted">
                          {s.startTime}–{s.endTime}
                        </p>
                        {h > 64 && (s.room || s.teacher) && (
                          <p className="mt-0.5 truncate text-[11px] text-muted">{[s.room, s.teacher].filter(Boolean).join(" · ")}</p>
                        )}
                        {edit && <span className="absolute right-1 top-1 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">{edit(s)}</span>}
                      </div>
                    );
                  })}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:hidden">
        {days.map((d) => {
          const items = slots.filter((s) => s.day === d);
          return (
            <section key={d} className={cx("rounded-2xl border bg-surface p-4", d === today ? "border-brand" : "border-line")}>
              <h3 className="flex items-center gap-2 font-bold">
                {WEEKDAY_LABEL[d]}
                {d === today && <span className="rounded-full bg-brand px-1.5 py-0.5 text-[10px] font-bold text-ink">HARI INI</span>}
              </h3>
              {items.length === 0 ? (
                <p className="mt-2 text-sm text-faint">Tidak ada kuliah.</p>
              ) : (
                <ol className="mt-3 grid gap-2">
                  {items.map((s) => (
                    <li key={s.id} className={cx("relative rounded-lg border-l-4 px-3 py-2", edit && "pr-[4.75rem]", tone(s.subject))}>
                      <p className="font-semibold leading-snug">{s.subject}</p>
                      <p className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-muted">
                        <span className="font-mono">
                          {s.startTime}–{s.endTime}
                        </span>
                        {s.room && (
                          <span className="inline-flex items-center gap-1">
                            <MapPin size={11} /> {s.room}
                          </span>
                        )}
                        {s.teacher && <span>{s.teacher}</span>}
                      </p>
                      {edit && <span className="absolute right-1.5 top-1.5">{edit(s)}</span>}
                    </li>
                  ))}
                </ol>
              )}
            </section>
          );
        })}
      </div>
    </>
  );
}
