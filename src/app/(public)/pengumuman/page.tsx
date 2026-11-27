import Link from "next/link";
import FilterBar from "@/components/ui/FilterBar";
import { cleanQuery, daysAgo, parseWaktu } from "@/lib/filters";
import { ArrowRight, Megaphone } from "lucide-react";
import { prisma } from "@/lib/prisma";
import Reveal from "@/components/Reveal";
import PageHeader, { container } from "@/components/PageHeader";
import AnnouncementBadges from "@/components/AnnouncementBadges";
import { EmptyState, Pagination } from "@/components/ui/bits";
import { dayOf, monthOf, relativeTime } from "@/lib/format";
import SafeImg from "@/components/ui/SafeImg";
import { CATEGORY_LABEL, publicWhere, isNew } from "@/lib/announcements";
import type { Prisma, AnnouncementCategory } from "@/generated/prisma/client";
import { cx } from "@/lib/ui";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Pengumuman",
  description: "Pengumuman resmi terbaru dari pengurus kelas Mibers Duo Anam.",
  alternates: { canonical: "/pengumuman" },
  openGraph: { title: "Pengumuman", description: "Pengumuman resmi terbaru dari pengurus kelas Mibers Duo Anam.", url: "/pengumuman" },
};

const PER_PAGE = 8;

export default async function AnnouncementsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; kategori?: string; waktu?: string }>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Math.floor(Number(sp.page)) || 1);
  const q = cleanQuery(sp.q);
  const waktu = parseWaktu(sp.waktu);
  const kategori = typeof sp.kategori === "string" && Object.hasOwn(CATEGORY_LABEL, sp.kategori) ? (sp.kategori as AnnouncementCategory) : null;
  const now = new Date();

  const base: Prisma.AnnouncementWhereInput[] = [
      publicWhere(now),
      ...(waktu === "sekarang" ? [{ publishedAt: { gte: daysAgo(30, now) } }] : []),
      ...(waktu === "terdahulu" ? [{ publishedAt: { lt: daysAgo(30, now) } }] : []),
      ...(q
        ? [
            {
              OR: [
                { title: { contains: q, mode: "insensitive" as const } },
                { content: { contains: q, mode: "insensitive" as const } },
              ],
            },
          ]
        : []),
  ];
  const where: Prisma.AnnouncementWhereInput = { AND: [...base, ...(kategori ? [{ category: kategori }] : [])] };

  const [total, items, byCategory] = await Promise.all([
    prisma.announcement.count({ where }),
    prisma.announcement.findMany({
      where,
      orderBy: [{ isPinned: "desc" }, { publishedAt: "desc" }],
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
    }),
    prisma.announcement.groupBy({ by: ["category"], where: { AND: base }, _count: { _all: true } }),
  ]);
  const countOf = new Map(byCategory.map((g) => [g.category as string, g._count._all]));
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));

  const href = (over: { page?: number; kategori?: string | null; q?: string }) => {
    const p = new URLSearchParams();
    const k = over.kategori !== undefined ? over.kategori : kategori;
    const query = over.q !== undefined ? over.q : q;
    if (query) p.set("q", query);
    if (waktu !== "semua") p.set("waktu", waktu);
    if (k) p.set("kategori", k);
    if (over.page && over.page > 1) p.set("page", String(over.page));
    const s = p.toString();
    return `/pengumuman${s ? `?${s}` : ""}`;
  };

  return (
    <>
      <PageHeader
        crumbs={[{ label: "Kabar" }, { label: "Pengumuman" }]}
        eyebrow={`${total} pengumuman`}
        title="Pengumuman"
        description="Kabar resmi dari pengurus: tugas, kegiatan kampus, iuran, sampai jadwal piket."
      />

      <section className={cx(container, "max-w-5xl pt-8")}>
        <FilterBar
          path="/pengumuman"
          q={q}
          waktu={waktu}
          waktuHints={{ sekarang: "30 hari terakhir", terdahulu: "lebih dari 30 hari lalu" }}
          kategori={kategori}
          categories={Object.entries(CATEGORY_LABEL).map(([value, label]) => ({ value, label, count: countOf.get(value) ?? 0 }))}
          search={{ placeholder: "Cari judul atau isi pengumuman", label: "Cari pengumuman" }}
          total={total}
          noun="pengumuman"
        />

        <div className="mt-6 grid gap-3">
          {items.length === 0 && (
            <EmptyState icon={<Megaphone size={32} />} title={q || kategori || waktu !== "semua" ? "Tidak ada yang cocok" : "Belum ada pengumuman"}>
              {q || kategori || waktu !== "semua" ? "Coba kata kunci, waktu, atau kategori lain." : "Pengumuman dari pengurus akan muncul di sini."}
            </EmptyState>
          )}

          {items.map((a, i) => (
            <Reveal key={a.id} delay={Math.min(i, 5) * 0.04}>
              <Link
                href={`/pengumuman/${a.id}`}
                className={cx(
                  "group flex gap-4 rounded-xl border bg-surface p-4 transition hover:border-line-strong sm:gap-5 sm:p-5",
                  a.priority === "URGENT" ? "border-danger/60" : "border-line"
                )}
              >
                {a.coverUrl ? (
                  <div className="h-16 w-16 flex-none overflow-hidden rounded-lg border border-line bg-surface-3 sm:h-20 sm:w-28">
                    <SafeImg src={a.coverUrl} alt="" width={112} className="h-full w-full object-cover" />
                  </div>
                ) : (
                  <div className="flex h-16 w-16 flex-none flex-col items-center justify-center rounded-lg bg-surface-3 sm:h-20">
                    <span className="font-display text-2xl font-bold leading-none">{dayOf(a.publishedAt)}</span>
                    <span className="mt-1 font-mono text-[11px] text-brand">{monthOf(a.publishedAt)}</span>
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap gap-1.5">
                    <AnnouncementBadges
                      category={a.category}
                      priority={a.priority}
                      isPinned={a.isPinned}
                      isNew={isNew(a.publishedAt, now)}
                    />
                  </div>
                  <h2 className="prose-safe mt-2 font-sans text-base font-semibold leading-snug transition group-hover:text-brand sm:text-lg">{a.title}</h2>
                  <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-muted">{a.content}</p>
                  <p className="mt-2 font-mono text-[11px] text-faint">{relativeTime(a.publishedAt, now)}</p>
                </div>
                <ArrowRight
                  size={20}
                  className="mt-1 hidden flex-none text-faint transition group-hover:translate-x-1 group-hover:text-brand sm:block"
                />
              </Link>
            </Reveal>
          ))}
        </div>

        <Pagination page={Math.min(page, pages)} pages={pages} href={(p) => href({ page: p })} />
      </section>
    </>
  );
}
