import Link from "next/link";
import FilterBar from "@/components/ui/FilterBar";
import { cleanQuery } from "@/lib/filters";
import { MATERIAL_CATEGORIES } from "@/lib/labels";
import { BookOpen, Download, ExternalLink, FileText } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import PageHeader, { container } from "@/components/PageHeader";
import { EmptyState } from "@/components/ui/bits";
import { shortDate } from "@/lib/format";
import { cx } from "@/lib/ui";
import { getSubjects } from "@/lib/subjects";

export const dynamic = "force-dynamic";
export const metadata = { title: "Materi Kuliah", robots: { index: false, follow: false } };

function fileLabel(url: string) {
  if (!url.startsWith("/files/")) return { ext: "TAUTAN", external: true };
  return { ext: (url.split(".").pop() ?? "file").toUpperCase(), external: false };
}

export default async function MaterialsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; kategori?: string; matkul?: string }>;
}) {
  await requireUser("/materi");
  const sp = await searchParams;
  const q = cleanQuery(sp.q);
  const kategori = (sp.kategori ?? "").trim().slice(0, 60);
  const matkul = (sp.matkul ?? "").trim().slice(0, 120);
  const UMUM = "umum";

  const searchWhere = q ? { title: { contains: q, mode: "insensitive" as const } } : {};
  const subjectWhere = matkul === UMUM ? { subject: null } : matkul ? { subject: matkul } : {};
  const [byCategory, bySubject, items, subjects] = await Promise.all([
    prisma.material.groupBy({ by: ["category"], where: { ...searchWhere, ...subjectWhere }, _count: { _all: true } }),
    prisma.material.groupBy({ by: ["subject"], where: searchWhere, _count: { _all: true } }),
    prisma.material.findMany({
      where: {
        ...(kategori ? { category: kategori } : {}),
        ...subjectWhere,
        ...searchWhere,
      },
      orderBy: { createdAt: "desc" },
      include: { uploader: { select: { displayName: true } } },
    }),
    getSubjects(),
  ]);
  const cats = [
    ...new Set([...MATERIAL_CATEGORIES, ...byCategory.map((c) => c.category).filter((c): c is string => !!c)]),
  ];
  const subjectCount = (s: string | null) => bySubject.find((g) => g.subject === s)?._count._all ?? 0;
  const subjectList = [...new Set([...subjects, ...bySubject.map((g) => g.subject).filter((s): s is string => !!s)])];
  const subjectHref = (s: string | null) => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (kategori) p.set("kategori", kategori);
    if (s) p.set("matkul", s);
    const qs = p.toString();
    return qs ? `/materi?${qs}` : "/materi";
  };
  const chip = (active: boolean) =>
    cx(
      "inline-flex min-h-9 flex-none items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition",
      active ? "border-brand bg-brand text-ink" : "border-line bg-surface text-muted hover:border-line-strong hover:text-fg"
    );

  return (
    <>
      <PageHeader
        crumbs={[{ label: "Kabar" }, { label: "Materi kuliah" }]}
        eyebrow={`${items.length} materi`}
        title={matkul && matkul !== UMUM ? matkul : "Materi kuliah"}
        description={
          matkul && matkul !== UMUM
            ? "Materi untuk mata kuliah ini. Pilih mata kuliah lain di bawah."
            : "Modul, slide, rangkuman, dan berkas tugas yang dibagikan pengurus, dikelompokkan per mata kuliah."
        }
      />

      <section className={cx(container, "max-w-5xl pt-8")}>
        {subjectList.length > 0 && (
          <nav aria-label="Mata kuliah" className="mb-5">
            <p className="mb-2 font-mono text-[11px] uppercase tracking-wider text-faint">Mata kuliah</p>
            <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
              <Link href={subjectHref(null)} scroll={false} className={chip(!matkul)}>
                Semua
              </Link>
              {subjectList.map((s) => (
                <Link key={s} href={subjectHref(s)} scroll={false} className={chip(matkul === s)}>
                  {s}
                  <span className={cx("font-mono text-xs", matkul === s ? "text-ink/70" : "text-faint")}>{subjectCount(s)}</span>
                </Link>
              ))}
              {subjectCount(null) > 0 && (
                <Link href={subjectHref(UMUM)} scroll={false} className={chip(matkul === UMUM)}>
                  Umum
                  <span className={cx("font-mono text-xs", matkul === UMUM ? "text-ink/70" : "text-faint")}>{subjectCount(null)}</span>
                </Link>
              )}
            </div>
          </nav>
        )}
        <FilterBar
          path="/materi"
          keep={{ matkul: matkul || null }}
          q={q}
          kategori={kategori || null}
          categories={cats.map((c) => ({ value: c, label: c, count: byCategory.find((g) => g.category === c)?._count._all ?? 0 }))}
          search={{ placeholder: "Cari judul materi", label: "Cari materi" }}
          total={items.length}
          noun="materi"
        />

        <div className="mt-6 grid gap-2">
          {items.length === 0 ? (
            <EmptyState icon={<BookOpen size={32} />} title={q || kategori ? "Materi tidak ditemukan" : "Belum ada materi"}>
              {q || kategori ? "Coba kata kunci atau kategori lain." : "Materi yang dibagikan pengurus akan muncul di sini."}
            </EmptyState>
          ) : (
            items.map((m) => {
              const f = fileLabel(m.fileUrl);
              return (
                <a
                  key={m.id}
                  href={m.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-3 rounded-xl border border-line bg-surface p-3.5 transition hover:border-line-strong sm:gap-4 sm:p-4"
                >
                  <span className="flex h-12 w-12 flex-none flex-col items-center justify-center rounded-xl bg-surface-3 text-brand">
                    <FileText size={20} />
                    <span className="mt-0.5 text-[9px] font-bold tracking-wide text-muted">{f.ext.slice(0, 6)}</span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-mono text-[11px] font-semibold uppercase tracking-wide text-brand">
                      {m.subject ?? "Umum"}
                    </span>
                    <span className="block truncate font-semibold transition group-hover:text-brand">{m.title}</span>
                    <span className="block truncate text-sm text-muted">
                      {[m.category, m.uploader.displayName, shortDate(m.createdAt)].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                  <span className="flex-none text-faint transition group-hover:text-brand">
                    {f.external ? <ExternalLink size={19} /> : <Download size={19} />}
                  </span>
                </a>
              );
            })
          )}
        </div>
      </section>
    </>
  );
}
