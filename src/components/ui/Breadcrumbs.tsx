import Link from "next/link";
import { ChevronRight, House } from "lucide-react";
import { cx } from "@/lib/ui";

export type Crumb = { label: string; href?: string };

export default function Breadcrumbs({ items, className }: { items: Crumb[]; className?: string }) {
  if (items.length === 0) return null;
  return (
    <nav aria-label="Breadcrumb" className={cx("min-w-0", className)}>
      <ol className="flex flex-wrap items-center gap-x-1 gap-y-1 text-[13px] leading-none">
        {items.map((it, i) => {
          const last = i === items.length - 1;
          return (
            <li key={`${it.label}-${i}`} className="flex min-w-0 items-center gap-1">
              {i > 0 && <ChevronRight size={13} className="flex-none text-faint" aria-hidden />}
              {it.href && !last ? (
                <Link
                  href={it.href}
                  className="inline-flex min-h-7 items-center gap-1.5 rounded px-1 text-muted transition hover:text-fg"
                >
                  {i === 0 && <House size={13} aria-hidden />}
                  {it.label}
                </Link>
              ) : (
                <span
                  aria-current={last ? "page" : undefined}
                  className="inline-flex min-h-7 max-w-[62vw] items-center truncate px-1 font-medium text-fg sm:max-w-md"
                >
                  {it.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
