import Link from "next/link";
import { Brush, CalendarCheck, ChevronLeft, ChevronRight } from "lucide-react";
import PageHeader, { container } from "@/components/PageHeader";
import PersonPicker from "@/components/PersonPicker";
import { Avatar, EmptyState } from "@/components/ui/bits";
import { getSettings } from "@/lib/settings";
import { isMonthKey } from "@/lib/calendar";
import { addDays, dateKey, getPiketPlan, keyToDate, weekdayOf, type PiketDay } from "@/lib/piket";
import { WEEKDAY_LABEL, type WeekdayKey } from "@/lib/format";
import { btn, cx } from "@/lib/ui";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Jadwal Piket Lengkap",
  description: "Jadwal piket kelas Mibers Duo Anam lengkap per hari dan per anggota.",
  alternates: { canonical: "/agenda/piket" },
  openGraph: { title: "Jadwal Piket Lengkap", description: "Jadwal piket kelas Mibers Duo Anam lengkap per hari dan per anggota.", url: "/agenda/piket" },
};

const MONTHS = 36;
const shiftMonth = (ym: string, n: number) => {
  const [y, m] = ym.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 + n, 1)).toISOString().slice(0, 7);
};
const monthLabel = (ym: string) =>
  new Date(`${ym}-01T05:00:00Z`).toLocaleDateString("id-ID", { month: "long", year: "numeric", timeZone: "UTC" });
const daysIn = (ym: string) => {
  const [y, m] = ym.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
};
const dayNum = (k: string) => Number(k.slice(8, 10));
const shortDate = (k: string) =>
  keyToDate(k).toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short", timeZone: "Asia/Jakarta" });
const ORDER: WeekdayKey[] = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];

type Cell = { key: string; day: PiketDay | null; inMonth: boolean };

