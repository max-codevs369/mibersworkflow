import Link from "next/link";
import { ArrowUpRight, Cake } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import Reveal from "@/components/Reveal";
import PageHeader, { container, SectionTitle } from "@/components/PageHeader";
import SafeImg from "@/components/ui/SafeImg";
import { Avatar, EmptyState, InstagramIcon } from "@/components/ui/bits";
import { instagramHandle, instagramUrl } from "@/lib/people";
import { memberWhere } from "@/lib/members";
import { SITE } from "@/lib/site";
import { cx } from "@/lib/ui";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Tentang Kami",
  description: "Kenali kelas Mibers Duo Anam, D3 Manajemen Informatika, Teknologi Informasi, Politeknik Negeri Padang.",
  alternates: { canonical: "/tentang" },
  openGraph: { title: "Tentang Kami", description: "Kenali kelas Mibers Duo Anam, D3 Manajemen Informatika, Teknologi Informasi, Politeknik Negeri Padang.", url: "/tentang" },
};

const monthIn = (d: Date) => Number(d.toLocaleString("en-US", { timeZone: SITE.timezone, month: "numeric" }));
const dayIn = (d: Date) => Number(d.toLocaleString("en-US", { timeZone: SITE.timezone, day: "numeric" }));
const FACT_GRID: Record<number, string> = {
  1: "grid-cols-1",
  2: "grid-cols-2",
  3: "grid-cols-1 sm:grid-cols-3",
  4: "grid-cols-2 lg:grid-cols-4",
  5: "grid-cols-2 lg:grid-cols-5 [&>*:last-child]:col-span-2 lg:[&>*:last-child]:col-span-1",
  6: "grid-cols-2 sm:grid-cols-3 xl:grid-cols-6",
};
const BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

