import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import PageHeader, { container } from "@/components/PageHeader";
import { cx } from "@/lib/ui";

export type LegalSection = { id: string; title: string; body: React.ReactNode };

export default function LegalDoc({
  title,
  description,
  updated,
  summary,
  sections,
  other,
}: {
  title: string;
  description: string;
  updated: string;
  summary: string[];
  sections: LegalSection[];
  other: { href: string; label: string };
}) {
  return (
    <>
      <PageHeader crumbs={[{ label: "Legal" }, { label: title }]} eyebrow={`Berlaku sejak ${updated}`} title={title} description={description} />

      <div className={cx(container, "max-w-4xl pt-8")}>
        <aside className="relative overflow-hidden rounded-2xl border border-brand/30 bg-brand/[0.06] p-5 sm:p-6">
          <p className="flex items-center gap-2 text-sm font-semibold text-brand">
            <Sparkles size={16} /> Intinya
          </p>
          <ul className="mt-3 grid gap-2.5 sm:grid-cols-2">
            {summary.map((s) => (
              <li key={s} className="flex gap-2.5 text-[15px] leading-relaxed text-fg">
                <span aria-hidden className="mt-2.5 h-1.5 w-1.5 flex-none rounded-full bg-brand" />
                {s}
              </li>
            ))}
          </ul>
        </aside>

        <nav aria-label="Daftar isi" className="no-scrollbar -mx-4 mt-6 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
          {sections.map((s, i) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="flex-none rounded-full border border-line px-3 py-1.5 text-sm text-muted transition hover:border-line-strong hover:text-fg"
            >
              <span className="mr-1.5 text-faint tabular-nums">{String(i + 1).padStart(2, "0")}</span>
              {s.title}
            </a>
          ))}
        </nav>

        <article className="mt-10 grid gap-10">
          {sections.map((s, i) => (
            <section key={s.id} id={s.id} className="scroll-mt-24 border-t border-line pt-8 first:border-0 first:pt-0">
              <p className="font-mono text-xs text-faint">{String(i + 1).padStart(2, "0")}</p>
              <h2 className="mt-1 text-xl font-bold sm:text-2xl">{s.title}</h2>
              <div className="mt-3 grid gap-3 text-[15px] leading-[1.8] text-fg/90 [&_li]:ml-5 [&_li]:list-disc [&_li]:pl-1 [&_strong]:text-fg [&_ul]:grid [&_ul]:gap-1.5">
                {s.body}
              </div>
            </section>
          ))}
        </article>

        <Link
          href={other.href}
          className="group mt-14 flex items-center justify-between gap-4 rounded-2xl border border-line bg-surface p-5 transition hover:border-line-strong"
        >
          <span>
            <span className="block text-xs text-faint">Baca juga</span>
            <span className="block font-semibold">{other.label}</span>
          </span>
          <ArrowRight size={18} className="text-muted transition group-hover:translate-x-1" />
        </Link>
      </div>
    </>
  );
}