export default async function PiketMonthPage({ searchParams }: { searchParams: Promise<{ bulan?: string; absen?: string }> }) {
  const sp = await searchParams;
  const settings = await getSettings();
  const todayKey = dateKey(new Date());
  const thisMonth = todayKey.slice(0, 7);
  const first = (/^\d{4}-\d{2}-\d{2}$/.test(settings.piket_start_date) ? settings.piket_start_date : todayKey).slice(0, 7);
  const last = shiftMonth(first, MONTHS - 1);
  const requested = isMonthKey(sp.bulan) ? sp.bulan! : thisMonth;
  const month = requested < first ? first : requested > last ? last : requested;

  const [{ plan, roster, usesSchedule, classDays, startKey }, ahead] = await Promise.all([
    getPiketPlan(`${month}-01`, daysIn(month)),
    getPiketPlan(todayKey, 120),
  ]);

  const focus = roster.find((r) => r.absenNo === Number(sp.absen)) ?? null;
  const byKey = new Map(plan.map((d) => [d.key, d]));
  const cols = classDays.length ? classDays : (["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"] as WeekdayKey[]);

  const weeks: { label: string; cells: Cell[] }[] = [];
  let cursor = `${month}-01`;
  while (weekdayOf(cursor) !== "MONDAY") cursor = addDays(cursor, -1);
  while (cursor.slice(0, 7) <= month) {
    const cells: Cell[] = cols.map((wd) => {
      const key = addDays(cursor, ORDER.indexOf(wd));
      return { key, day: byKey.get(key) ?? null, inMonth: key.slice(0, 7) === month };
    });
    const inside = cells.filter((c) => c.inMonth);
    if (inside.length && inside.some((c) => c.key >= startKey)) {
      const a = inside[0].key;
      const b = inside[inside.length - 1].key;
      weeks.push({ label: a === b ? shortDate(a) : `${dayNum(a)} – ${shortDate(b).replace(/^\S+\s/, "")}`, cells });
    }
    cursor = addDays(cursor, 7);
  }

  const monthDuties = plan.filter((d) => d.duty && d.person);
  const focusDays = focus ? monthDuties.filter((d) => d.person!.absenNo === focus.absenNo) : [];
  const focusNext = focus ? ahead.plan.find((d) => d.person?.absenNo === focus.absenNo && d.key >= todayKey) : null;
  const href = (ym: string) => {
    const p = new URLSearchParams({ bulan: ym });
    if (focus) p.set("absen", String(focus.absenNo));
    return `/agenda/piket?${p.toString()}`;
  };

  return (
    <>
      <PageHeader
        crumbs={[{ label: "Kelas" }, { label: "Agenda & jadwal", href: "/agenda" }, { label: "Jadwal piket" }]}
        eyebrow={`${roster.length} orang · bergilir sesuai absen`}
        title="Jadwal piket lengkap"
        description="Satu orang per hari kuliah, bertugas mengambil absen kelas. Geser bulan untuk melihat giliran sampai 3 tahun ke depan."
      />

      <section className={cx(container, "pt-8")}>
        {roster.length === 0 ? (
          <EmptyState icon={<Brush size={32} />} title="Daftar absen belum diisi" />
        ) : (
          <>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-2">
                <Link
                  href={href(shiftMonth(month, -1))}
                  scroll={false}
                  aria-label="Bulan sebelumnya"
                  aria-disabled={month <= first}
                  className={cx(btn.icon, month <= first && "pointer-events-none opacity-30")}
                >
                  <ChevronLeft size={18} />
                </Link>
                <h2 className="min-w-[10.5rem] text-center text-lg font-bold capitalize sm:text-xl">{monthLabel(month)}</h2>
                <Link
                  href={href(shiftMonth(month, 1))}
                  scroll={false}
                  aria-label="Bulan berikutnya"
                  aria-disabled={month >= last}
                  className={cx(btn.icon, month >= last && "pointer-events-none opacity-30")}
                >
                  <ChevronRight size={18} />
                </Link>
                {month !== thisMonth && thisMonth >= first && thisMonth <= last && (
                  <Link href={href(thisMonth)} scroll={false} className={cx(btn.sm, "ml-1")}>
                    <CalendarCheck size={15} /> Bulan ini
                  </Link>
                )}
              </div>
              <div className="w-full md:w-80">
                <PersonPicker
                  people={roster.map((r) => ({ absenNo: r.absenNo, name: r.name }))}
                  selected={focus ? { absenNo: focus.absenNo, name: focus.name } : null}
                  keep={{ bulan: month }}
                />
              </div>
            </div>

            {focus ? (
              <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-brand/40 bg-brand/[0.07] p-4 sm:flex-row sm:items-center sm:p-5">
                <Avatar name={focus.name} src={focus.image} size={48} />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">
                    {focus.name} <span className="font-normal text-muted">· absen {focus.absenNo}</span>
                  </p>
                  <p className="text-sm text-muted">
                    {focusDays.length ? (
                      <>
                        Piket <strong className="text-fg">{focusDays.length}×</strong> di {monthLabel(month)}:{" "}
                        {focusDays.map((d) => shortDate(d.key)).join(", ")}
                      </>
                    ) : (
                      `Tidak ada giliran di ${monthLabel(month)}.`
                    )}
                  </p>
                </div>
                {focusNext && (
                  <span className="rounded-xl bg-surface px-3 py-2 text-sm">
                    <span className="block text-xs text-faint">Giliran terdekat</span>
                    <span className="font-semibold">{focusNext.key === todayKey ? "Hari ini" : shortDate(focusNext.key)}</span>
                  </span>
                )}
              </div>
            ) : (
              <p className="mt-4 text-sm text-muted">
                {monthDuties.length} hari piket bulan ini. Cari nama untuk menyorot giliran seseorang.
                {!usesSchedule && " Jadwal kuliah belum diisi, jadi Senin–Jumat dianggap hari kuliah."}
              </p>
            )}

            <div
              className="mt-6 hidden gap-3 px-1 text-xs font-semibold uppercase tracking-wider text-faint sm:grid"
              style={{ gridTemplateColumns: `repeat(${cols.length}, minmax(0, 1fr))` }}
            >
              {cols.map((d) => (
                <span key={d}>{WEEKDAY_LABEL[d]}</span>
              ))}
            </div>

            {month === startKey.slice(0, 7) && Number(startKey.slice(8, 10)) > 7 && (
              <p className="mt-4 rounded-lg border border-dashed border-line-strong px-4 py-2.5 text-sm text-muted">
                Piket bergilir dimulai {shortDate(startKey)}. Minggu sebelumnya tidak ditampilkan.
              </p>
            )}

            <div className="mt-3 grid gap-5 sm:mt-2 sm:gap-3">
              {weeks.map((w, wi) => (
                <section key={wi} aria-label={`Minggu ${w.label}`}>
                  <p className="mb-2 font-mono text-[11px] text-faint sm:hidden">Minggu · {w.label}</p>
                  <div className="grid gap-2 sm:gap-3 sm:[grid-template-columns:var(--cols)]" style={{ ["--cols" as string]: `repeat(${cols.length}, minmax(0, 1fr))` }}>
                    {w.cells.map((c) => (
                      <DayCell key={c.key} cell={c} todayKey={todayKey} startKey={startKey} focus={focus?.absenNo ?? null} />
                    ))}
                  </div>
                </section>
              ))}
            </div>

            <p className="mt-6 text-xs text-faint">
              Hari tanpa kuliah dan hari libur di Agenda tidak dihitung. Tersedia {monthLabel(first)} – {monthLabel(last)}.
            </p>
          </>
        )}
      </section>
    </>
  );
}

