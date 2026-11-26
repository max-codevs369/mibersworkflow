import { CalendarDays, MapPin, Pencil, Plus, Trash2 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import AdminHeader, { FilterTabs } from "@/components/admin/AdminHeader";
import FormDialog from "@/components/ui/FormDialog";
import ConfirmButton from "@/components/ui/ConfirmButton";
import { Field, Row, SelectInput, TextArea, TextInput } from "@/components/ui/Fields";
import { EmptyState } from "@/components/ui/bits";
import { dayOf, longDate, monthOf, timeOf, toInputDateTime } from "@/lib/format";
import { EVENT_TYPE_LABEL, EVENT_TYPE_TONE, type EventTypeKey } from "@/lib/labels";
import { badge, btn, card, cx } from "@/lib/ui";
import { buildMonth, isDayKey, isMonthKey } from "@/lib/calendar";
import { dateKey } from "@/lib/piket";
import MonthCalendar from "@/components/calendar/MonthCalendar";
import DayDetail from "@/components/calendar/DayDetail";
import { createEvent, deleteEvent, updateEvent } from "./actions";

export const metadata = { title: "Agenda" };

type EventInit = {
  title: string;
  description: string | null;
  location: string | null;
  type: string;
  startAt: Date;
  endAt: Date | null;
};

function EventFields({ e, day }: { e?: EventInit; day?: string }) {
  return (
    <>
      <Field label="Nama acara">
        <TextInput name="title" required maxLength={120} defaultValue={e?.title} placeholder="Ujian Tengah Semester" />
      </Field>
      <Row>
        <Field label="Jenis">
          <SelectInput
            name="type"
            defaultValue={e?.type ?? "ACTIVITY"}
            options={Object.entries(EVENT_TYPE_LABEL).map(([value, label]) => ({ value, label }))}
          />
        </Field>
        <Field label="Lokasi (opsional)">
          <TextInput name="location" maxLength={120} defaultValue={e?.location ?? ""} placeholder="Aula sekolah" />
        </Field>
      </Row>
      <Row>
        <Field label="Mulai">
          <TextInput
            name="startAt"
            type="datetime-local"
            required
            defaultValue={e ? toInputDateTime(e.startAt) : day ? `${day}T08:00` : ""}
          />
        </Field>
        <Field label="Selesai (opsional)">
          <TextInput name="endAt" type="datetime-local" defaultValue={toInputDateTime(e?.endAt ?? null)} />
        </Field>
      </Row>
      <Field label="Keterangan (opsional)">
        <TextArea name="description" rows={4} maxLength={2000} defaultValue={e?.description ?? ""} />
      </Field>
      <p className="text-xs text-faint">Anggota otomatis diberi notifikasi saat acara dibuat atau waktunya berubah, plus pengingat H-1.</p>
    </>
  );
}

export default async function AdminAgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ tampil?: string; bulan?: string; tanggal?: string }>;
}) {
  await requireAdmin();
  const sp = await searchParams;
  const showPast = sp.tampil === "lalu";
  const todayKey = dateKey(new Date());
  const month = isMonthKey(sp.bulan) ? sp.bulan! : isDayKey(sp.tanggal) ? sp.tanggal!.slice(0, 7) : todayKey.slice(0, 7);
  const cal = await buildMonth(month);
  const selectedKey =
    isDayKey(sp.tanggal) && cal.days.some((d) => d.key === sp.tanggal && d.inMonth)
      ? sp.tanggal!
      : cal.days.find((d) => d.isToday && d.inMonth)?.key ?? `${month}-01`;
  const selectedDay = cal.days.find((d) => d.key === selectedKey)!;
  const calHref = (p: { bulan?: string; tanggal?: string }) => {
    const qs = new URLSearchParams();
    if (showPast) qs.set("tampil", "lalu");
    qs.set("bulan", p.bulan ?? month);
    if (p.tanggal) qs.set("tanggal", p.tanggal);
    return `/admin/agenda?${qs.toString()}`;
  };
  const eventActions = (id: string) => {
    const e = selectedDay.events.find((x) => x.id === id);
    if (!e) return null;
    return (
      <span className="flex flex-none gap-1">
        <FormDialog
          title="Ubah acara"
          trigger={<Pencil size={14} />}
          triggerLabel="Ubah"
          triggerClassName="flex h-8 w-8 items-center justify-center rounded-md text-muted hover:bg-surface-3 hover:text-fg"
          action={updateEvent.bind(null, e.id)}
        >
          <EventFields e={e} />
        </FormDialog>
        <ConfirmButton
          action={deleteEvent.bind(null, e.id)}
          title="Hapus acara?"
          description={<>“{e.title}” akan dihapus dari agenda.</>}
          confirmLabel="Hapus"
          ariaLabel="Hapus"
          className="flex h-8 w-8 items-center justify-center rounded-md text-muted hover:bg-surface-3 hover:text-danger"
        >
          <Trash2 size={14} />
        </ConfirmButton>
      </span>
    );
  };
  const now = new Date();
  const events = await prisma.event.findMany({
    where: showPast
      ? { startAt: { lt: now }, OR: [{ endAt: null }, { endAt: { lt: now } }] }
      : { OR: [{ startAt: { gte: now } }, { endAt: { gte: now } }] },
    orderBy: { startAt: showPast ? "desc" : "asc" },
    take: 200,
  });

  return (
    <div>
      <AdminHeader title="Agenda" description="Ujian, kegiatan, ulang tahun, dan hari libur yang tampil di halaman Agenda.">
        <FormDialog
          title="Tambah acara"
          trigger={
            <>
              <Plus size={18} /> Tambah acara
            </>
          }
          action={createEvent}
        >
          <EventFields />
        </FormDialog>
      </AdminHeader>

      <div className="mb-8 grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <MonthCalendar month={month} weeks={cal.weeks} selected={selectedKey} todayKey={todayKey} href={calHref} />
        <div className="grid content-start gap-3 xl:sticky xl:top-6">
          <DayDetail day={selectedDay} todayKey={todayKey} actions={eventActions} />
          <FormDialog
            title="Tambah acara"
            trigger={
              <>
                <Plus size={16} /> Tambah acara di tanggal ini
              </>
            }
            triggerClassName={cx(btn.secondary, "w-full")}
            action={createEvent}
          >
            <EventFields day={selectedKey} />
          </FormDialog>
        </div>
      </div>

      <h2 className="mb-3 text-lg font-bold">Daftar acara</h2>
      <FilterTabs
        active={showPast ? "past" : "next"}
        tabs={[
          { key: "next", label: "Akan datang", href: "/admin/agenda" },
          { key: "past", label: "Sudah lewat", href: "/admin/agenda?tampil=lalu" },
        ]}
      />

      {events.length === 0 ? (
        <EmptyState icon={<CalendarDays size={32} />} title={showPast ? "Belum ada acara lampau" : "Belum ada acara mendatang"} />
      ) : (
        <div className={cx(card, "divide-y divide-line")}>
          {events.map((e) => (
            <div key={e.id} className="flex items-center gap-4 p-4 sm:p-5">
              <div className="flex h-14 w-12 flex-none flex-col items-center justify-center rounded-xl bg-surface-3">
                <span className="font-display text-xl font-bold leading-none">{dayOf(e.startAt)}</span>
                <span className="text-[10px] font-bold text-brand">{monthOf(e.startAt)}</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={cx(badge, EVENT_TYPE_TONE[e.type as EventTypeKey])}>
                    {EVENT_TYPE_LABEL[e.type as EventTypeKey].toUpperCase()}
                  </span>
                  <p className="font-semibold">{e.title}</p>
                </div>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-sm text-muted">
                  <span>
                    {longDate(e.startAt)}, {timeOf(e.startAt)}
                  </span>
                  {e.location && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin size={13} /> {e.location}
                    </span>
                  )}
                </p>
              </div>
              <div className="flex flex-none gap-1.5">
                <FormDialog
                  title="Ubah acara"
                  trigger={<Pencil size={17} />}
                  triggerLabel="Ubah"
                  triggerClassName={btn.icon}
                  action={updateEvent.bind(null, e.id)}
                >
                  <EventFields e={e} />
                </FormDialog>
                <ConfirmButton
                  action={deleteEvent.bind(null, e.id)}
                  title="Hapus acara?"
                  description={<>“{e.title}” akan dihapus dari agenda.</>}
                  confirmLabel="Hapus"
                  ariaLabel="Hapus"
                  className={cx(btn.icon, "hover:border-danger hover:text-danger")}
                >
                  <Trash2 size={17} />
                </ConfirmButton>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
