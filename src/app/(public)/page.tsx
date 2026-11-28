import Link from "next/link";
import { ArrowRight, ArrowUpRight, BookOpen, Brush, CalendarDays, CheckCheck, Clock, Images, Lock, MessagesSquare } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import Reveal from "@/components/Reveal";
import HeroVisual from "@/components/HeroVisual";
import TypeLine from "@/components/TypeLine";
import Slogan from "@/components/Slogan";
import NoteCard from "@/components/notes/NoteCard";
import SafeImg from "@/components/ui/SafeImg";
import { container, SectionTitle } from "@/components/PageHeader";
import AnnouncementBadges from "@/components/AnnouncementBadges";
import MaterialShelf from "@/components/MaterialShelf";
import { getSubjects } from "@/lib/subjects";
import { NOTE_TONE, noteVisibleWhere } from "@/lib/notes";
import { getSession } from "@/lib/session";
import { dateKey, getPiketPlan } from "@/lib/piket";
import { unreadByConversation } from "@/lib/conversations";
import { Avatar } from "@/components/ui/bits";
import GroupAvatar from "@/components/chat/GroupAvatar";
import { listTime } from "@/lib/chat";
import { CATEGORY_LABEL, publicWhere, isNew } from "@/lib/announcements";
import { memberWhere } from "@/lib/members";
import { clockNow, dayMonth, dayOf, daysUntil, monthOf, relativeTime, shortDate, weekdayName } from "@/lib/format";
import { btn, cx } from "@/lib/ui";
import { absoluteUrl, jsonLd, siteUrl } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata = { alternates: { canonical: "/" } };

