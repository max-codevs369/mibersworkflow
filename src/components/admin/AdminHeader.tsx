import Link from "next/link";
import Breadcrumbs, { type Crumb } from "@/components/ui/Breadcrumbs";

export default function AdminHeader({
  title,
  description,
  back,
  crumbs,
  children,
}: {
  title: string;
  description?: React.ReactNode;
  back?: { href: string; label: string };
  crumbs?: Crumb[];
  children?: React.ReactNode;
}) {
  const trail: Crumb[] = crumbs ?? [
    { label: "Panel", href: "/admin" },
    ...(back ? [{ label: back.label, href: back.href }] : []),
    { label: title },
  ];

  return (
    <div className="mb-6 sm:mb-7">
      <Breadcrumbs items={trail} />
      <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="prose-safe text-2xl font-bold sm:text-[1.75rem]">{title}</h1>
          {description && <p className="mt-1 max-w-2xl text-sm text-muted sm:text-[15px]">{description}</p>}
        </div>
        {children && <div className="flex flex-none flex-wrap gap-2">{children}</div>}
      </div>
    </div>
  );
}

export function FilterTabs({
  tabs,
  active,
}: {
  tabs: { href: string; label: string; count?: number; key: string }[];
  active: string;
}) {
  return (
    <div className="no-scrollbar -mx-4 mb-5 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
      {tabs.map((t) => {
        const on = t.key === active;
        return (
          <Link
            key={t.key}
            href={t.href}
            aria-current={on ? "page" : undefined}
            className={
              on
                ? "inline-flex min-h-9 flex-none items-center gap-1.5 whitespace-nowrap rounded-full border border-brand bg-brand px-3.5 text-sm font-semibold text-ink"
                : "inline-flex min-h-9 flex-none items-center gap-1.5 whitespace-nowrap rounded-full border border-line px-3.5 text-sm text-muted transition hover:border-line-strong hover:text-fg"
            }
          >
            {t.label}
            {t.count !== undefined && <span className="font-mono text-xs opacity-75">{t.count}</span>}
          </Link>
        );
      })}
    </div>
  );
}
