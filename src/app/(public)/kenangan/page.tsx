import Link from "next/link";
import { Images, Lock } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import Reveal from "@/components/Reveal";
import PageHeader, { container } from "@/components/PageHeader";
import SafeImg from "@/components/ui/SafeImg";
import { EmptyState } from "@/components/ui/bits";
import { longDate } from "@/lib/format";
import { badge, cx } from "@/lib/ui";
import FilterBar from "@/components/ui/FilterBar";
import { cleanQuery, jakartaYear, parseWaktu, startOfYearJakarta } from "@/lib/filters";
import { ALBUM_CATEGORY_LABEL, type AlbumCategoryKey } from "@/lib/labels";
import type { Prisma } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Galeri Kenangan",
  description: "Galeri foto dan video kenangan kegiatan kelas Mibers Duo Anam.",
  alternates: { canonical: "/kenangan" },
  openGraph: { title: "Galeri Kenangan", description: "Galeri foto dan video kenangan kegiatan kelas Mibers Duo Anam.", url: "/kenangan" },
};

export default async function GalleryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; kategori?: string; waktu?: string }>;
}) {
  const sp = await searchParams;
  const q = cleanQuery(sp.q);
  const waktu = parseWaktu(sp.waktu);
  const kategori = typeof sp.kategori === "string" && Object.hasOwn(ALBUM_CATEGORY_LABEL, sp.kategori) ? (sp.kategori as AlbumCategoryKey) : null;
  const yearStart = startOfYearJakarta();

  const session = await getSession();
  const base: Prisma.AlbumWhereInput[] = [
      session ? {} : { visibility: "PUBLIC" },
      ...(q
        ? [{ OR: [{ title: { contains: q, mode: "insensitive" as const } }, { description: { contains: q, mode: "insensitive" as const } }] }]
        : []),
      ...(waktu === "sekarang"
        ? [{ OR: [{ eventDate: { gte: yearStart } }, { eventDate: null, createdAt: { gte: yearStart } }] }]
        : []),
      ...(waktu === "terdahulu"
        ? [{ OR: [{ eventDate: { lt: yearStart } }, { eventDate: null, createdAt: { lt: yearStart } }] }]
        : []),
  ];
  const where: Prisma.AlbumWhereInput = { AND: [...base, ...(kategori ? [{ category: kategori }] : [])] };
  const byCategory = await prisma.album.groupBy({ by: ["category"], where: { AND: base }, _count: { _all: true } });

  const albums = await prisma.album.findMany({
    where,
    orderBy: [{ eventDate: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
    include: {
      media: {
        where: { status: "APPROVED", type: "PHOTO" },
        orderBy: { createdAt: "asc" },
        take: 3,
        select: { url: true },
      },
      _count: { select: { media: { where: { status: "APPROVED" } } } },
    },
  });

  return (
    <>
      <PageHeader
        crumbs={[{ label: "Ruang bersama" }, { label: "Galeri kenangan" }]}
        eyebrow={`${albums.length} album`}
        title="Galeri kenangan"
        description={
          session
            ? "Semua album kelas. Kamu juga bisa menambahkan foto di setiap album."
            : "Album foto kegiatan kelas. Masuk sebagai anggota untuk melihat album khusus dan menambahkan foto."
        }
      />

      <section className={cx(container, "pt-8")}>
        <FilterBar
          path="/kenangan"
          q={q}
          waktu={waktu}
          waktuHints={{ sekarang: `tahun ${jakartaYear()}`, terdahulu: "tahun-tahun sebelumnya" }}
          kategori={kategori}
          categories={Object.entries(ALBUM_CATEGORY_LABEL).map(([value, label]) => ({ value, label, count: byCategory.find((g) => g.category === value)?._count._all ?? 0 }))}
          search={{ placeholder: "Cari judul album", label: "Cari album" }}
          total={albums.length}
          noun="album"
        />

        <div className="mt-6">
        {albums.length === 0 ? (
          <EmptyState icon={<Images size={30} />} title={q || kategori || waktu !== "semua" ? "Tidak ada album yang cocok" : "Belum ada album"}>
            {q || kategori || waktu !== "semua" ? "Coba kata kunci, waktu, atau kategori lain." : "Album foto kegiatan kelas akan muncul di sini."}
          </EmptyState>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {albums.map((a, i) => {
              const cover = a.coverUrl || a.media[0]?.url;
              const thumbs = a.media.filter((m) => m.url !== cover).slice(0, 2);
              return (
                <Reveal key={a.id} delay={(i % 3) * 0.05}>
                  <Link
                    href={`/kenangan/${a.slug}`}
                    className="group block h-full overflow-hidden rounded-xl border border-line bg-surface transition hover:border-line-strong"
                  >
                    <div className="grid aspect-[4/3] grid-cols-3 grid-rows-2 gap-0.5 bg-line">
                      <div className={cx("bg-surface-2", thumbs.length ? "col-span-2 row-span-2" : "col-span-3 row-span-2")}>
                        <SafeImg
                          src={cover}
                          alt={a.title}
                          className="h-full w-full object-cover"
                          fallback={
                            <span className="flex h-full items-center justify-center text-faint">
                              <Images size={26} aria-hidden />
                            </span>
                          }
                        />
                      </div>
                      {thumbs.map((t) => (
                        <div key={t.url} className={cx("bg-surface-2", thumbs.length === 1 && "row-span-2")}>
                          <SafeImg src={t.url} alt="" className="h-full w-full object-cover" />
                        </div>
                      ))}
                    </div>
                    <div className="flex items-start justify-between gap-3 p-4">
                      <div className="min-w-0">
                        <h2 className="truncate font-sans text-base font-semibold transition group-hover:text-brand">{a.title}</h2>
                        <p className="font-mono text-[11px] text-muted">
                          {ALBUM_CATEGORY_LABEL[a.category as AlbumCategoryKey] ?? "Album"} · {a._count.media} foto
                          {a.eventDate ? ` · ${longDate(a.eventDate)}` : ""}
                        </p>
                      </div>
                      {a.visibility === "MEMBERS_ONLY" && (
                        <span className={cx(badge, "mt-0.5 flex-none bg-surface-3 text-muted")}>
                          <Lock size={11} /> ANGGOTA
                        </span>
                      )}
                    </div>
                  </Link>
                </Reveal>
              );
            })}
          </div>
        )}
        </div>
      </section>
    </>
  );
}
