import Link from "next/link";
import { ArrowRight, BookOpen, Brush, CalendarDays, Lock } from "lucide-react";
import { prisma } from "@/lib/prisma";
import PageHeader, { container, SectionTitle } from "@/components/PageHeader";
import { Avatar, EmptyState } from "@/components/ui/bits";
import { todayWeekday } from "@/lib/format";
import { EVENT_TYPE_LABEL, EVENT_TYPE_TONE, type EventTypeKey } from "@/lib/labels";
import { SITE } from "@/lib/site";
import { addDays, dateKey, getPiketPlan, keyToDate } from "@/lib/piket";
import { buildMonth, eventTime, isDayKey, isMonthKey } from "@/lib/calendar";
import MonthCalendar from "@/components/calendar/MonthCalendar";
import DayDetail from "@/components/calendar/DayDetail";
import WeekTimetable from "@/components/calendar/WeekTimetable";
import { badge, btn, cx } from "@/lib/ui";
import FilterBar from "@/components/ui/FilterBar";
import { cleanQuery } from "@/lib/filters";
import type { Prisma } from "@/generated/prisma/client";
import { getSemesters, semesterRange, TOTAL_SEMESTERS } from "@/lib/semesters";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Agenda & Jadwal",
  description: "Agenda kegiatan, jadwal kuliah, dan tenggat tugas kelas Mibers Duo Anam.",
  alternates: { canonical: "/agenda" },
  openGraph: { title: "Agenda & Jadwal", description: "Agenda kegiatan, jadwal kuliah, dan tenggat tugas kelas Mibers Duo Anam.", url: "/agenda" },
};

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; kategori?: string; bulan?: string; tanggal?: string; semester?: string }>;
}) {
  const sp = await searchParams;
  const q = cleanQuery(sp.q);
  const kategori = typeof sp.kategori === "string" && Object.hasOwn(EVENT_TYPE_LABEL, sp.kategori) ? (sp.kategori as EventTypeKey) : null;
  const now = new Date();
  const today = todayWeekday(now);
  const todayKey = dateKey(now);

  const month = isMonthKey(sp.bulan) ? sp.bulan! : isDayKey(sp.tanggal) ? sp.tanggal!.slice(0, 7) : todayKey.slice(0, 7);
  const searchWhere: Prisma.EventWhereInput = q
    ? { OR: [{ title: { contains: q, mode: "insensitive" } }, { location: { contains: q, mode: "insensitive" } }] }
    : {};
  const filter: Prisma.EventWhereInput = { AND: [searchWhere, ...(kategori ? [{ type: kategori }] : [])] };

  const semesters = await getSemesters();
  const activeSemester = semesters.find((s) => s.isActive) ?? semesters.at(-1) ?? null;
  const shownSemester = semesters.find((s) => s.id === sp.semester) ?? activeSemester;

  const [{ weeks, days, monthEvents }, schedule, piketPlan, byType] = await Promise.all([
    buildMonth(month, filter),
    shownSemester
      ? prisma.schedule.findMany({
          where: { semesterId: shownSemester.id },
          orderBy: { startTime: "asc" },
          select: { id: true, day: true, startTime: true, endTime: true, subject: true, teacher: true, room: true },
        })
      : Promise.resolve([]),
    getPiketPlan(todayKey, 28),
    prisma.event.groupBy({ by: ["type"], where: searchWhere, _count: { _all: true } }),
  ]);

  const selectedKey =
    isDayKey(sp.tanggal) && days.some((d) => d.key === sp.tanggal && d.inMonth)
      ? sp.tanggal!
      : days.find((d) => d.isToday && d.inMonth)?.key ?? `${month}-01`;
  const selectedDay = days.find((d) => d.key === selectedKey)!;

  const calHref = (p: { bulan?: string; tanggal?: string }) => {
    const qs = new URLSearchParams();
    if (q) qs.set("q", q);
    if (kategori) qs.set("kategori", kategori);
    qs.set("bulan", p.bulan ?? month);
    if (p.tanggal) qs.set("tanggal", p.tanggal);
    return `/agenda?${qs.toString()}#kalender`;
  };

  const lastNumber = Math.max(TOTAL_SEMESTERS, ...semesters.map((s) => s.number));
  const semesterSlots = Array.from({ length: lastNumber }, (_, i) => ({
    number: i + 1,
    semester: semesters.find((s) => s.number === i + 1) ?? null,
  }));

  const dutyDays = piketPlan.plan.filter((d) => d.duty && d.person);
  const piketToday = piketPlan.plan[0];
  const nextDuties = dutyDays.filter((d) => d.key > todayKey).slice(0, 8);
  const soon = nextDuties.slice(0, 2);
  const later = nextDuties.slice(2, 8);
  const nextDayKey = addDays(todayKey, 1);
  const fmtShort = (k: string) =>
    keyToDate(k).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "short", timeZone: SITE.timezone });
  const fmtDay = (k: string) =>
    keyToDate(k).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", timeZone: SITE.timezone });
  const fmtRange = (s: Date, e: Date | null) => {
    const a = dateKey(s);
    const b = e ? dateKey(e) : a;
    const f = (k: string) => keyToDate(k).toLocaleDateString("id-ID", { day: "numeric", month: "short", timeZone: SITE.timezone });
    return a === b ? f(a) : `${f(a)} – ${f(b)}`;
  };

  return (
    <>
      <PageHeader
        crumbs={[{ label: "Kelas" }, { label: "Agenda & jadwal" }]}
        eyebrow="Kalender kelas"
        title="Agenda & jadwal"
        description="Kalender acara, libur, dan petugas piket, ditambah jadwal kuliah mingguan."
      >
        <a href="#jadwal" className={btn.sm}>Jadwal kuliah</a>
        <a href="#piket" className={btn.sm}>Piket</a>
      </PageHeader>

      <section id="kalender" className={cx(container, "scroll-mt-24 pt-8")}>
        <FilterBar
          path="/agenda"
          q={q}
          kategori={kategori}
          categories={Object.entries(EVENT_TYPE_LABEL).map(([value, label]) => ({ value, label, count: byType.find((g) => g.type === value)?._count._all ?? 0 }))}
          search={{ placeholder: "Cari acara atau lokasi", label: "Cari acara" }}
          total={monthEvents.length}
          noun="acara bulan ini"
        />

        <div className="mt-5 grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <MonthCalendar month={month} weeks={weeks} selected={selectedKey} todayKey={todayKey} href={calHref} />
          <div className="min-w-0 xl:sticky xl:top-24">
            <DayDetail day={selectedDay} todayKey={todayKey} />
          </div>
        </div>

        <div className="mt-8">
          <h3 className="mb-3 flex items-center gap-2 text-lg font-bold">
            <CalendarDays size={18} className="text-brand" /> Acara bulan ini
          </h3>
          {monthEvents.length === 0 ? (
            <EmptyState icon={<CalendarDays size={28} />} title={q || kategori ? "Tidak ada acara yang cocok" : "Tidak ada acara di bulan ini"}>
              {q || kategori ? "Coba kata kunci atau kategori lain." : "Geser kalender ke bulan lain untuk melihat acara."}
            </EmptyState>
          ) : (
            <ul className="grid grid-cols-1 gap-2 md:grid-cols-2">
              {monthEvents.map((e) => (
                <li key={e.id}>
                  <Link
                    href={calHref({ bulan: month, tanggal: dateKey(e.startAt) < `${month}-01` ? `${month}-01` : dateKey(e.startAt) })}
                    scroll={false}
                    className="flex items-center gap-3 rounded-xl border border-line bg-surface p-3 transition hover:border-line-strong"
                  >
                    <span className="w-[5.75rem] flex-none font-mono text-xs text-muted sm:w-[6.5rem]">{fmtRange(e.startAt, e.endAt)}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{e.title}</span>
                      <span className="block text-xs text-faint">{eventTime(e)}</span>
                    </span>
                    <span className={cx(badge, "hidden flex-none min-[400px]:inline-flex", EVENT_TYPE_TONE[e.type])}>{EVENT_TYPE_LABEL[e.type].toUpperCase()}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section id="jadwal" className={cx(container, "scroll-mt-24 pt-20")}>
        <SectionTitle
          kicker={shownSemester ? `Kalender mingguan · ${shownSemester.name}` : "Kalender mingguan"}
          title="Jadwal kuliah"
        />

        <ol aria-label="Periode semester" className="-mx-4 mb-5 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
          {semesterSlots.map((slot) => {
            const s = slot.semester;
            const isShown = !!s && s.id === shownSemester?.id;
            const status = !s
              ? "Belum diketahui"
              : s.isActive
                ? "Sedang berjalan"
                : s.scheduleCount === 0
                  ? "Belum diketahui"
                  : activeSemester && s.number < activeSemester.number
                    ? "Selesai"
                    : "Jadwal siap";
            const body = (
              <>
                <span className="flex items-center gap-1.5 text-sm font-bold">
                  {!s || s.scheduleCount === 0 ? <Lock size={12} className="text-faint" /> : null}
                  {s?.name ?? `Semester ${slot.number}`}
                </span>
                <span className={cx("mt-0.5 block text-[11px]", s?.isActive ? "font-semibold text-brand" : "text-faint")}>{status}</span>
              </>
            );
            const cls = cx(
              "block min-w-[8.5rem] flex-none rounded-xl border px-3.5 py-2.5 transition",
              isShown ? "border-brand bg-brand/10" : "border-line bg-surface",
              (!s || s.scheduleCount === 0) && !isShown && "border-dashed opacity-70"
            );
            return (
              <li key={slot.number} className="flex-none">
                {s && s.scheduleCount > 0 && !isShown ? (
                  <Link href={s.isActive ? "/agenda#jadwal" : `/agenda?semester=${s.id}#jadwal`} scroll={false} className={cx(cls, "hover:border-line-strong")}>
                    {body}
                  </Link>
                ) : (
                  <div className={cls} aria-current={isShown ? "true" : undefined}>
                    {body}
                  </div>
                )}
              </li>
            );
          })}
        </ol>

        {shownSemester && (
          <p className="mb-4 text-sm text-muted">
            {shownSemester.isActive ? "Semester berjalan" : "Menampilkan"} <strong className="text-fg">{shownSemester.name}</strong> ·{" "}
            {semesterRange(shownSemester)}
            {!shownSemester.isActive && activeSemester && (
              <>
                {" · "}
                <Link href="/agenda#jadwal" scroll={false} className="font-medium text-brand hover:underline">
                  Kembali ke {activeSemester.name}
                </Link>
              </>
            )}
          </p>
        )}

        {schedule.length === 0 ? (
          <EmptyState icon={<BookOpen size={32} />} title={shownSemester ? `Jadwal ${shownSemester.name} belum diketahui` : "Jadwal kuliah belum diisi"}>
            Pengurus bisa menambahkan mata kuliah lewat panel Jadwal & piket.
          </EmptyState>
        ) : (
          <WeekTimetable slots={schedule} today={shownSemester?.isActive ? today : null} />
        )}
      </section>

      <section id="piket" className={cx(container, "scroll-mt-24 pt-20")}>
        <SectionTitle kicker="Satu orang per hari kuliah · urut nomor absen" title="Piket bergilir" />
        {piketPlan.roster.length === 0 ? (
          <EmptyState icon={<Brush size={32} />} title="Urutan piket belum diatur">
            Pengurus perlu mengisi nomor absen anggota di panel Jadwal & piket.
          </EmptyState>
        ) : (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <div
              className={cx(
                "relative flex flex-col overflow-hidden rounded-2xl border p-5 sm:p-6",
                piketToday?.person ? "border-brand/50 bg-brand/[0.07]" : "border-line bg-surface"
              )}
            >
              <p className="font-mono text-xs uppercase tracking-wider text-brand">Hari ini · {fmtDay(todayKey)}</p>
              {piketToday?.person ? (
                <>
                  <div className="mt-4 flex items-center gap-4">
                    <Avatar name={piketToday.person.name} src={piketToday.person.image} size={64} />
                    <div className="min-w-0">
                      <p className="text-sm text-muted">Petugas piket</p>
                      <p className="truncate text-2xl font-extrabold leading-tight">{piketToday.person.name}</p>
                      <p className="mt-0.5 font-mono text-xs text-muted">absen {piketToday.person.absenNo} · ambil absen kelas</p>
                    </div>
                    <span
                      aria-hidden
                      className="pointer-events-none absolute -right-2 -top-4 select-none font-display text-[7rem] font-extrabold leading-none text-brand/10"
                    >
                      {piketToday.person.absenNo}
                    </span>
                  </div>
                  {piketToday.courses.length > 0 && (
                    <ul className="mt-5 grid gap-1.5 border-t border-line pt-4">
                      {piketToday.courses.map((c, i) => (
                        <li key={i} className="flex items-center gap-3 text-sm">
                          <span className="w-[5.5rem] flex-none font-mono text-xs text-faint sm:w-24">
                            {c.startTime}–{c.endTime}
                          </span>
                          <span className="min-w-0 flex-1 truncate font-medium">{c.subject}</span>
                          {c.room && <span className="flex-none text-xs text-muted">{c.room}</span>}
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              ) : (
                <div className="mt-4">
                  <p className="text-xl font-bold">{piketToday?.holiday ? `Libur: ${piketToday.holiday}` : "Tidak ada kuliah hari ini"}</p>
                  {nextDuties[0]?.person && (
                    <p className="mt-2 text-sm text-muted">
                      Piket berikutnya <strong className="text-fg">{fmtDay(nextDuties[0].key)}</strong> oleh{" "}
                      <strong className="text-fg">{nextDuties[0].person.name}</strong> (absen {nextDuties[0].person.absenNo}).
                    </p>
                  )}
                </div>
              )}

              {soon.length > 0 && (
                <div className="mt-auto pt-5">
                  <p className="border-t border-line pt-4 text-xs font-semibold uppercase tracking-wider text-faint">Selanjutnya</p>
                  <ol className="mt-2.5 grid gap-2 sm:grid-cols-2">
                    {soon.map((d, i) => (
                      <li key={d.key} className="flex min-w-0 items-center gap-3 rounded-xl bg-surface/70 px-3 py-2.5">
                        <Avatar name={d.person!.name} src={d.person!.image} size={34} />
                        <span className="min-w-0">
                          <span className="block text-xs text-muted">
                            {i === 0 && soon[0].key === nextDayKey ? "Besok" : fmtShort(d.key)} · absen {d.person!.absenNo}
                          </span>
                          <span className="block truncate text-sm font-semibold">{d.person!.name}</span>
                        </span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>

            <div className="flex flex-col rounded-2xl border border-line bg-surface p-5 sm:p-6">
              <p className="text-sm font-semibold text-muted">Giliran setelahnya</p>
              <ol className="mt-3 grid gap-1.5">
                {later.map((d) => (
                  <li key={d.key} className="flex items-center gap-3 rounded-xl bg-surface-2 px-3 py-2.5">
                    <span className="flex h-8 min-w-8 flex-none items-center justify-center rounded-lg bg-surface-3 px-1.5 font-mono text-sm font-semibold tabular-nums">
                      {d.person!.absenNo}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{d.person!.name}</span>
                      <span className="block truncate text-xs text-muted">
                        {fmtDay(d.key)}
                        {d.courses.length > 0 && ` · ${d.courses.map((c) => c.subject).join(", ")}`}
                      </span>
                    </span>
                  </li>
                ))}
              </ol>
              <details className="group mt-4">
                <summary className="cursor-pointer list-none text-sm font-medium text-muted hover:text-fg">
                  Lihat urutan absen ({piketPlan.roster.length} orang) <span className="inline-block transition group-open:rotate-180">⌄</span>
                </summary>
                <ol className="mt-3 flex flex-wrap gap-1.5">
                  {piketPlan.roster.map((p) => (
                    <li key={p.id} className="flex items-center gap-1.5 rounded-full bg-surface-2 py-1 pl-1 pr-3 text-xs">
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-surface-3 px-1 font-mono tabular-nums">
                        {p.absenNo}
                      </span>
                      {p.name.split(" ")[0]}
                    </li>
                  ))}
                </ol>
              </details>
              <div className="flex-1" />
              <Link
                href="/agenda/piket"
                className="mt-4 flex items-center justify-between rounded-xl border border-line px-4 py-3 text-sm font-semibold transition hover:border-brand hover:text-brand"
              >
                Jadwal piket lengkap (3 tahun) <ArrowRight size={16} />
              </Link>
              {!piketPlan.usesSchedule && (
                <p className="mt-4 text-xs text-faint">Jadwal kuliah belum diisi, jadi Senin sampai Jumat dianggap hari kuliah.</p>
              )}
            </div>
          </div>
        )}
      </section>
    </>
  );
}
