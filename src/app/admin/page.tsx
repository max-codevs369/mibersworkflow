import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  Images,
  Megaphone,
  Plus,
  ShieldAlert,
  StickyNote,
  Users,
  MessagesSquare,
  Flag,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { AUDIT_LABEL } from "@/lib/audit";
import { longDate, relativeTime, weekdayName, dayMonth } from "@/lib/format";
import { publicWhere } from "@/lib/announcements";
import { Avatar } from "@/components/ui/bits";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { memberWhere } from "@/lib/members";
import { btn, card, cx } from "@/lib/ui";

export default async function AdminDashboard({ searchParams }: { searchParams: Promise<{ akses?: string }> }) {
  const session = await requireAdmin();
  const denied = (await searchParams).akses === "ditolak";
  const now = new Date();

  const [
    pendingNotes,
    pendingMedia,
    reported,
    members,
    liveAnnouncements,
    albums,
    posts,
    events,
    logs,
    recentNotes,
  ] = await Promise.all([
    prisma.note.count({ where: { status: "PENDING" } }),
    prisma.media.count({ where: { status: "PENDING" } }),
    prisma.note.count({ where: { status: "APPROVED", reports: { some: {} } } }),
    prisma.user.count({ where: memberWhere }),
    prisma.announcement.count({ where: publicWhere(now) }),
    prisma.album.count(),
    prisma.message.count({ where: { kind: "TEXT", createdAt: { gte: new Date(now.getTime() - 7 * 86400000) } } }),
    prisma.event.findMany({ where: { startAt: { gte: now } }, orderBy: { startAt: "asc" }, take: 4 }),
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { user: { select: { displayName: true, image: true } } },
    }),
    prisma.note.findMany({ where: { status: "PENDING" }, orderBy: { createdAt: "desc" }, take: 3 }),
  ]);

  const queue = [
    { label: "Catatan menunggu", value: pendingNotes, href: "/admin/dinding", icon: <StickyNote size={20} /> },
    { label: "Foto menunggu", value: pendingMedia, href: "/admin/galeri/moderasi", icon: <Images size={20} /> },
    { label: "Catatan dilaporkan", value: reported, href: "/admin/dinding?status=REPORTED", icon: <Flag size={20} /> },
  ];
  const stats = [
    { label: "Anggota (member)", value: members, icon: <Users size={18} /> },
    { label: "Pengumuman tayang", value: liveAnnouncements, icon: <Megaphone size={18} /> },
    { label: "Album", value: albums, icon: <Images size={18} /> },
    { label: "Pesan 7 hari", value: posts, icon: <MessagesSquare size={18} /> },
  ];
  const totalQueue = pendingNotes + pendingMedia + reported;
  const firstName = session.user.displayName;

  return (
    <div>
      {denied && (
        <p className="mb-6 flex items-center gap-2 rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm font-medium text-danger">
          <ShieldAlert size={18} /> Halaman itu khusus Super Admin.
        </p>
      )}

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Breadcrumbs items={[{ label: "Panel" }]} />
          <p className="eyebrow mt-4">
            {weekdayName(now)}, {dayMonth(now)}
          </p>
          <h1 className="mt-1 text-2xl font-bold sm:text-3xl">Halo, {firstName}</h1>
          <p className="mt-1 text-muted">
            {totalQueue > 0 ? `Ada ${totalQueue} hal yang perlu kamu cek hari ini.` : "Semua beres. Tidak ada antrean moderasi."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/pengumuman?baru=1" className={btn.primary}>
            <Plus size={18} /> Pengumuman
          </Link>
          <Link href="/admin/agenda" className={btn.secondary}>
            <CalendarDays size={18} /> Agenda
          </Link>
        </div>
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        {queue.map((q) => (
          <Link
            key={q.label}
            href={q.href}
            className={cx(
              "group flex items-center gap-4 rounded-2xl border p-5 transition hover:-translate-y-0.5",
              q.value > 0 ? "border-brand bg-brand text-ink" : "border-line bg-surface hover:border-line-strong"
            )}
          >
            <span
              className={cx(
                "flex h-11 w-11 flex-none items-center justify-center rounded-xl",
                q.value > 0 ? "bg-ink/10" : "bg-surface-3 text-muted"
              )}
            >
              {q.icon}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-display text-3xl font-bold leading-none">{q.value}</span>
              <span className={cx("mt-1 block text-sm", q.value > 0 ? "font-semibold" : "text-muted")}>{q.label}</span>
            </span>
            <ArrowRight size={18} className="opacity-50 transition group-hover:translate-x-1 group-hover:opacity-100" />
          </Link>
        ))}
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className={cx(card, "p-4")}>
            <dt className="flex items-center gap-2 text-sm text-muted">
              <span className="text-brand">{s.icon}</span>
              {s.label}
            </dt>
            <dd className="mt-1.5 font-display text-2xl font-bold">{s.value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className={cx(card, "p-5")}>
          <div className="flex items-center justify-between">
            <h2 className="font-bold">Catatan terbaru di antrean</h2>
            <Link href="/admin/dinding" className="text-sm font-semibold text-muted hover:text-brand">
              Moderasi
            </Link>
          </div>
          {recentNotes.length === 0 ? (
            <p className="mt-4 text-sm text-faint">Tidak ada catatan menunggu.</p>
          ) : (
            <ul className="mt-3 grid">
              {recentNotes.map((n) => (
                <li key={n.id} className="border-b border-line py-3 last:border-0">
                  <p className="prose-safe line-clamp-2 text-[15px] leading-snug">{n.content}</p>
                  <p className="mt-1 text-xs text-faint">
                    {n.isAnonymous ? "Anonim" : n.authorName} · {relativeTime(n.createdAt, now)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={cx(card, "p-5")}>
          <div className="flex items-center justify-between">
            <h2 className="font-bold">Acara mendatang</h2>
            <Link href="/admin/agenda" className="text-sm font-semibold text-muted hover:text-brand">
              Kelola
            </Link>
          </div>
          {events.length === 0 ? (
            <p className="mt-4 text-sm text-faint">Belum ada acara terjadwal.</p>
          ) : (
            <ul className="mt-3 grid">
              {events.map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-3 border-b border-line py-3 last:border-0">
                  <span className="truncate font-medium">{e.title}</span>
                  <span className="flex-none text-sm text-muted">{longDate(e.startAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={cx(card, "p-5 lg:col-span-2")}>
          <div className="flex items-center justify-between">
            <h2 className="font-bold">Aktivitas pengurus</h2>
            {session.user.role === "SUPER_ADMIN" && (
              <Link href="/admin/log" className="text-sm font-semibold text-muted hover:text-brand">
                Semua log
              </Link>
            )}
          </div>
          {logs.length === 0 ? (
            <p className="mt-4 text-sm text-faint">Belum ada aktivitas.</p>
          ) : (
            <ul className="mt-3 grid">
              {logs.map((l) => (
                <li key={l.id} className="flex items-center gap-3 border-b border-line py-2.5 last:border-0">
                  <Avatar name={l.user?.displayName ?? "Sistem"} src={l.user?.image} size={30} />
                  <p className="min-w-0 flex-1 text-sm">
                    <span className="font-semibold">{l.user?.displayName ?? "Sistem"}</span>{" "}
                    <span className="text-muted">{AUDIT_LABEL[l.action] ?? l.action}</span>
                  </p>
                  <span className="flex-none text-xs text-faint">{relativeTime(l.createdAt, now)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
