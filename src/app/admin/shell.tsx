"use client";

import ThemeToggle from "@/components/ThemeToggle";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Megaphone,
  CalendarDays,
  BookOpen,
  Info,
  Network,
  Images,
  StickyNote,
  MessagesSquare,
  Users,
  Settings,
  ScrollText,
  LogOut,
  Menu,
  X,
  ArrowUpRight,
  Clock,
} from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { disablePushHere } from "@/lib/push-client";
import { Avatar } from "@/components/ui/bits";
import { ROLE_NAME, isSuperRole, type RoleKey } from "@/lib/roles";
import { cx } from "@/lib/ui";

type Item = { href: string; label: string; icon: React.ReactNode };

const GROUPS: { title: string; superOnly?: boolean; items: Item[] }[] = [
  {
    title: "Ringkasan",
    items: [{ href: "/admin", label: "Dashboard", icon: <LayoutDashboard size={18} /> }],
  },
  {
    title: "Informasi kelas",
    items: [
      { href: "/admin/pengumuman", label: "Pengumuman", icon: <Megaphone size={18} /> },
      { href: "/admin/agenda", label: "Agenda", icon: <CalendarDays size={18} /> },
      { href: "/admin/jadwal", label: "Jadwal & piket", icon: <Clock size={18} /> },
      { href: "/admin/materi", label: "Materi", icon: <BookOpen size={18} /> },
      { href: "/admin/tentang", label: "Tentang kelas", icon: <Info size={18} /> },
      { href: "/admin/struktur", label: "Struktur", icon: <Network size={18} /> },
    ],
  },
  {
    title: "Komunitas",
    items: [
      { href: "/admin/galeri", label: "Galeri", icon: <Images size={18} /> },
      { href: "/admin/dinding", label: "Dinding catatan", icon: <StickyNote size={18} /> },
      { href: "/admin/obrolan", label: "Grup obrolan", icon: <MessagesSquare size={18} /> },
    ],
  },
  {
    title: "Super admin",
    superOnly: true,
    items: [
      { href: "/admin/pengguna", label: "Pengguna", icon: <Users size={18} /> },
      { href: "/admin/pengaturan", label: "Pengaturan situs", icon: <Settings size={18} /> },
      { href: "/admin/log", label: "Log aktivitas", icon: <ScrollText size={18} /> },
    ],
  },
];

export default function AdminShell({
  siteName,
  user,
  badges,
  children,
}: {
  siteName: string;
  user: { name: string; email: string; image: string | null; role: string };
  badges: Record<string, number>;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setOpen(false);
  }

  const superAdmin = isSuperRole(user.role);
  const active = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));

  useEffect(() => {
    document.documentElement.style.overflow = open ? "hidden" : "";
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.documentElement.style.overflow = "";
    };
  }, [open]);

  async function logout() {
    await disablePushHere();
    await authClient.signOut();
    router.push("/login");
    router.refresh();
  }

  const nav = (
    <nav className="grid gap-6" aria-label="Menu admin">
      {GROUPS.filter((g) => !g.superOnly || superAdmin).map((g) => (
        <div key={g.title}>
          <p className="mb-1.5 px-3 text-[11px] font-bold uppercase tracking-[0.14em] text-faint">{g.title}</p>
          <div className="grid gap-0.5">
            {g.items.map((it) => {
              const on = active(it.href);
              const count = badges[it.href] ?? 0;
              return (
                <Link
                  key={it.href}
                  href={it.href}
                  aria-current={on ? "page" : undefined}
                  className={cx(
                    "flex min-h-10 items-center gap-3 rounded-lg px-3 text-[14.5px] font-medium transition",
                    on ? "bg-brand text-ink" : "text-muted hover:bg-surface-2 hover:text-fg"
                  )}
                >
                  {it.icon}
                  <span className="flex-1">{it.label}</span>
                  {count > 0 && (
                    <span
                      className={cx(
                        "rounded-full px-1.5 text-[11px] font-bold",
                        on ? "bg-ink text-brand" : "bg-brand text-ink"
                      )}
                    >
                      {count}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );

  const userBox = (
    <div className="grid gap-2 border-t border-line pt-4">
      <div className="flex items-center gap-3 px-1">
        <Avatar name={user.name} src={user.image} size={36} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{user.name}</p>
          <p className="truncate text-xs text-brand">{ROLE_NAME[user.role as RoleKey]}</p>
        </div>
      </div>
      <div className="mb-2">
        <ThemeToggle variant="segmented" size="sm" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Link
          href="/"
          className="flex min-h-9 items-center justify-center gap-1 rounded-lg border border-line text-xs font-semibold text-muted hover:border-brand hover:text-brand"
        >
          Situs <ArrowUpRight size={13} />
        </Link>
        <button
          type="button"
          onClick={logout}
          className="flex min-h-9 items-center justify-center gap-1 rounded-lg border border-line text-xs font-semibold text-muted hover:border-danger hover:text-danger"
        >
          <LogOut size={13} /> Keluar
        </button>
      </div>
    </div>
  );

  const brand = (
    <Link href="/admin" className="flex items-center gap-2.5">
      <img src="/logo.webp" alt="" className="h-9 w-9 rounded-lg" />
      <span className="leading-tight">
        <span className="block font-display text-[15px] font-bold">{siteName}</span>
        <span className="block text-[11px] font-semibold uppercase tracking-wider text-faint">panel pengurus</span>
      </span>
    </Link>
  );

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="sticky top-0 hidden h-dvh flex-col gap-6 overflow-y-auto border-r border-line bg-surface px-4 py-5 lg:flex">
        {brand}
        <div className="flex-1">{nav}</div>
        {userBox}
      </aside>
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-line bg-ink/95 px-4 backdrop-blur lg:hidden">
        {brand}
        <span className="flex items-center gap-1">
        <ThemeToggle />
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Buka menu admin"
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-line"
        >
          <Menu size={20} />
        </button>
        </span>
      </header>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Tutup menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />
          <aside className="absolute inset-y-0 left-0 flex w-[82%] max-w-[300px] animate-fade-up flex-col gap-6 overflow-y-auto border-r border-line bg-surface px-4 py-5">
            <div className="flex items-center justify-between">
              {brand}
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Tutup menu"
                className="flex h-10 w-10 items-center justify-center rounded-lg text-muted"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex-1">{nav}</div>
            {userBox}
          </aside>
        </div>
      )}

      <main className="min-w-0 px-4 pb-16 pt-6 sm:px-6 lg:px-10 lg:pt-9">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
