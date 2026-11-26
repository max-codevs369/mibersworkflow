import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  ArrowLeft,
  ArrowRight,
  Brush,
  Cake,
  CalendarHeart,
  Camera,
  Lock,
  MessageCircle,
  Pencil,
  Phone,
  Sparkles,
  StickyNote,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { container } from "@/components/PageHeader";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import SafeImg from "@/components/ui/SafeImg";
import Reveal from "@/components/Reveal";
import NoteCard, { Clip } from "@/components/notes/NoteCard";
import { Avatar, avatarTone, InstagramIcon } from "@/components/ui/bits";
import { instagramHandle, instagramUrl, whatsappUrl } from "@/lib/people";
import { daysUntil } from "@/lib/format";
import { dateKey, keyToDate, nextDutyOf } from "@/lib/piket";
import { noteVisibleWhere } from "@/lib/notes";
import { ROLE_NAME, type RoleKey } from "@/lib/roles";
import { openDirect } from "@/app/(chat)/obrolan/actions";
import { btn, cx, readableTone } from "@/lib/ui";

export const dynamic = "force-dynamic";

const TZ = "Asia/Jakarta";
const BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const partOf = (d: Date, part: "day" | "month" | "year") => Number(d.toLocaleString("en-US", { timeZone: TZ, [part]: "numeric" }));

function nextBirthday(birthday: Date, now: Date) {
  const day = partOf(birthday, "day");
  const month = partOf(birthday, "month");
  let year = partOf(now, "year");
  let at = new Date(Date.UTC(year, month - 1, day, 5));
  if (daysUntil(at, now) < 0) {
    year += 1;
    at = new Date(Date.UTC(year, month - 1, day, 5));
  }
  return { day, month, days: daysUntil(at, now) };
}

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const u = await prisma.user.findFirst({
    where: { id: (await params).id, isActive: true },
    select: { name: true, profile: { select: { bio: true } } },
  });
  if (!u) return { title: "Anggota tidak ditemukan", robots: { index: false, follow: false } };
  const description = u.profile?.bio?.trim() || `Profil ${u.name}, anggota kelas Mibers Duo Anam.`;
  const url = `/anggota/${(await params).id}`;
  return {
    title: u.name,
    description,
    alternates: { canonical: url },
    openGraph: { type: "profile", title: u.name, description, url },
  };
}