export default async function HomePage() {
  const now = new Date();
  const [settings, session] = await Promise.all([getSettings(), getSession()]);

  const [
    members,
    photos,
    notesCount,
    annCount,
    daily,
    notes,
    heroMedia,
    piketPlan,
    nextEvent,
    announcements,
    albums,
    period,
    about,
    chatCount,
    chatToday,
    chats,
    materialGroups,
    latestMaterials,
    subjects,
  ] = await Promise.all([
    prisma.user.count({ where: memberWhere }),
    prisma.media.count({ where: { status: "APPROVED", album: { visibility: "PUBLIC" } } }),
    prisma.note.count({ where: noteVisibleWhere(now) }),
    prisma.announcement.count({ where: publicWhere(now) }),
    prisma.note.findFirst({ where: { ...noteVisibleWhere(now), type: "DAILY" }, orderBy: { createdAt: "desc" } }),
    prisma.note.findMany({
      where: noteVisibleWhere(now),
      orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
      take: 4,
    }),
    prisma.media.findMany({
      where: { featuredAt: { not: null }, status: "APPROVED", type: "PHOTO", album: { visibility: "PUBLIC" } },
      orderBy: { featuredAt: "asc" },
      take: 3,
      select: { url: true, caption: true, album: { select: { title: true } } },
    }),
    getPiketPlan(dateKey(now), 14),
    prisma.event.findFirst({
      where: { OR: [{ startAt: { gte: now } }, { endAt: { gte: now } }] },
      orderBy: { startAt: "asc" },
    }),
    prisma.announcement.findMany({
      where: publicWhere(now),
      orderBy: [{ isPinned: "desc" }, { publishedAt: "desc" }],
      take: 4,
    }),
    prisma.album.findMany({
      where: { visibility: "PUBLIC" },
      orderBy: [{ eventDate: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
      take: 5,
      include: {
        media: {
          where: { status: "APPROVED", type: "PHOTO" },
          take: 1,
          orderBy: { createdAt: "asc" },
          select: { url: true },
        },
        _count: { select: { media: { where: { status: "APPROVED" } } } },
      },
    }),
    prisma.organizationPeriod.findFirst({
      where: { isActive: true },
      select: { name: true, startYear: true, endYear: true, _count: { select: { members: true } } },
    }),
    prisma.aboutSection.findMany({ where: { isVisible: true }, orderBy: [{ sortOrder: "asc" }, { id: "asc" }] }),
    prisma.conversation.count({ where: { type: "GROUP" } }),
    prisma.message.count({ where: { kind: "TEXT", createdAt: { gte: new Date(now.getTime() - 86_400_000) } } }),
    session
      ? prisma.conversation.findMany({
          where: { members: { some: { userId: session.user.id } } },
          orderBy: { lastMessageAt: "desc" },
          take: 12,
          select: {
            id: true,
            type: true,
            title: true,
            imageUrl: true,
            lastMessageAt: true,
            members: { select: { clearedAt: true, user: { select: { id: true, displayName: true, image: true } } } },
            messages: {
              orderBy: { createdAt: "desc" },
              take: 1,
              select: { content: true, kind: true, deletedAt: true, createdAt: true, senderId: true, sender: { select: { displayName: true } } },
            },
          },
        })
      : Promise.resolve([]),

    prisma.material.groupBy({ by: ["subject"], _count: { _all: true } }),
    session
      ? prisma.material.findMany({
          orderBy: { createdAt: "desc" },
          take: 4,
          select: { id: true, title: true, fileUrl: true, category: true, subject: true, createdAt: true },
        })
      : Promise.resolve([]),
    getSubjects(),
  ]);

  const unreadMap = session ? await unreadByConversation(session.user.id) : new Map<string, number>();
  const clearedOf = (c: (typeof chats)[number]) => c.members.find((m) => m.user.id === session?.user.id)?.clearedAt ?? null;
  const recentChats = chats
    .filter((c) => {
      const cleared = clearedOf(c);
      return !(c.type === "DIRECT" && cleared && c.lastMessageAt <= cleared);
    })
    .slice(0, 4)
    .map((c) => {
    const other = c.type === "DIRECT" ? c.members.find((m) => m.user.id !== session?.user.id)?.user : undefined;
    const cleared = clearedOf(c);
    const raw = c.messages[0];
    const m = raw && (!cleared || raw.createdAt > cleared) ? raw : undefined;
    const mine = m?.senderId === session?.user.id;
    return {
      id: c.id,
      group: c.type === "GROUP",
      title: c.type === "GROUP" ? c.title ?? "Grup" : other?.displayName ?? "Obrolan",
      image: c.type === "GROUP" ? c.imageUrl : other?.image ?? null,
      at: c.lastMessageAt.toISOString(),
      unread: unreadMap.get(c.id) ?? 0,
      mine: !!m && mine && m.kind === "TEXT" && !m.deletedAt,
      text: !m
        ? "Belum ada pesan"
        : m.deletedAt
          ? "Pesan ini telah dihapus"
          : m.kind === "SYSTEM" || mine || c.type === "DIRECT"
            ? m.content.replace(/\s+/g, " ")
            : `${m.sender.displayName}: ${m.content.replace(/\s+/g, " ")}`,
    };
  });

  const piketToday = piketPlan.plan[0];

  const schedule = piketToday && !piketToday.holiday ? piketToday.courses : [];
  const piketNext = piketPlan.plan.slice(1).find((d) => d.person);
  const heroPhotos = [
    ...(settings.hero_image ? [{ url: settings.hero_image, caption: settings.site_short }] : []),
    ...heroMedia.map((m) => ({ url: m.url, caption: m.caption || m.album.title })),
  ].slice(0, 3);

  const [first, ...rest] = settings.site_name.split(" ");
  const year = settings.class_year || "2026";
  const typePhrases = [
    'echo "Politeknik!!!"',
    `cd ~/politeknik/${(settings.site_short || "mibers26").toLowerCase().replace(/\s+/g, "")}`,
    "cat slogan.txt",
    `git commit -m "kenangan baru ${year}"`,
    "npm run kuliah -- --semangat",
    "sudo apt install kopi-pagi",
    "while (kuliah) { belajar(); ngopi(); }",
    "git push origin wisuda",
    "ls ./tugas | grep deadline",
    "node praktikum.js --no-bug",
    "ping dosen-wali -c 1",
    `SELECT * FROM mahasiswa WHERE angkatan = ${year};`,
    "docker run -d kelas-kompak",
    "if (galau) ngobrol(teman);",
    "python3 skripsi.py --nanti-dulu",
    "git merge persahabatan --no-conflict",
    "rm -rf malas/",
    "curl -X POST /semangat --data 100%",
    "./piket.sh --hari-ini",
    "exit 0 // sampai jumpa besok!",
  ];
  const heroCode = `const kelas = {
  nama: "${settings.site_name}",
  angkatan: ${JSON.stringify(settings.class_year || "2026")},
  kampus: "${settings.school_name || "-"}",
  jurusan: "${settings.department || "-"}",
  anggota: ${members},
};

function hariIni(kelas) {
  if (kelas.ada("tugas")) kerjakan();
  return ["kuliah", "piket", "ngobrol"];
}

// We Are Family We Are MIB
// Sekali Mibers, selamanya keluarga
export default kelas;

for (const teman of kelas.anggota) {
  teman.semangat++;
}
`;
  const clock = clockNow(now);
  const nextClass = schedule.find((s) => s.endTime > clock);
  const eventDays = nextEvent ? daysUntil(nextEvent.startAt, now) : 0;
  const [lead, ...others] = about;
  const [featured, ...moreAnn] = announcements;

  const facts = [
    { k: "Kampus", v: settings.school_name },
    { k: "Jurusan", v: settings.department },
    { k: "Program studi", v: settings.study_program },
    { k: "Angkatan", v: settings.class_year },
    { k: "Anggota", v: `${members} mahasiswa` },
    { k: "Dosen wali", v: settings.homeroom },
  ].filter((f) => f.v);

  const ld = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${siteUrl()}/#website`,
        url: absoluteUrl("/"),
        name: settings.site_name,
        alternateName: settings.site_short,
        description: settings.site_description,
        inLanguage: "id-ID",
        publisher: { "@id": `${siteUrl()}/#org` },
      },
      {
        "@type": "Organization",
        "@id": `${siteUrl()}/#org`,
        name: settings.site_name,
        alternateName: settings.site_short,
        slogan: settings.site_tagline,
        url: absoluteUrl("/"),
        logo: absoluteUrl("/icon-512.png"),
        description: settings.site_description,
        ...(settings.instagram ? { sameAs: [settings.instagram] } : {}),
        ...(settings.contact_email ? { email: settings.contact_email } : {}),
        parentOrganization: { "@type": "CollegeOrUniversity", name: settings.school_name },
      },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(ld)} />
      <section className="relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute inset-y-0 right-[-4rem] hidden w-[46rem] select-none overflow-hidden opacity-[0.07] [mask-image:linear-gradient(to_left,black,transparent)] lg:block">
          <pre className="code-drift font-mono text-[13px] leading-6 text-fg">
            {[0, 1].map((k) => (
              <span key={k} className="block">
                {heroCode}
              </span>
            ))}
          </pre>
        </div>
      <div className={cx(container, "relative grid items-center gap-10 pb-12 pt-8 sm:pt-12 lg:grid-cols-[1.1fr_1fr] lg:gap-14 lg:pb-16")}>
        <div className="min-w-0">
          <div className="inline-flex max-w-full items-center rounded-lg border border-line bg-surface/80 px-3 py-1.5 backdrop-blur">
            <TypeLine phrases={typePhrases} prompt="~/mibers26 $" />
          </div>
          <h1 className="mt-5 text-[2.6rem] font-extrabold leading-[1.02] sm:text-6xl lg:text-7xl">
            {first}
            {rest.length > 0 && (
              <>
                <br />
                <span className="relative inline-block text-brand">
                  {rest.join(" ")}
                  <svg
                    aria-hidden
                    viewBox="0 0 300 24"
                    preserveAspectRatio="none"
                    className="pointer-events-none absolute -bottom-[0.14em] left-[-2%] h-[0.28em] w-[104%] overflow-visible text-brand"
                  >
                    <path
                      className="hero-stroke"
                      pathLength={1}
                      d="M3 15 C 50 6, 95 20, 145 12 S 245 5, 297 13"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="5"
                      strokeLinecap="round"
                    />
                    <path
                      className="hero-stroke hero-stroke-2"
                      pathLength={1}
                      d="M40 21 C 100 15, 170 22, 255 17"
                      fill="none"
                      stroke="currentColor"
                      strokeOpacity="0.45"
                      strokeWidth="3"
                      strokeLinecap="round"
                    />
                  </svg>
                  <svg
                    aria-hidden
                    viewBox="0 0 24 24"
                    className="hero-spark pointer-events-none absolute -right-[0.42em] -top-[0.12em] h-[0.38em] w-[0.38em] text-gold"
                  >
                    <path d="M12 0c.6 6.4 5 11 12 12-7 1-11.4 5.6-12 12-.6-6.4-5-11-12-12 7-1 11.4-5.6 12-12z" fill="currentColor" />
                  </svg>
                </span>
              </>
            )}
          </h1>
          <Slogan text={settings.site_tagline || "We Are Family We Are MIB"} className="mt-5" />
          <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.2em] text-faint">Sekali Mibers, selamanya keluarga</p>
          <p className="mt-4 max-w-lg text-base leading-relaxed text-muted sm:text-lg">{settings.site_description}</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/pengumuman" className={cx(btn.primary, "min-h-12 px-5")}>
              Lihat pengumuman <ArrowRight size={18} />
            </Link>
            <Link href="#tentang" className={cx(btn.secondary, "min-h-12 px-5")}>
              Kenali kelas kami
            </Link>
          </div>
          <dl className="mt-10 grid grid-cols-2 overflow-hidden rounded-xl border border-line sm:grid-cols-4">
            {[
              { n: members, l: "anggota" },
              { n: photos, l: "foto" },
              { n: notesCount, l: "catatan" },
              { n: annCount, l: "pengumuman" },
            ].map((s, i) => (
              <div
                key={s.l}
                className={cx(
                  "px-4 py-3.5",
                  i % 2 === 1 && "border-l border-line",
                  i >= 2 && "border-t border-line sm:border-t-0",
                  i === 2 && "sm:border-l"
                )}
              >
                <dd className="font-display text-2xl font-bold tabular-nums">{s.n}</dd>
                <dt className="text-[13px] text-muted">{s.l}</dt>
              </div>
            ))}
          </dl>
        </div>
        <div className="mx-auto w-full max-w-[520px]">
          <HeroVisual
            photos={heroPhotos}
            quote={daily?.content ?? "Datang pagi, pulang bawa cerita."}
            quoteBy={daily ? (daily.isAnonymous ? "Anonim" : daily.authorName) : "Pengurus kelas"}
            tone={daily ? NOTE_TONE[daily.color] : undefined}
          />
        </div>
      </div>
      </section>
      <section className={container} aria-labelledby="hari-ini">
        <div className="overflow-hidden rounded-xl border border-line bg-surface">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3 sm:px-5">
            <h2 id="hari-ini" className="flex items-center gap-2 font-sans text-sm font-semibold">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ok opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-ok" />
              </span>
              {weekdayName(now)}, {dayMonth(now)}
            </h2>
            <Link href="/agenda" className="inline-flex min-h-8 items-center gap-1 text-[13px] text-muted hover:text-fg">
              Jadwal lengkap <ArrowUpRight size={14} />
            </Link>
          </div>
          <dl className="grid sm:grid-cols-2 lg:grid-cols-4">
            <TodayCell icon={<BookOpen size={15} />} label="Kuliah berikutnya">
              {nextClass ? (
                <>
                  <span className="block truncate font-medium text-fg">{nextClass.subject}</span>
                  <span className="font-mono text-xs text-muted">
                    {nextClass.startTime}–{nextClass.endTime}
                    {nextClass.room ? ` · ${nextClass.room}` : ""}
                  </span>
                </>
              ) : (
                <span className="text-muted">{schedule.length ? "Kuliah hari ini selesai" : "Tidak ada kuliah"}</span>
              )}
            </TodayCell>
            <TodayCell icon={<Clock size={15} />} label="Total hari ini" className="border-t sm:border-l sm:border-t-0">
              <span className="block font-medium text-fg">{schedule.length} mata kuliah</span>
              {schedule[0] && (
                <span className="font-mono text-xs text-muted">
                  {schedule[0].startTime}–{schedule[schedule.length - 1].endTime}
                </span>
              )}
            </TodayCell>
            <TodayCell icon={<Brush size={15} />} label="Piket" className="border-t lg:border-l lg:border-t-0">
              {piketToday?.person ? (
                <>
                  <span className="block truncate font-medium text-fg">{piketToday.person.name}</span>
                  <span className="font-mono text-xs text-muted">absen {piketToday.person.absenNo} · ambil absen kelas</span>
                </>
              ) : piketNext?.person ? (
                <>
                  <span className="block truncate text-muted">{piketToday?.holiday ? `Libur: ${piketToday.holiday}` : "Tidak ada kuliah"}</span>
                  <span className="font-mono text-xs text-faint">
                    berikutnya {piketNext.person.name} · absen {piketNext.person.absenNo}
                  </span>
                </>
              ) : (
                <span className="text-muted">Belum diatur</span>
              )}
            </TodayCell>
            <TodayCell icon={<CalendarDays size={15} />} label="Acara berikutnya" className="border-t sm:border-l lg:border-t-0">
              {nextEvent ? (
                <>
                  <span className="block truncate font-medium text-fg">{nextEvent.title}</span>
                  <span className="font-mono text-xs text-brand">
                    {eventDays <= 0 ? "hari ini" : eventDays === 1 ? "besok" : `${eventDays} hari lagi`}
                  </span>
                </>
              ) : (
                <span className="text-muted">Belum ada</span>
              )}
            </TodayCell>
          </dl>
        </div>
      </section>
      <section id="tentang" className={cx(container, "scroll-mt-20 pt-20 sm:pt-24")}>
        <div className="grid gap-10 lg:grid-cols-[300px_1fr] lg:gap-14">
          <aside className="self-start lg:sticky lg:top-24">
            <p className="eyebrow">Tentang kami</p>
            <h2 className="mt-2 text-3xl font-bold">Siapa {settings.site_name}?</h2>
            {facts.length > 0 && (
              <dl className="mt-6 divide-y divide-line border-y border-line">
                {facts.map((f) => (
                  <div key={f.k} className="flex justify-between gap-4 py-2.5 text-sm">
                    <dt className="flex-none text-muted">{f.k}</dt>
                    <dd className="text-right font-medium text-fg">{f.v}</dd>
                  </div>
                ))}
              </dl>
            )}
            <Link href="/tentang" className="mt-5 inline-flex min-h-10 items-center gap-1 text-sm font-medium text-brand hover:underline">
              Profil lengkap & daftar anggota <ArrowUpRight size={15} />
            </Link>
          </aside>
          <div className="min-w-0">
            {!lead ? (
              <p className="rounded-xl border border-dashed border-line-strong p-6 text-muted">
                Profil kelas belum ditulis. Pengurus bisa mengisinya di Panel → Tentang kelas.
              </p>
            ) : (
              <>
                <Reveal>
                  <h3 className="font-sans text-sm font-semibold text-muted">{lead.title}</h3>
                  <p className="prose-safe mt-3 whitespace-pre-line text-lg leading-[1.8] text-fg sm:text-xl">{lead.content}</p>
                  {lead.imageUrl && (
                    <div className="mt-6 aspect-[16/8] overflow-hidden rounded-xl border border-line">
                      <SafeImg src={lead.imageUrl} alt={lead.title} width={960} className="h-full w-full object-cover" />
                    </div>
                  )}
                </Reveal>
                {others.length > 0 && (
                  <div className="mt-10 grid gap-4 sm:grid-cols-2">
                    {others.map((s, i) => (
                      <Reveal key={s.id} delay={(i % 2) * 0.06} className={cx(s.imageUrl && "sm:col-span-2")}>
                        <article
                          className={cx(
                            "h-full overflow-hidden rounded-xl border border-line bg-surface",
                            s.imageUrl && "md:grid md:grid-cols-2"
                          )}
                        >
                          {s.imageUrl && (
                            <div className={cx("aspect-video md:aspect-auto", i % 2 === 1 && "md:order-2")}>
                              <SafeImg src={s.imageUrl} alt={s.title} width={640} className="h-full w-full object-cover" />
                            </div>
                          )}
                          <div className="p-5 sm:p-6">
                            <p className="font-mono text-xs text-faint">{String(i + 2).padStart(2, "0")}</p>
                            <h3 className="mt-1 text-xl font-bold">{s.title}</h3>
                            <p className="prose-safe mt-2 whitespace-pre-line leading-relaxed text-muted">{s.content}</p>
                          </div>
                        </article>
                      </Reveal>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </section>
      <section className={cx(container, "pt-20 sm:pt-24")}>
        <SectionTitle kicker="Kabar terbaru" title="Pengumuman" href="/pengumuman" />
        {!featured ? (
          <p className="text-muted">Belum ada pengumuman.</p>
        ) : (
          <div className="grid gap-5 lg:grid-cols-2">
            <Reveal>
              <Link
                href={`/pengumuman/${featured.id}`}
                className={cx(
                  "group relative flex h-full min-h-[22rem] flex-col overflow-hidden rounded-2xl border bg-surface transition hover:border-line-strong",
                  featured.priority === "URGENT" ? "border-danger/60" : "border-line"
                )}
              >
                {featured.coverUrl && (
                  <>
                    <SafeImg src={featured.coverUrl} alt="" width={960} className="absolute inset-0 h-full w-full object-cover opacity-30 transition duration-700 group-hover:scale-[1.04] group-hover:opacity-40" />
                    <span className="absolute inset-0 bg-gradient-to-t from-surface via-surface/85 to-surface/30" />
                  </>
                )}
                <div className="relative flex items-start justify-between gap-4 p-5 sm:p-6">
                  <div className="flex overflow-hidden rounded-xl border border-line-strong bg-ink/70 text-center shadow-lg shadow-black/30 backdrop-blur">
                    <span className="flex flex-col justify-center px-4 py-2.5">
                      <span className="font-display text-4xl font-extrabold leading-none tabular-nums sm:text-5xl">{dayOf(featured.publishedAt)}</span>
                      <span className="mt-1 font-mono text-[11px] font-medium tracking-widest text-brand">{monthOf(featured.publishedAt)}</span>
                    </span>
                  </div>
                  <span className="rounded-full border border-line bg-ink/60 px-2.5 py-1 font-mono text-[11px] text-muted backdrop-blur">
                    #{featured.id.slice(-6)}
                  </span>
                </div>
                <div className="relative mt-auto p-5 pt-0 sm:p-6 sm:pt-0">
                  <div className="flex flex-wrap gap-1.5">
                    <AnnouncementBadges
                      category={featured.category}
                      priority={featured.priority}
                      isPinned={featured.isPinned}
                      isNew={isNew(featured.publishedAt, now)}
                    />
                  </div>
                  <h3 className="prose-safe mt-3 text-2xl font-extrabold leading-tight transition group-hover:text-brand sm:text-3xl">{featured.title}</h3>
                  <p className="prose-safe mt-2 line-clamp-3 leading-relaxed text-muted">{featured.content}</p>
                  <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand">
                    Baca selengkapnya <ArrowRight size={16} className="transition group-hover:translate-x-1" />
                  </span>
                </div>
              </Link>
            </Reveal>
            <Reveal delay={0.05}>
              <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-surface">
                <div className="flex items-center gap-2 border-b border-line bg-surface-2/70 px-4 py-3">
                  <span className="flex gap-1.5" aria-hidden>
                    <span className="h-2.5 w-2.5 rounded-full bg-danger/70" />
                    <span className="h-2.5 w-2.5 rounded-full bg-[#e0c062]/70" />
                    <span className="h-2.5 w-2.5 rounded-full bg-ok/70" />
                  </span>
                  <span className="ml-2 truncate font-mono text-xs text-faint">~/kabar $ git log --terbaru</span>
                </div>
                {moreAnn.length === 0 ? (
                  <p className="flex flex-1 items-center justify-center p-8 text-center text-sm text-muted">Baru satu kabar untuk saat ini.</p>
                ) : (
                  <ol className="relative flex-1 px-4 py-3 sm:px-5">
                    <span aria-hidden className="absolute bottom-6 left-[1.82rem] top-6 w-px bg-line-strong sm:left-[2.07rem]" />
                    {moreAnn.map((a) => (
                      <li key={a.id}>
                        <Link href={`/pengumuman/${a.id}`} className="group relative flex gap-4 rounded-xl py-3 pl-0 pr-2 transition hover:bg-surface-2">
                          <span
                            aria-hidden
                            className={cx(
                              "relative z-10 mt-1.5 h-3 w-3 flex-none rounded-full border-2 border-surface ring-2",
                              a.priority === "URGENT" ? "bg-danger ring-danger/40" : a.isPinned ? "bg-brand ring-brand/40" : "bg-line-strong ring-line"
                            )}
                            style={{ marginLeft: "0.45rem" }}
                          />
                          <span className="min-w-0 flex-1">
                            <span className="flex flex-wrap items-center gap-x-2 font-mono text-[11px] text-faint">
                              <span className="text-brand">{a.id.slice(-6)}</span>
                              <span>{CATEGORY_LABEL[a.category].toLowerCase()}</span>
                              <span>· {relativeTime(a.publishedAt, now)}</span>
                            </span>
                            <span className="prose-safe mt-0.5 line-clamp-2 font-semibold leading-snug transition group-hover:text-brand">{a.title}</span>
                            <span className="mt-0.5 line-clamp-1 text-sm text-muted">{a.content}</span>
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ol>
                )}
                <Link href="/pengumuman" className="flex items-center justify-between border-t border-line px-5 py-3 font-mono text-xs text-muted transition hover:text-brand">
                  <span>lihat semua {annCount} kabar</span>
                  <ArrowRight size={14} />
                </Link>
              </div>
            </Reveal>
          </div>
        )}
      </section>
      {period && period._count.members > 0 && (
        <section className={cx(container, "pt-20 sm:pt-24")}>
          <Link
            href="/struktur"
            className="group relative grid items-center gap-6 overflow-hidden rounded-2xl border border-line bg-surface p-6 transition hover:border-brand/50 sm:grid-cols-[1fr_auto] sm:p-8"
          >
            <span aria-hidden className="dotgrid pointer-events-none absolute inset-0 opacity-70" />
            <span className="relative">
              <span className="eyebrow">{period.name}</span>
              <span className="mt-2 block text-2xl font-bold sm:text-3xl">Struktur organisasi kelas</span>
              <span className="mt-2 block max-w-lg leading-relaxed text-muted">
                Kenali {period._count.members} pengurus yang menjaga kelas tetap kompak, lengkap dengan bagan dari dosen pembimbing sampai
                setiap divisi.
              </span>
              <span className="mt-5 inline-flex items-center gap-2 font-semibold text-brand">
                Lihat bagan lengkap <ArrowRight size={18} className="transition group-hover:translate-x-1" />
              </span>
            </span>
            <svg aria-hidden viewBox="0 0 200 130" className="relative mx-auto h-32 w-48 text-line-strong sm:h-36 sm:w-56">
              <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="org-mini">
                <path d="M100 34 V54 M40 54 H160 M40 54 V74 M100 54 V74 M160 54 V74" />
              </g>
              <circle cx="100" cy="20" r="14" className="fill-brand" />
              {[40, 100, 160].map((x, i) => (
                <circle key={x} cx={x} cy="88" r="12" className="org-mini-dot fill-surface-3 stroke-line-strong" strokeWidth="2" style={{ animationDelay: `${0.5 + i * 0.12}s` }} />
              ))}
              {[40, 100, 160].map((x) => (
                <rect key={x} x={x - 16} y="106" width="32" height="5" rx="2.5" className="fill-line-strong" />
              ))}
            </svg>
          </Link>
        </section>
      )}

      <section className={cx(container, "pt-20 sm:pt-24")}>
        <SectionTitle kicker="Dari teman-teman" title="Dinding catatan" href="/dinding" linkLabel="Buka dinding" />
        {notes.length === 0 ? (
          <p className="text-muted">Dinding masih kosong. Jadilah yang pertama menempel catatan.</p>
        ) : (
          <div className="grid gap-x-4 gap-y-8 pt-3 sm:grid-cols-2 lg:grid-cols-4">
            {notes.map((n, i) => (
              <Reveal key={n.id} delay={i * 0.05}>
                <NoteCard note={n} compact />
              </Reveal>
            ))}
          </div>
        )}
      </section>
      <section className={cx(container, "pt-20 sm:pt-24")}>
        <SectionTitle
          kicker="Bahan belajar"
          title="Materi kuliah"
          href={session ? "/materi" : "/login?next=/materi"}
          linkLabel="Buka rak materi"
        />
        <MaterialShelf subjects={subjects} groups={materialGroups} latest={latestMaterials} loggedIn={!!session} now={now} />
      </section>
      <section className={cx(container, "pt-20 sm:pt-24")}>
        <SectionTitle kicker="Khusus anggota" title="Ruang obrolan" href="/obrolan" linkLabel="Buka obrolan" />
        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex flex-col justify-between gap-6 rounded-xl border border-line bg-surface p-6 sm:p-7">
            <div>
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-wa-green/15 text-wa-green">
                <MessagesSquare size={24} />
              </span>
              <h3 className="mt-4 text-xl font-bold sm:text-2xl">Ngobrol rasa grup kelas</h3>
              <p className="mt-2 leading-relaxed text-muted">
                Cari nama teman lalu langsung chat tanpa perlu simpan kontak, atau ngobrol bareng di grup kelas yang
                diatur pengurus. Pesan masuk langsung, lengkap dengan centang biru.
              </p>
            </div>
            <div>
              <dl className="mb-5 grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-surface-2 px-4 py-3">
                  <dd className="font-display text-2xl font-bold tabular-nums">{chatCount}</dd>
                  <dt className="text-[13px] text-muted">grup kelas</dt>
                </div>
                <div className="rounded-lg bg-surface-2 px-4 py-3">
                  <dd className="font-display text-2xl font-bold tabular-nums">{chatToday}</dd>
                  <dt className="text-[13px] text-muted">pesan 24 jam terakhir</dt>
                </div>
              </dl>
              <Link
                href={session ? "/obrolan" : "/login?next=/obrolan"}
                className={cx(btn.primary, "min-h-12 w-full px-5 sm:w-auto")}
              >
                {session ? "Masuk ke ruang obrolan" : "Masuk untuk ikut ngobrol"} <ArrowRight size={18} />
              </Link>
            </div>
          </div>
          <div className="flex flex-col overflow-hidden rounded-xl border border-wa-line bg-wa-list">
            <div className="flex h-14 flex-none items-center justify-between bg-wa-panel px-4">
              <span className="font-semibold text-wa-text">Obrolan</span>
              <span className="font-mono text-[11px] uppercase tracking-wider text-wa-meta">terbaru</span>
            </div>
            {!session ? (
              <div className="flex min-h-56 flex-1 flex-col items-center justify-center gap-3 px-8 py-10 text-center text-wa-meta">
                <Lock size={28} strokeWidth={1.6} />
                <p className="max-w-xs text-sm">
                  Isi obrolan hanya bisa dibaca anggota kelas. Masuk dulu untuk melihat dan membalas.
                </p>
              </div>
            ) : recentChats.length === 0 ? (
              <div className="flex min-h-56 flex-1 flex-col items-center justify-center gap-3 px-8 py-10 text-center text-wa-meta">
                <MessagesSquare size={28} strokeWidth={1.6} />
                <p className="text-sm">Belum ada obrolan. Cari nama teman dan sapa duluan!</p>
              </div>
            ) : (
              <ul>
                {recentChats.map((c) => (
                  <li key={c.id}>
                    <Link href={`/obrolan/${c.id}`} className="flex items-center gap-3 pl-3 transition hover:bg-wa-panel">
                      {c.group ? (
                        <GroupAvatar id={c.id} title={c.title} size={46} src={c.image} />
                      ) : (
                        <Avatar name={c.title} src={c.image} size={46} />
                      )}
                      <span className="flex min-w-0 flex-1 flex-col border-b border-wa-line py-3 pr-4">
                        <span className="flex items-baseline justify-between gap-2">
                          <span className="truncate text-[15px] text-wa-text">{c.title}</span>
                          <span className={cx("flex-none text-xs", c.unread > 0 ? "text-wa-green" : "text-wa-meta")}>
                            {listTime(c.at, now)}
                          </span>
                        </span>
                        <span className="mt-0.5 flex items-center gap-1 text-sm text-wa-meta">
                          {c.mine && <CheckCheck size={16} className="flex-none text-wa-meta" />}
                          <span className="truncate">{c.text}</span>
                          {c.unread > 0 && (
                            <span className="ml-auto flex h-5 min-w-5 flex-none items-center justify-center rounded-full bg-wa-green px-1.5 text-[11px] font-semibold text-wa-bg">
                              {c.unread}
                            </span>
                          )}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>
      <section className="pt-20 sm:pt-24">
        <div className={container}>
          <SectionTitle kicker="Yang pernah kita lalui" title="Galeri kenangan" href="/kenangan" linkLabel="Semua album" />
        </div>
        {albums.length === 0 ? (
          <p className={cx(container, "text-muted")}>Belum ada album.</p>
        ) : (
          <div className="relative">
            <div className="bg-[#0a0908] py-3">
              <div aria-hidden className="film-holes h-3.5" />
              <div className="no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 py-3 sm:px-6 lg:px-[max(2rem,calc((100vw-80rem)/2+2rem))]">
                {albums.map((a, i) => (
                  <Link
                    key={a.id}
                    href={`/kenangan/${a.slug}`}
                    className="group relative w-[78vw] max-w-[22rem] flex-none snap-start overflow-hidden rounded-md bg-surface-2 sm:w-[20rem]"
                  >
                    <div className="aspect-[4/3] overflow-hidden">
                      <SafeImg
                        src={a.coverUrl || a.media[0]?.url}
                        alt={a.title}
                        width={360}
                        className="h-full w-full object-cover saturate-[0.85] transition duration-500 group-hover:scale-[1.05] group-hover:saturate-100"
                        fallback={
                          <span className="flex h-full items-center justify-center text-faint">
                            <Images size={26} aria-hidden />
                          </span>
                        }
                      />
                    </div>
                    <span className="absolute left-2 top-2 rounded bg-ink/80 px-1.5 py-0.5 font-mono text-[10px] tracking-widest text-[#e0c062]">
                      {String(i + 1).padStart(2, "0")}A
                    </span>
                    <span className="flex items-center justify-between gap-2 bg-[#0a0908] px-1 pb-0.5 pt-2.5">
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-fg transition group-hover:text-brand">{a.title}</span>
                        <span className="block font-mono text-[11px] text-faint">
                          {a._count.media} foto{a.eventDate ? ` · ${shortDate(a.eventDate)}` : ""}
                        </span>
                      </span>
                      <ArrowUpRight size={16} className="flex-none text-faint transition group-hover:text-brand" />
                    </span>
                  </Link>
                ))}
                <Link
                  href="/kenangan"
                  className="flex w-40 flex-none snap-start flex-col items-center justify-center gap-2 rounded-md border border-dashed border-line-strong text-center text-sm text-muted transition hover:border-brand hover:text-brand"
                >
                  <Images size={22} />
                  Semua album
                </Link>
              </div>
              <div aria-hidden className="film-holes h-3.5" />
            </div>
            <p className={cx(container, "mt-2 font-mono text-[11px] text-faint sm:hidden")}>geser ke samping →</p>
          </div>
        )}
      </section>
      <section className={cx(container, "pt-20 sm:pt-24")}>
        <div className="flex flex-col gap-6 rounded-xl border border-line bg-surface p-6 sm:p-8 md:flex-row md:items-center md:justify-between">
          <div className="max-w-xl">
            <h2 className="text-2xl font-bold">Ada yang mau kamu sampaikan ke kelas?</h2>
            <p className="mt-2 text-muted">Tulis pesan atau pengingat di dinding catatan. Boleh pakai nama, boleh juga anonim.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/dinding" className={btn.primary}>
              Tulis catatan
            </Link>
            <Link href="/obrolan" className={btn.secondary}>
              Buka obrolan
            </Link>
            <Link href="/kenangan" className={btn.secondary}>
              Buka galeri
            </Link>
            <Link href={session ? "/materi" : "/login?next=/materi"} className={btn.secondary}>
              Buka materi
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

function TodayCell({
  icon,
  label,
  children,
  className,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cx("min-w-0 border-line px-4 py-4 sm:px-5", className)}>
      <dt className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-faint">
        <span className="text-brand">{icon}</span>
        {label}
      </dt>
      <dd className="mt-1.5 text-sm">{children}</dd>
    </div>
  );
}
