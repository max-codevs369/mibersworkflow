import Link from "next/link";
import { BookOpen, Brush, CalendarX2, Clock, MapPin } from "lucide-react";
import type { CalDay } from "@/lib/calendar";
import { eventTime, longDay } from "@/lib/calendar";
import { EVENT_TYPE_LABEL, EVENT_TYPE_TONE } from "@/lib/labels";
import { Avatar } from "@/components/ui/bits";
import { badge, cx } from "@/lib/ui";

export default function DayDetail({ day, todayKey, actions }: { day: CalDay; todayKey: string; actions?: (eventId: string) => React.ReactNode }) {
  const events = day.events.filter((e) => !(day.holiday && e.type === "HOLIDAY") || actions);
  const empty = !day.holiday && events.length === 0 && day.courses.length === 0 && !day.piket;

  return (
    <aside className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-4 sm:p-5">
      <div>
        <p className={cx("font-mono text-[11px] uppercase tracking-wider", day.key === todayKey ? "text-brand" : "text-faint")}>
          {day.key === todayKey ? "Hari ini" : day.key < todayKey ? "Sudah lewat" : "Akan datang"}
        </p>
        <h3 className="mt-1 text-lg font-bold capitalize leading-snug">{longDay(day.key)}</h3>
      </div>

      {day.holiday && (
        <p className="flex items-center gap-2 rounded-xl bg-danger/10 px-3 py-2.5 text-sm font-medium text-danger">
          <CalendarX2 size={16} className="flex-none" /> Libur · {day.holiday}
        </p>
      )}

      {events.length > 0 && (
        <section>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-faint">Acara</p>
          <ul className="grid gap-2">
            {events.map((e) => (
              <li key={e.id} className="rounded-xl border border-line bg-surface-2/60 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span className={cx(badge, EVENT_TYPE_TONE[e.type])}>{EVENT_TYPE_LABEL[e.type].toUpperCase()}</span>
                    <p className="prose-safe mt-1.5 font-semibold leading-snug">{e.title}</p>
                  </div>
                  {actions?.(e.id)}
                </div>
                <p className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted">
                  <span className="inline-flex items-center gap-1">
                    <Clock size={12} /> {eventTime(e)}
                  </span>
                  {e.location && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin size={12} /> {e.location}
                    </span>
                  )}
                </p>
                {e.description && <p className="prose-safe mt-1.5 line-clamp-3 whitespace-pre-line text-xs text-faint">{e.description}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {day.courses.length > 0 && (
        <section>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-faint">Kuliah</p>
          <ol className="grid gap-1.5">
            {day.courses.map((c, i) => (
              <li key={i} className="flex gap-3 rounded-lg bg-surface-2/60 px-3 py-2">
                <span className="w-[5.5rem] flex-none pt-0.5 font-mono text-[11px] text-faint">
                  {c.startTime}–{c.endTime}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{c.subject}</span>
                  {(c.teacher || c.room) && <span className="block truncate text-xs text-muted">{[c.teacher, c.room].filter(Boolean).join(" · ")}</span>}
                </span>
              </li>
            ))}
          </ol>
        </section>
      )}

      {day.piket && (
        <section>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-faint">Petugas piket</p>
          {day.piket.userId ? (
            <Link href={`/anggota/${day.piket.userId}`} className="flex items-center gap-3 rounded-xl border border-brand/30 bg-brand/[0.07] p-3 transition hover:border-brand">
              <PiketBody day={day} />
            </Link>
          ) : (
            <div className="flex items-center gap-3 rounded-xl border border-brand/30 bg-brand/[0.07] p-3">
              <PiketBody day={day} />
            </div>
          )}
        </section>
      )}

      {empty && (
        <p className="rounded-xl border border-dashed border-line-strong px-4 py-6 text-center text-sm text-muted">
          {day.weekend ? "Akhir pekan, tidak ada kegiatan." : "Tidak ada acara di tanggal ini."}
        </p>
      )}

      {!day.courses.length && !day.holiday && !day.weekend && day.piket && (
        <p className="flex items-center gap-1.5 text-xs text-faint">
          <BookOpen size={12} /> Jadwal kuliah mingguan belum diisi.
        </p>
      )}
    </aside>
  );
}

function PiketBody({ day }: { day: CalDay }) {
  const p = day.piket!;
  return (
    <>
      <Avatar name={p.name} src={p.image} size={40} />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold">{p.name}</span>
        <span className="block text-xs text-muted">Absen {p.absenNo} · ambil absen kelas</span>
      </span>
      <Brush size={18} className="flex-none text-brand" />
    </>
  );
}
