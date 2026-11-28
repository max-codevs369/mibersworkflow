"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "@/lib/ui";

export default function AccountTabs({ unread, admin }: { unread: number; admin: boolean }) {
  const pathname = usePathname();
  const tabs = [
    { href: "/akun", label: "Profil" },
    { href: "/akun/notifikasi", label: "Notifikasi", count: unread },
    { href: "/kas", label: "Kas kelas ↗", external: true },
    ...(admin ? [{ href: "/admin", label: "Panel admin ↗" }] : []),
  ];

  return (
    <nav className="no-scrollbar mt-8 flex gap-1 overflow-x-auto border-b border-line" aria-label="Menu akun">
      {tabs.map((t) => {
        const active = pathname === t.href;
        if ("external" in t)
          return (
            <a key={t.href} href={t.href} className="relative flex min-h-11 items-center gap-2 whitespace-nowrap px-4 text-sm font-semibold text-muted transition hover:text-fg">
              {t.label}
            </a>
          );
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? "page" : undefined}
            className={cx(
              "relative flex min-h-11 items-center gap-2 whitespace-nowrap px-4 text-sm font-semibold transition",
              active ? "text-fg" : "text-muted hover:text-fg"
            )}
          >
            {t.label}
            {"count" in t && t.count ? (
              <span className="rounded-full bg-brand px-1.5 text-[11px] font-bold text-ink">{t.count}</span>
            ) : null}
            {active && <span className="absolute inset-x-3 -bottom-px h-[3px] rounded-full bg-brand" />}
          </Link>
        );
      })}
    </nav>
  );
}