function DayCell({ cell, todayKey, startKey, focus }: { cell: Cell; todayKey: string; startKey: string; focus: number | null }) {
  const { key, day, inMonth } = cell;
  if (!inMonth) return <div aria-hidden className="hidden rounded-xl border border-dashed border-line/60 sm:block" />;

  const isToday = key === todayKey;
  const person = day?.person ?? null;
  const mine = focus !== null && person?.absenNo === focus;
  const dim = focus !== null && !mine;
  const past = key < todayKey;
  const label = keyToDate(key).toLocaleDateString("id-ID", { weekday: "short", day: "numeric", timeZone: "Asia/Jakarta" });

  return (
    <div
      className={cx(
        "flex min-h-0 items-center gap-3 rounded-xl border p-3 transition sm:min-h-[8.5rem] sm:flex-col sm:items-stretch sm:gap-2",
        mine ? "border-brand bg-brand/10 shadow-[0_0_0_1px_var(--color-brand)]" : isToday ? "border-brand/60 bg-surface" : "border-line bg-surface",
        dim && "opacity-35",
        past && !isToday && !mine && !dim && "opacity-60"
      )}
    >
      <div className="flex w-14 flex-none flex-col sm:w-auto sm:flex-row sm:items-center sm:justify-between">
        <span className={cx("text-xs font-semibold capitalize", isToday ? "text-brand" : "text-muted")}>{label}</span>
        {isToday && <span className="mt-0.5 w-fit rounded-full bg-brand px-1.5 text-[10px] font-bold text-ink sm:mt-0">HARI INI</span>}
      </div>

      {person ? (
        <>
          <div className="flex min-w-0 flex-1 items-center gap-2.5 sm:flex-none">
            <span
              className={cx(
                "flex h-9 min-w-9 flex-none items-center justify-center rounded-lg px-1.5 font-display text-lg font-extrabold tabular-nums",
                mine || isToday ? "bg-brand text-ink" : "bg-surface-3 text-fg"
              )}
            >
              {person.absenNo}
            </span>
            <span className="line-clamp-2 min-w-0 text-sm font-semibold leading-snug">{person.name}</span>
          </div>
          {day!.courses.length > 0 && (
            <p className="hidden truncate text-[11px] text-faint sm:mt-auto sm:block">{day!.courses.map((c) => c.subject).join(" · ")}</p>
          )}
        </>
      ) : (
        <span className="flex-1 text-sm text-faint sm:flex sm:items-center">
          {day?.holiday ? `Libur · ${day.holiday}` : key < startKey ? "Belum mulai" : "Tidak ada kuliah"}
        </span>
      )}
    </div>
  );
}
