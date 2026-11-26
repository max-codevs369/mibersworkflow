import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import Breadcrumbs, { type Crumb } from "@/components/ui/Breadcrumbs";
import { cx } from "@/lib/ui";

export const container = "mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8";

export default function PageHeader({
  eyebrow,
  title,
  description,
  crumbs,
  children,
  className,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  crumbs?: Crumb[];
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cx("border-b border-line", className)}>
      <div className={cx(container, "pb-8 pt-5 sm:pb-10")}>
        {crumbs && <Breadcrumbs items={[{ label: "Beranda", href: "/" }, ...crumbs]} />}
        <div className="mt-6 flex flex-col gap-5 sm:mt-8 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0 max-w-3xl">
            {eyebrow && <p className="eyebrow">{eyebrow}</p>}
            <h1 className="mt-2 text-3xl font-bold sm:text-4xl lg:text-[2.75rem]">{title}</h1>
            {description && <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted sm:text-base">{description}</p>}
          </div>
          {children && <div className="flex flex-none flex-wrap gap-2">{children}</div>}
        </div>
      </div>
    </header>
  );
}

export function SectionTitle({
  kicker,
  title,
  href,
  linkLabel = "Lihat semua",
  className,
}: {
  kicker?: string;
  title: string;
  href?: string;
  linkLabel?: string;
  className?: string;
}) {
  return (
    <div className={cx("mb-6 flex flex-wrap items-end justify-between gap-x-4 gap-y-2 sm:mb-8", className)}>
      <div className="min-w-0">
        {kicker && <p className="eyebrow">{kicker}</p>}
        <h2 className="mt-1.5 text-2xl font-bold sm:text-3xl">{title}</h2>
      </div>
      {href && (
        <Link
          href={href}
          className="group inline-flex min-h-10 items-center gap-1 text-sm font-medium text-muted transition hover:text-brand"
        >
          {linkLabel}
          <ArrowUpRight size={16} className="transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </Link>
      )}
    </div>
  );
}
