import Link from "next/link";
import { Brush, CalendarClock, CheckCircle2, ClipboardPaste, GraduationCap, Pencil, Plus, Trash2 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSemesters, semesterRange, type SemesterInfo } from "@/lib/semesters";
import { requireAdmin } from "@/lib/session";
import AdminHeader from "@/components/admin/AdminHeader";
import FormDialog from "@/components/ui/FormDialog";
import ConfirmButton from "@/components/ui/ConfirmButton";
import { Field, Row, SelectInput, TextArea, TextInput } from "@/components/ui/Fields";
import ActionForm from "@/components/ui/ActionForm";
import WeekTimetable from "@/components/calendar/WeekTimetable";
import { getSettings } from "@/lib/settings";
import { dateKey, getPiketPlan, keyToDate } from "@/lib/piket";
import { WEEKDAYS, WEEKDAY_LABEL, todayWeekday, type WeekdayKey } from "@/lib/format";
import { badge, btn, card, cx, input, select } from "@/lib/ui";
import {
  activateSemester,
  createSemester,
  createSchedule,
  deleteSchedule,
  deleteSemester,
  importRoster,
  savePiketStart,
  saveRoster,
  updateSchedule,
  updateSemester,
} from "./actions";

export const metadata = { title: "Jadwal & Piket" };

type Sched = { day: string; startTime: string; endTime: string; subject: string; teacher: string | null; room: string | null };

function SemesterFields({ s, nextNumber }: { s?: SemesterInfo; nextNumber?: number }) {
  return (
    <>
      <Row>
        <Field label="Semester ke-">
          <TextInput name="number" type="number" min={1} max={14} required defaultValue={s?.number ?? nextNumber ?? 1} />
        </Field>
        <Field label="Nama (opsional)" hint="Kosongkan untuk “Semester N”.">
          <TextInput name="name" maxLength={40} defaultValue={s?.name ?? ""} placeholder="Semester Ganjil 2026/2027" />
        </Field>
      </Row>
      <Row>
        <Field label="Tanggal mulai (opsional)">
          <TextInput name="startDate" type="date" defaultValue={s?.startDate ?? ""} />
        </Field>
        <Field label="Tanggal selesai (opsional)">
          <TextInput name="endDate" type="date" defaultValue={s?.endDate ?? ""} />
        </Field>
      </Row>
      <p className="text-xs text-muted">
        Dengan tanggal, kalender & piket otomatis memakai jadwal semester ini di rentang tersebut. Tanpa tanggal, jadwal semester aktif
        dipakai untuk semua hari.
      </p>
    </>
  );
}

function ScheduleFields({ s, day, semesterId }: { s?: Sched; day?: WeekdayKey; semesterId: string }) {
  return (
    <>
      <input type="hidden" name="semesterId" value={semesterId} />
      <Field label="Hari">
        <SelectInput
          name="day"
          defaultValue={s?.day ?? day ?? "MONDAY"}
          options={WEEKDAYS.map((d) => ({ value: d, label: WEEKDAY_LABEL[d] }))}
        />
      </Field>
      <Row>
        <Field label="Jam mulai">
          <TextInput name="startTime" type="time" required defaultValue={s?.startTime ?? "07:00"} />
        </Field>
        <Field label="Jam selesai">
          <TextInput name="endTime" type="time" required defaultValue={s?.endTime ?? "08:30"} />
        </Field>
      </Row>
      <Field label="Mata kuliah">
        <TextInput name="subject" required maxLength={80} defaultValue={s?.subject} placeholder="Matematika Terapan" />
      </Field>
      <Row>
        <Field label="Dosen (opsional)">
          <TextInput name="teacher" maxLength={80} defaultValue={s?.teacher ?? ""} />
        </Field>
        <Field label="Ruangan (opsional)">
          <TextInput name="room" maxLength={40} defaultValue={s?.room ?? ""} />
        </Field>
      </Row>
    </>
  );
}