export default async function MemberProfilePage({ params }: Params) {
  const { id } = await params;
  const session = await getSession();
  const now = new Date();

  const user = await prisma.user.findFirst({
    where: { id, isActive: true },
    select: {
      id: true,
      name: true,
      image: true,
      role: true,
      createdAt: true,
      profile: true,
      rosterEntry: { select: { absenNo: true } },
      orgMembers: {
        where: { period: { isActive: true } },
        select: { position: { select: { title: true } }, period: { select: { name: true } } },
      },
    },
  });
  if (!user) notFound();

  const albumScope = session ? {} : { visibility: "PUBLIC" as const };
  const absenNo = user.rosterEntry?.absenNo ?? null;
  const [noteCount, photoCount, photos, notes, roster, duty] = await Promise.all([
    prisma.note.count({ where: { ...noteVisibleWhere(now), authorId: id, isAnonymous: false } }),
    prisma.media.count({ where: { uploadedBy: id, status: "APPROVED", type: "PHOTO", album: albumScope } }),
    prisma.media.findMany({
      where: { uploadedBy: id, status: "APPROVED", type: "PHOTO", album: albumScope },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: { id: true, url: true, caption: true, album: { select: { slug: true, title: true } } },
    }),
    prisma.note.findMany({
      where: { ...noteVisibleWhere(now), authorId: id, isAnonymous: false },
      orderBy: { createdAt: "desc" },
      take: 3,
    }),
    prisma.user.findMany({
      where: { isActive: true, role: user.role === "MEMBER" ? "MEMBER" : { not: "MEMBER" } },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    absenNo ? nextDutyOf(user.id, dateKey(now)) : Promise.resolve(null),
  ]);

  const p = user.profile;
  const tone = avatarTone(user.name);
  const first = (p?.nickname || user.name).split(" ")[0];
  const me = session?.user.id === user.id;
  const ig = instagramUrl(p?.instagram);
  const wa = session ? whatsappUrl(p?.phone) : null;
  const bday = p?.birthday ? nextBirthday(p.birthday, now) : null;
  const org = user.orgMembers[0];
  const idx = roster.findIndex((r) => r.id === user.id);
  const prev = idx > 0 ? roster[idx - 1] : null;
  const next = idx >= 0 && idx < roster.length - 1 ? roster[idx + 1] : null;
  const joined = user.createdAt.toLocaleDateString("id-ID", { month: "long", year: "numeric", timeZone: TZ });

  const stats = [
    {
      icon: <Cake size={18} />,
      value: bday ? `${bday.day} ${BULAN[bday.month - 1]}` : "—",
      label: bday ? (bday.days === 0 ? "Ulang tahun hari ini! 🎉" : `ulang tahun ${bday.days} hari lagi`) : "ulang tahun belum diisi",
      highlight: bday?.days === 0,
    },
    { icon: <StickyNote size={18} />, value: String(noteCount), label: "catatan di dinding" },
    { icon: <Camera size={18} />, value: String(photoCount), label: "foto dibagikan" },
    { icon: <CalendarHeart size={18} />, value: joined, label: "bergabung sejak" },
  ];

  return (
    <div className={cx(container, "pt-5")}>
      <Breadcrumbs
        items={[
          { label: "Beranda", href: "/" },
          { label: "Tentang kami", href: "/tentang" },
          { label: "Anggota", href: "/tentang#anggota" },
          { label: user.name },
        ]}
      />

      <section className="relative mt-6 overflow-hidden rounded-2xl border border-line bg-surface">
        <div
          className="dotgrid relative h-32 sm:h-44"
          style={{ background: `radial-gradient(120% 140% at 0% 0%, ${tone}55, transparent 60%), radial-gradient(90% 120% at 100% 100%, ${tone}22, transparent 55%), var(--color-surface-2)` }}
        >
          <span
            aria-hidden
            className="pointer-events-none absolute -bottom-6 right-4 select-none font-display text-[5.5rem] font-extrabold leading-none tracking-tighter opacity-[0.08] sm:right-8 sm:text-[9rem]"
            style={{ color: tone }}
          >
            {first}
          </span>
        </div>

        <div className="relative px-5 pb-6 sm:px-8">
          <div className="-mt-14 flex flex-col gap-4 sm:-mt-16 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
              <div className="w-fit rounded-full p-1.5" style={{ background: `conic-gradient(from 200deg, ${tone}, transparent 40%, ${tone})` }}>
                <div className="rounded-full bg-surface p-1">
                  <Avatar name={user.name} src={user.image} size={112} />
                </div>
              </div>
              <div className="min-w-0 pb-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full px-2.5 py-0.5 text-xs font-semibold text-ink" style={{ background: tone }}>
                    {ROLE_NAME[user.role as RoleKey] ?? "Anggota"}
                  </span>
                  {org && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-brand/40 bg-brand/10 px-2.5 py-0.5 text-xs font-semibold text-brand">
                      <Sparkles size={12} /> {org.position.title}
                    </span>
                  )}
                  {p?.position && !org && (
                    <span className="rounded-full border border-line px-2.5 py-0.5 text-xs text-muted">{p.position}</span>
                  )}
                </div>
                <h1 className="prose-safe mt-2 text-3xl font-extrabold leading-tight sm:text-4xl">{user.name}</h1>
                {p?.nickname && <p className="mt-0.5 text-muted">dipanggil <span className="font-semibold text-fg">“{p.nickname}”</span></p>}
              </div>
            </div>

            <div className="flex flex-wrap gap-2 sm:pb-1">
              {me ? (
                <Link href="/akun" className={btn.primary}>
                  <Pencil size={17} /> Ubah profil
                </Link>
              ) : session ? (
                <form action={openDirect.bind(null, user.id)}>
                  <button type="submit" className={btn.primary}>
                    <MessageCircle size={17} /> Kirim pesan
                  </button>
                </form>
              ) : (
                <Link href={`/login?next=/anggota/${user.id}`} className={btn.secondary}>
                  <Lock size={16} /> Masuk untuk chat
                </Link>
              )}
              {ig && (
                <a href={ig} target="_blank" rel="noopener noreferrer" className={btn.secondary} aria-label={`Instagram ${instagramHandle(p?.instagram) ?? ""}`}>
                  <InstagramIcon size={17} /> <span className="hidden sm:inline">{instagramHandle(p?.instagram)}</span>
                </a>
              )}
              {wa && (
                <a href={wa} target="_blank" rel="noopener noreferrer" className={btn.secondary} aria-label="WhatsApp">
                  <Phone size={17} /> <span className="hidden sm:inline">WhatsApp</span>
                </a>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Reveal>
          <figure
            className="relative h-full rounded-2xl border border-line bg-surface-2 px-6 pb-6 pt-8"
            style={{ boxShadow: `inset 4px 0 0 ${tone}` }}
          >
            <Clip tone={tone} />
            <p className="eyebrow" style={{ color: readableTone(tone) }}>
              Tentang {first}
            </p>
            {p?.bio ? (
              <blockquote className="prose-safe mt-3 whitespace-pre-line text-lg leading-relaxed text-fg">{p.bio}</blockquote>
            ) : (
              <p className="mt-3 text-muted">
                {me ? "Kamu belum menulis bio. Ceritakan sedikit tentang dirimu lewat halaman Akun." : `${first} belum menulis apa-apa di sini.`}
              </p>
            )}
            {!session && p?.phone && (
              <p className="mt-5 flex items-center gap-2 text-xs text-faint">
                <Lock size={12} /> Kontak WhatsApp hanya terlihat oleh anggota yang sudah masuk.
              </p>
            )}
          </figure>
        </Reveal>

        <Reveal delay={0.05}>
          <dl className="grid h-full grid-cols-2 gap-3">
            {stats.map((s) => (
              <div
                key={s.label}
                className={cx(
                  "flex min-w-0 flex-col justify-between gap-3 rounded-2xl border p-3.5 sm:p-5",
                  s.highlight ? "border-brand bg-brand/10" : "border-line bg-surface"
                )}
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ background: `${tone}22`, color: readableTone(tone) }}>
                  {s.icon}
                </span>
                <div className="min-w-0">
                  <dd className="text-lg font-bold leading-tight [overflow-wrap:anywhere] sm:text-2xl">{s.value}</dd>
                  <dt className="mt-1 text-xs leading-snug text-muted sm:text-[13px]">{s.label}</dt>
                </div>
              </div>
            ))}
          </dl>
        </Reveal>
      </div>

      {(absenNo || org) && (
        <section className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3 rounded-2xl border border-line bg-surface p-4 sm:p-5">
          {absenNo && (
            <span className="flex items-center gap-3">
              <span
                className="flex h-11 min-w-11 items-center justify-center rounded-xl px-2 font-display text-xl font-extrabold text-ink"
                style={{ background: tone }}
              >
                {absenNo}
              </span>
              <span className="text-sm">
                <span className="block font-semibold">Nomor absen</span>
                <span className="block text-muted">urutan piket bergilir</span>
              </span>
            </span>
          )}
          {absenNo && (
            <span className="flex min-w-0 items-center gap-2 text-sm">
              <Brush size={17} className="flex-none text-brand" />
              {duty ? (
                <span className="min-w-0">
                  <span className="text-muted">Piket berikutnya </span>
                  <strong className="text-fg">
                    {duty.key === dateKey(now)
                      ? "hari ini"
                      : keyToDate(duty.key).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", timeZone: TZ })}
                  </strong>
                  {duty.courses.length > 0 && <span className="text-muted"> · {duty.courses.map((c) => c.subject).join(", ")}</span>}
                </span>
              ) : (
                <span className="text-muted">Belum ada giliran piket dalam waktu dekat</span>
              )}
            </span>
          )}
          {org && <span className="text-sm text-muted sm:ml-auto">Pengurus {org.period.name}</span>}
        </section>
      )}

      <section className="mt-12">
        <div className="mb-4 flex items-end justify-between gap-3">
          <h2 className="text-xl font-bold sm:text-2xl">Jepretan {first}</h2>
          {photoCount > photos.length && <span className="text-sm text-muted">{photos.length} dari {photoCount} foto</span>}
        </div>
        {photos.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line-strong px-5 py-10 text-center text-sm text-muted">
            Belum ada foto yang dibagikan ke galeri.
          </p>
        ) : (
          <div className="grid grid-flow-dense grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
            {photos.map((ph, i) => (
              <Link
                key={ph.id}
                href={`/kenangan/${ph.album.slug}`}
                className={cx(
                  "group relative block aspect-square overflow-hidden rounded-xl border border-line bg-surface-2",
                  i === 0 && photos.length > 2 && "col-span-2 row-span-2"
                )}
              >
                <SafeImg src={ph.url} alt={ph.caption ?? ph.album.title} className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]" />
                <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-ink/90 to-transparent px-3 pb-2 pt-8 text-xs text-fg opacity-0 transition group-hover:opacity-100">
                  {ph.album.title}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="mt-12">
        <h2 className="mb-4 text-xl font-bold sm:text-2xl">Catatan dari {first}</h2>
        {notes.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line-strong px-5 py-10 text-center text-sm text-muted">
            Belum ada catatan atas nama {first} di dinding.
          </p>
        ) : (
          <div className="grid gap-x-4 gap-y-8 pt-3 sm:grid-cols-2 lg:grid-cols-3">
            {notes.map((n) => (
              <NoteCard key={n.id} note={n} compact />
            ))}
          </div>
        )}
      </section>

      {(prev || next) && (
        <nav aria-label="Anggota lain" className="mt-14 grid gap-3 border-t border-line pt-6 sm:grid-cols-2">
          {prev ? (
            <Link href={`/anggota/${prev.id}`} className="group flex items-center gap-3 rounded-xl border border-line bg-surface p-4 transition hover:border-line-strong">
              <ArrowLeft size={18} className="text-muted transition group-hover:-translate-x-1" />
              <span className="min-w-0">
                <span className="block text-xs text-faint">Sebelumnya</span>
                <span className="block truncate font-medium">{prev.name}</span>
              </span>
            </Link>
          ) : (
            <span className="hidden sm:block" />
          )}
          {next && (
            <Link
              href={`/anggota/${next.id}`}
              className="group flex items-center justify-end gap-3 rounded-xl border border-line bg-surface p-4 text-right transition hover:border-line-strong"
            >
              <span className="min-w-0">
                <span className="block text-xs text-faint">Berikutnya</span>
                <span className="block truncate font-medium">{next.name}</span>
              </span>
              <ArrowRight size={18} className="text-muted transition group-hover:translate-x-1" />
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}