export default async function AboutPage() {
  const now = new Date();
  const [settings, sections, members] = await Promise.all([
    getSettings(),
    prisma.aboutSection.findMany({ where: { isVisible: true }, orderBy: [{ sortOrder: "asc" }, { id: "asc" }] }),
    prisma.user.findMany({
      where: memberWhere,
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        image: true,
        profile: { select: { nickname: true, instagram: true, position: true, birthday: true } },
      },
    }),
  ]);

  const month = monthIn(now);
  const birthdays = members
    .filter((u) => u.profile?.birthday && monthIn(u.profile.birthday) === month)
    .sort((a, b) => dayIn(a.profile!.birthday!) - dayIn(b.profile!.birthday!));

  const facts = [
    { k: "Kampus", v: settings.school_name },
    { k: "Jurusan", v: settings.department },
    { k: "Program studi", v: settings.study_program },
    { k: "Angkatan", v: settings.class_year },
    { k: "Anggota", v: `${members.length} mahasiswa` },
    { k: "Dosen wali", v: settings.homeroom },
  ].filter((f) => f.v);

  return (
    <>
      <PageHeader
        crumbs={[{ label: "Tentang kami" }]}
        eyebrow="Profil kelas"
        title={`Tentang ${settings.site_name}`}
        description={settings.site_description}
      />

      <section className={cx(container, "pt-8")}>
        <dl className={cx("grid overflow-hidden rounded-xl border border-line", FACT_GRID[facts.length] ?? FACT_GRID[5])}>
          {facts.map((f) => (
            <div key={f.k} className="-mb-px -mr-px border-b border-r border-line px-4 py-4">
              <dt className="font-mono text-[11px] uppercase tracking-wider text-faint">{f.k}</dt>
              <dd className="mt-1 font-medium leading-snug text-fg">{f.v}</dd>
            </div>
          ))}
        </dl>

        {sections.length === 0 ? (
          <EmptyState title="Profil kelas belum ditulis" className="mt-10">
            Pengurus bisa menambahkan profil, visi, dan misi lewat panel pengurus.
          </EmptyState>
        ) : (
          <div className="mt-12 grid gap-12 sm:gap-16">
            {sections.map((s, i) => (
              <Reveal key={s.id}>
                <article className={cx("grid items-center gap-6 lg:gap-10", s.imageUrl && "lg:grid-cols-2")}>
                  <div className={cx("min-w-0", s.imageUrl && i % 2 === 1 && "lg:order-2")}>
                    <p className="font-mono text-xs text-faint">{String(i + 1).padStart(2, "0")}</p>
                    <h2 className="mt-1 text-2xl font-bold sm:text-3xl">{s.title}</h2>
                    <p className="prose-safe mt-3 max-w-3xl whitespace-pre-line leading-[1.8] text-fg/90">{s.content}</p>
                  </div>
                  {s.imageUrl && (
                    <div className="aspect-[4/3] overflow-hidden rounded-xl border border-line bg-surface-2">
                      <SafeImg src={s.imageUrl} alt={s.title} className="h-full w-full object-cover" />
                    </div>
                  )}
                </article>
              </Reveal>
            ))}
          </div>
        )}
      </section>

      {birthdays.length > 0 && (
        <section className={cx(container, "pt-16")}>
          <SectionTitle kicker="Bulan ini" title={`Ulang tahun ${BULAN[month - 1]}`} />
          <div className="flex flex-wrap gap-2">
            {birthdays.map((u) => {
              const today = dayIn(u.profile!.birthday!) === dayIn(now);
              return (
                <Link
                  key={u.id}
                  href={`/anggota/${u.id}`}
                  className={cx(
                    "flex min-w-0 items-center gap-2.5 rounded-full border py-1.5 pl-1.5 pr-4 transition hover:border-line-strong",
                    today ? "border-brand/60 bg-brand/10" : "border-line bg-surface"
                  )}
                >
                  <Avatar name={u.name} src={u.image} size={32} />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium leading-tight">{u.profile?.nickname || u.name}</span>
                    <span className="flex items-center gap-1 font-mono text-[11px] text-muted">
                      <Cake size={11} className="text-brand" />
                      {today ? "hari ini" : `${dayIn(u.profile!.birthday!)} ${BULAN[month - 1]}`}
                    </span>
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      <section id="anggota" className={cx(container, "scroll-mt-24 pt-16")}>
        <SectionTitle kicker={`${members.length} mahasiswa · klik untuk lihat profil`} title="Anggota kelas" />
        {members.length === 0 ? (
          <p className="text-muted">Belum ada anggota terdaftar.</p>
        ) : (
          <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {members.map((u) => {
              const ig = instagramUrl(u.profile?.instagram);
              return (
                <div
                  key={u.id}
                  className="group relative flex min-w-0 items-center gap-3 rounded-xl border border-line bg-surface px-3 py-3 transition hover:-translate-y-0.5 hover:border-line-strong hover:bg-surface-2"
                >
                  <Avatar name={u.name} src={u.image} size={42} />
                  <div className="min-w-0 flex-1">
                    <Link href={`/anggota/${u.id}`} className="block truncate font-medium leading-tight after:absolute after:inset-0 after:rounded-xl group-hover:text-brand">
                      {u.name}
                    </Link>
                    <p className="truncate text-xs text-muted">
                      {[u.profile?.nickname && `“${u.profile.nickname}”`, u.profile?.position].filter(Boolean).join(" · ") || "Anggota"}
                    </p>
                  </div>
                  {ig && (
                    <a
                      href={ig}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Instagram ${instagramHandle(u.profile?.instagram)}`}
                      className="relative z-10 flex h-9 w-9 flex-none items-center justify-center rounded-lg text-faint transition hover:bg-surface-3 hover:text-fg"
                    >
                      <InstagramIcon size={16} />
                    </a>
                  )}
                  <ArrowUpRight size={16} className="flex-none text-faint opacity-0 transition group-hover:opacity-100" aria-hidden />
                </div>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}