export default async function AdminSchedulePage({ searchParams }: { searchParams: Promise<{ semester?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const todayKey = dateKey(new Date());
  const semesters = await getSemesters();
  const current = semesters.find((s) => s.id === sp.semester) ?? semesters.find((s) => s.isActive) ?? semesters[0] ?? null;
  const nextNumber = (semesters.at(-1)?.number ?? 0) + 1;
  const [schedule, users, settings, { plan, roster }] = await Promise.all([
    current ? prisma.schedule.findMany({ where: { semesterId: current.id }, orderBy: { startTime: "asc" } }) : Promise.resolve([]),
    prisma.user.findMany({ where: { isActive: true }, orderBy: { displayName: "asc" }, select: { id: true, displayName: true } }),
    getSettings(),
    getPiketPlan(todayKey, 21),
  ]);
  const today = todayWeekday();
  const numbered = roster.length;
  const linked = roster.filter((r) => r.userId).length;
  const rosterText = roster.map((r) => `${r.absenNo}. ${r.name}`).join("\n");
  const upcoming = plan.filter((d) => d.duty).slice(0, 10);
  const fmt = (k: string) =>
    keyToDate(k).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "short", timeZone: "Asia/Jakarta" });

  return (
    <div>
      <AdminHeader title="Jadwal & piket" description="Jadwal kuliah per semester dan piket bergilir sesuai nomor absen.">
        {current && (
          <FormDialog
            title={`Tambah jadwal · ${current.name}`}
            trigger={
              <>
                <Plus size={18} /> Jadwal kuliah
              </>
            }
            action={createSchedule}
          >
            <ScheduleFields day={today} semesterId={current.id} />
          </FormDialog>
        )}
      </AdminHeader>

      <section className={cx(card, "mb-5 p-4 sm:p-5")}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 font-bold">
            <GraduationCap size={18} className="text-brand" /> Semester
          </h2>
          <FormDialog
            title="Tambah semester"
            description="Jadwal semester baru bisa diisi kapan saja, lalu diaktifkan saat perkuliahan dimulai."
            trigger={
              <>
                <Plus size={15} /> Semester
              </>
            }
            triggerClassName={btn.sm}
            action={createSemester}
          >
            <SemesterFields nextNumber={nextNumber} />
          </FormDialog>
        </div>

        <nav aria-label="Pilih semester" className="-mx-1 mt-3 flex gap-1.5 overflow-x-auto px-1 pb-1">
          {semesters.map((s) => (
            <Link
              key={s.id}
              href={`/admin/jadwal?semester=${s.id}`}
              aria-current={s.id === current?.id ? "page" : undefined}
              className={cx(
                "flex flex-none items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition",
                s.id === current?.id ? "border-brand bg-brand/10 text-brand" : "border-line text-muted hover:border-line-strong hover:text-fg"
              )}
            >
              {s.name}
              {s.isActive && <span className="rounded bg-brand px-1 text-[10px] font-bold text-ink">AKTIF</span>}
              <span className="font-mono text-[11px] text-faint">{s.scheduleCount}</span>
            </Link>
          ))}
        </nav>

        {current && (
          <div className="mt-3 flex flex-col gap-3 border-t border-line pt-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted">
              <strong className="text-fg">{current.name}</strong> · {semesterRange(current)} · {current.scheduleCount} jadwal
            </p>
            <div className="flex flex-wrap gap-2">
              <FormDialog
                title={`Ubah ${current.name}`}
                trigger={
                  <>
                    <Pencil size={14} /> Ubah
                  </>
                }
                triggerClassName={btn.sm}
                action={updateSemester.bind(null, current.id)}
              >
                <SemesterFields s={current} />
              </FormDialog>
              {!current.isActive && (
                <ConfirmButton
                  action={activateSemester.bind(null, current.id)}
                  title={`Aktifkan ${current.name}?`}
                  description="Jadwal semester ini akan tampil di Agenda dan beranda. Anggota mendapat notifikasi."
                  confirmLabel="Aktifkan"
                  tone="primary"
                  className={btn.smPrimary}
                >
                  <CheckCircle2 size={14} /> Jadikan aktif
                </ConfirmButton>
              )}
              {!current.isActive && (
                <ConfirmButton
                  action={deleteSemester.bind(null, current.id)}
                  title={`Hapus ${current.name}?`}
                  description={`${current.scheduleCount} jadwal kuliah di semester ini ikut terhapus.`}
                  confirmLabel="Hapus"
                  className={btn.smDanger}
                >
                  <Trash2 size={14} /> Hapus
                </ConfirmButton>
              )}
            </div>
          </div>
        )}
      </section>

      {!current ? (
        <div className="rounded-2xl border border-dashed border-line-strong px-6 py-12 text-center">
          <p className="font-semibold">Belum ada semester</p>
          <p className="mt-1 text-sm text-muted">Tambahkan semester dulu lewat tombol “Semester” di atas.</p>
        </div>
      ) : schedule.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line-strong px-6 py-12 text-center">
          <p className="font-semibold">Jadwal {current.name} belum diisi</p>
          <p className="mt-1 text-sm text-muted">
            Tambahkan mata kuliah lewat tombol “Jadwal kuliah” di atas. Selama kosong, Agenda menampilkan jadwal semester ini sebagai “belum
            diketahui”.
          </p>
        </div>
      ) : (
        <WeekTimetable
          slots={schedule}
          today={today}
          edit={(s) => (
            <span className="flex gap-0.5 rounded-md bg-surface/90 p-0.5 shadow">
              <FormDialog
                title="Ubah jadwal kuliah"
                trigger={<Pencil size={13} />}
                triggerLabel="Ubah"
                triggerClassName="flex h-7 w-7 items-center justify-center rounded text-muted hover:bg-surface-3 hover:text-fg"
                action={updateSchedule.bind(null, s.id)}
              >
                <ScheduleFields s={s} semesterId={current.id} />
              </FormDialog>
              <ConfirmButton
                action={deleteSchedule.bind(null, s.id)}
                title="Hapus jadwal kuliah?"
                description={<>{s.subject}, {WEEKDAY_LABEL[s.day as WeekdayKey]} {s.startTime}.</>}
                confirmLabel="Hapus"
                ariaLabel="Hapus"
                className="flex h-7 w-7 items-center justify-center rounded text-muted hover:bg-surface-3 hover:text-danger"
              >
                <Trash2 size={13} />
              </ConfirmButton>
            </span>
          )}
        />
      )}

      <section className="mt-10">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-bold">
              <Brush size={20} className="text-brand" /> Piket bergilir
            </h2>
            <p className="mt-1 text-sm text-muted">
              Satu orang per hari kuliah, bertugas mengambil absen kelas. Giliran maju sesuai nomor absen dan hanya dihitung di hari yang ada
              jadwal kuliahnya. Hari libur di Agenda otomatis dilewati.
            </p>
          </div>
          <span className={cx(badge, "bg-surface-3 text-muted")}>{numbered} DALAM ROTASI</span>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <section className={cx(card, "flex flex-col p-5")}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-bold">Daftar absen kelas</h3>
                <p className="mt-1 text-sm text-muted">
                  {numbered} orang · {linked} tertaut ke akun. Tautkan akun agar foto dan profilnya ikut tampil.
                </p>
              </div>
              <FormDialog
                title="Tempel daftar absen"
                description="Satu nama per baris, boleh diawali nomor seperti “1. Gani Gustio”. Daftar lama akan diganti."
                trigger={
                  <>
                    <ClipboardPaste size={15} /> Tempel daftar
                  </>
                }
                triggerClassName={btn.sm}
                action={importRoster}
                submitLabel="Ganti daftar"
                size="lg"
              >
                <TextArea name="roster" rows={16} defaultValue={rosterText} placeholder={"1. Gani Gustio\n2. Aisyah\n3. ..."} />
              </FormDialog>
            </div>
            {roster.length === 0 ? (
              <p className="mt-4 rounded-lg border border-dashed border-line-strong p-6 text-center text-sm text-muted">
                Belum ada daftar absen. Tekan “Tempel daftar” lalu tempel nama-nama sesuai urutan absen.
              </p>
            ) : (
              <ActionForm action={saveRoster} submitLabel="Simpan daftar" className="mt-4">
                <ul className="max-h-[30rem] divide-y divide-line overflow-y-auto rounded-lg border border-line">
                  {roster.map((r) => (
                    <li key={r.id} className="grid grid-cols-[2.25rem_1fr] items-center gap-x-3 gap-y-2 px-3 py-2.5 sm:grid-cols-[2.25rem_1fr_1fr]">
                      <span className="flex h-8 items-center justify-center rounded-md bg-surface-3 font-mono text-sm font-semibold tabular-nums">
                        {r.absenNo}
                      </span>
                      <input
                        name={`name_${r.id}`}
                        defaultValue={r.name}
                        required
                        maxLength={80}
                        aria-label={`Nama absen ${r.absenNo}`}
                        className={cx(input, "h-9")}
                      />
                      <select
                        name={`user_${r.id}`}
                        defaultValue={r.userId ?? ""}
                        aria-label={`Akun untuk absen ${r.absenNo}`}
                        className={cx(select, "col-start-2 h-9 sm:col-start-auto")}
                      >
                        <option value="">Belum punya akun</option>
                        {users.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.displayName}
                          </option>
                        ))}
                      </select>
                    </li>
                  ))}
                </ul>
              </ActionForm>
            )}
          </section>

          <section className={cx(card, "flex flex-col p-5")}>
            <h3 className="flex items-center gap-2 font-bold">
              <CalendarClock size={18} className="text-brand" /> Titik mulai & giliran berikutnya
            </h3>
            <ActionForm action={savePiketStart} submitLabel="Simpan titik mulai" className="mt-4">
              <Row>
                <Field label="Tanggal mulai" hint="Hari ketika absen di samping bertugas.">
                  <TextInput name="startDate" type="date" required defaultValue={settings.piket_start_date} />
                </Field>
                <Field label="Nomor absen di hari itu">
                  <TextInput name="startAbsen" type="number" min={1} max={999} required defaultValue={settings.piket_start_absen} />
                </Field>
              </Row>
            </ActionForm>

            <div className="mt-6 border-t border-line pt-5">
              <p className="text-sm font-semibold text-muted">10 hari kuliah ke depan</p>
              {numbered === 0 ? (
                <p className="mt-3 text-sm text-faint">Isi nomor absen dulu agar giliran bisa dihitung.</p>
              ) : (
                <ol className="mt-3 grid gap-1">
                  {upcoming.map((d) => (
                    <li
                      key={d.key}
                      className={cx(
                        "flex items-center gap-3 rounded-lg px-3 py-2",
                        d.key === todayKey ? "bg-brand/10 ring-1 ring-brand/40" : "bg-surface-2"
                      )}
                    >
                      <span className="w-36 flex-none text-sm">
                        {fmt(d.key)}
                        {d.key === todayKey && <span className="ml-1 text-xs font-semibold text-brand">· hari ini</span>}
                      </span>
                      {d.person && (
                        <>
                          <span className="flex h-6 min-w-6 flex-none items-center justify-center rounded-md bg-surface-3 px-1 font-mono text-xs tabular-nums">
                            {d.person.absenNo}
                          </span>
                          <span className="min-w-0 flex-1 truncate text-sm font-medium">{d.person.name}</span>
                        </>
                      )}
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}
