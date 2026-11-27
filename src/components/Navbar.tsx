"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  BookOpen,
  CalendarDays,
  ChevronDown,
  Images,
  Info,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  MessagesSquare,
  Network,
  Home,
  LogIn,
  Scale,
  Search,
  ShieldCheck,
  StickyNote,
  UserRound,
  X,
  Wallet,
} from "lucide-react";
import { disablePushHere } from "@/lib/push-client";
import { isAdminRole, ROLE_NAME, type RoleKey } from "@/lib/roles";
import { Avatar, InstagramIcon } from "@/components/ui/bits";
import CommandPalette, { Kbd, type PaletteItem } from "@/components/CommandPalette";
import ChatPulse from "@/components/chat/ChatPulse";
import ThemeToggle from "@/components/ThemeToggle";
import { cx } from "@/lib/ui";

const KEYWORDS: Record<string, string> = {
  "/": "home utama awal",
  "/tentang": "about profil visi misi anggota mahasiswa ulang tahun",
  "/struktur": "pengurus ketua sekretaris bendahara organisasi",
  "/agenda": "jadwal kuliah piket acara ujian kalender event",
  "/pengumuman": "info berita kabar",
  "/materi": "modul tugas file dokumen belajar",
  "/dinding": "catatan pesan note semangat",
  "/kenangan": "foto galeri album video dokumentasi",
  "/obrolan": "chat pesan grup wa diskusi",
  "/akun": "profil pengaturan password",
  "/akun/notifikasi": "pemberitahuan notif",
  "/admin": "dashboard panel pengurus kelola",
  "/login": "masuk login akun",
  "/privasi": "privacy policy data cookie legal kebijakan",
  "/ketentuan": "terms of service aturan syarat legal",
};

type NavItem = { href: string; label: string; desc: string; icon: React.ReactNode };
type NavGroup = { key: string; label: string; items: NavItem[] };

const GROUPS: NavGroup[] = [
  {
    key: "kelas",
    label: "Kelas",
    items: [
      { href: "/tentang", label: "Tentang kami", desc: "Profil, visi, dan anggota", icon: <Info size={18} /> },
      { href: "/struktur", label: "Struktur organisasi", desc: "Pengurus per periode", icon: <Network size={18} /> },
      { href: "/agenda", label: "Agenda & jadwal", desc: "Acara, kuliah, dan piket", icon: <CalendarDays size={18} /> },
    ],
  },
  {
    key: "kabar",
    label: "Kabar",
    items: [
      { href: "/pengumuman", label: "Pengumuman", desc: "Info resmi dari pengurus", icon: <Megaphone size={18} /> },
      { href: "/materi", label: "Materi kuliah", desc: "File & tautan belajar (anggota)", icon: <BookOpen size={18} /> },
    ],
  },
  {
    key: "ruang",
    label: "Ruang bersama",
    items: [
      { href: "/dinding", label: "Dinding catatan", desc: "Pesan & semangat untuk kelas", icon: <StickyNote size={18} /> },
      { href: "/kenangan", label: "Galeri kenangan", desc: "Album foto kegiatan", icon: <Images size={18} /> },
      { href: "/obrolan", label: "Ruang obrolan", desc: "Chat pribadi & grup kelas", icon: <MessagesSquare size={18} /> },
    ],
  },
];

type User = { name: string; image: string | null; role: string };

export default function Navbar({
  siteName,
  instagram,
  user,
  unread,
  chatUnread = 0,
}: {
  siteName: string;
  instagram: string;
  user: User | null;
  unread: number;
  chatUnread?: number;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [drawer, setDrawer] = useState(false);
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [userMenu, setUserMenu] = useState(false);
  const [mobileGroup, setMobileGroup] = useState<string | null>(null);
  const navRef = useRef<HTMLDivElement>(null);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pointer = useRef<string>("mouse");
  const [palette, setPalette] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setDrawer(false);
        setOpenGroup(null);
        setUserMenu(false);
        setPalette((p) => !p);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const hoverOpen = (key: string) => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    setUserMenu(false);
    setOpenGroup(key);
  };
  const hoverClose = (key: string) => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => setOpenGroup((cur) => (cur === key ? null : cur)), 160);
  };
  useEffect(() => () => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
  }, []);

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`));
  const groupActive = (g: NavGroup) => g.items.some((i) => isActive(i.href));
  const admin = isAdminRole(user?.role);

  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setDrawer(false);
    setOpenGroup(null);
    setUserMenu(false);
  }

  useEffect(() => {
    if (!openGroup && !userMenu) return;
    const onDown = (e: PointerEvent) => {
      if (!navRef.current?.contains(e.target as Node)) {
        setOpenGroup(null);
        setUserMenu(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpenGroup(null);
        setUserMenu(false);
      }
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [openGroup, userMenu]);

  useEffect(() => {
    if (!drawer) return;
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setDrawer(false);
    const onResize = () => window.innerWidth >= 768 && setDrawer(false);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    return () => {
      document.documentElement.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
    };
  }, [drawer]);

  async function logout() {
    setUserMenu(false);
    setDrawer(false);
    await disablePushHere();
    const { authClient } = await import("@/lib/auth-client");
    await authClient.signOut();
    router.push("/");
    router.refresh();
  }

  const [first, ...rest] = siteName.split(" ");
  const roleName = ROLE_NAME[user?.role as RoleKey] ?? "Anggota";

  const paletteItems: PaletteItem[] = [
    { href: "/", label: "Beranda", desc: "Halaman utama", group: "Umum", icon: <Home size={18} /> },
    ...GROUPS.flatMap((g) => g.items.map((it) => ({ ...it, group: g.label }))),
    ...(user
      ? [
          { href: "/akun", label: "Akun saya", desc: "Profil dan kata sandi", group: "Akun", icon: <UserRound size={18} /> },
          { href: "/akun/notifikasi", label: "Notifikasi", desc: "Pemberitahuan untukmu", group: "Akun", icon: <Bell size={18} /> },
          ...(admin
            ? [{ href: "/admin", label: "Panel pengurus", desc: "Kelola isi situs", group: "Akun", icon: <LayoutDashboard size={18} /> }]
            : []),
        ]
      : [{ href: "/login", label: "Masuk anggota", desc: "Login untuk anggota kelas", group: "Akun", icon: <LogIn size={18} /> }]),
    { href: "/privasi", label: "Kebijakan Privasi", desc: "Data apa yang disimpan dan untuk apa", group: "Legal", icon: <ShieldCheck size={18} /> },
    { href: "/ketentuan", label: "Ketentuan Layanan", desc: "Aturan main memakai situs", group: "Legal", icon: <Scale size={18} /> },
  ].map((it) => ({ ...it, keywords: KEYWORDS[it.href] }));

  return (
    <>
    <header className="sticky top-0 z-50 border-b border-line bg-ink/95 backdrop-blur supports-[backdrop-filter]:bg-ink/85">
      <div ref={navRef} className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6 md:grid md:grid-cols-[1fr_auto_1fr] md:gap-4 lg:px-8">
        <Link href="/" className="mr-auto flex min-w-0 items-center gap-2.5 md:mr-0 md:justify-self-start" aria-label={`${siteName}, beranda`}>
          <img src="/logo.webp" alt="" width={36} height={36} className="h-9 w-9 flex-none rounded-lg" />
          <span className="truncate font-display text-[17px] font-bold">
            {first}{" "}
            <span className="text-brand md:hidden lg:inline">{rest.join(" ")}</span>
          </span>
        </Link>
        <nav className="hidden items-center gap-0.5 justify-self-center md:flex lg:gap-1" aria-label="Menu utama">
          <Link
            href="/"
            aria-current={pathname === "/" ? "page" : undefined}
            className={cx(
              "rounded-md px-2.5 py-2 text-sm font-medium transition lg:px-3",
              pathname === "/" ? "text-fg" : "text-muted hover:text-fg"
            )}
          >
            Beranda
          </Link>
          {GROUPS.map((g) => {
            const open = openGroup === g.key;
            return (
              <div
                key={g.key}
                className="relative"
                onPointerEnter={(e) => e.pointerType === "mouse" && hoverOpen(g.key)}
                onPointerLeave={(e) => e.pointerType === "mouse" && hoverClose(g.key)}
              >
                <button
                  type="button"
                  aria-expanded={open}
                  aria-haspopup="true"
                  onPointerDown={(e) => (pointer.current = e.pointerType)}
                  onClick={(e) => {
                    setUserMenu(false);
                    if (e.detail > 0 && pointer.current === "mouse") setOpenGroup(g.key);
                    else setOpenGroup(open ? null : g.key);
                  }}
                  className={cx(
                    "flex items-center gap-1 rounded-md px-2.5 py-2 text-sm font-medium transition lg:px-3",
                    open || groupActive(g) ? "text-fg" : "text-muted hover:text-fg"
                  )}
                >
                  {g.label}
                  {g.key === "ruang" && chatUnread > 0 && (
                    <span className="h-2 w-2 rounded-full bg-wa-green" aria-label="Ada pesan baru" />
                  )}
                  <ChevronDown size={15} className={cx("transition", open && "rotate-180")} />
                  {groupActive(g) && <span className="absolute inset-x-3 -bottom-[13px] h-0.5 rounded-full bg-brand" />}
                </button>
                {open && (
                  <div className="absolute left-1/2 top-full w-[300px] -translate-x-1/2 pt-2.5">
                  <div className="animate-drop rounded-xl border border-line-strong bg-surface p-1.5 shadow-xl shadow-black/40">
                    {g.items.map((it) => (
                      <Link
                        key={it.href}
                        href={it.href}
                        aria-current={isActive(it.href) ? "page" : undefined}
                        className={cx(
                          "flex items-start gap-3 rounded-lg px-3 py-2.5 transition",
                          isActive(it.href) ? "bg-surface-3" : "hover:bg-surface-2"
                        )}
                      >
                        <span className={cx("mt-0.5", isActive(it.href) ? "text-brand" : "text-muted")}>{it.icon}</span>
                        <span>
                          <span className="flex items-center gap-2 text-sm font-medium text-fg">
                            {it.label}
                            {it.href === "/obrolan" && chatUnread > 0 && <ChatBadge n={chatUnread} />}
                          </span>
                          <span className="block text-xs text-muted">{it.desc}</span>
                        </span>
                      </Link>
                    ))}
                  </div>
                  </div>
                )}
              </div>
            );
          })}
        </nav>
        <div className="flex flex-none items-center gap-1.5 md:justify-self-end">
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setPalette(true)}
            aria-label="Cari halaman (Ctrl + K)"
            title="Cari halaman (Ctrl + K)"
            className="flex h-10 w-10 items-center justify-center rounded-lg text-muted transition hover:bg-surface-2 hover:text-fg xl:w-auto xl:gap-2 xl:border xl:border-line xl:pl-3 xl:pr-1.5 xl:hover:border-line-strong"
          >
            <Search size={18} />
            <span className="hidden text-sm xl:inline">Cari</span>
            <span className="hidden items-center gap-0.5 xl:flex">
              <Kbd>Ctrl</Kbd>
              <Kbd>K</Kbd>
            </span>
          </button>
          <a
            href={instagram}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Instagram kelas"
            className="hidden h-10 w-10 items-center justify-center rounded-lg text-muted transition hover:bg-surface-2 hover:text-fg sm:flex md:hidden xl:flex"
          >
            <InstagramIcon size={19} />
          </a>
          {user ? (
            <>
              <Link
                href="/akun/notifikasi"
                aria-label={`Notifikasi${unread ? `, ${unread} belum dibaca` : ""}`}
                className="relative flex h-10 w-10 items-center justify-center rounded-lg text-muted transition hover:bg-surface-2 hover:text-fg"
              >
                <Bell size={19} />
                {unread > 0 && (
                  <span className="absolute right-1 top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-brand px-1 font-mono text-[10px] font-medium text-ink">
                    {unread > 99 ? "99+" : unread}
                  </span>
                )}
              </Link>
              <div className="relative hidden md:block">
                <button
                  type="button"
                  onClick={() => {
                    setOpenGroup(null);
                    setUserMenu((m) => !m);
                  }}
                  aria-expanded={userMenu}
                  aria-haspopup="true"
                  aria-label="Menu akun"
                  className="flex h-10 items-center gap-1.5 rounded-full border border-line pl-1 pr-2 transition hover:border-line-strong"
                >
                  <Avatar name={user.name} src={user.image} size={30} />
                  <ChevronDown size={15} className={cx("text-muted transition", userMenu && "rotate-180")} />
                </button>
                {userMenu && (
                  <div className="absolute right-0 top-[calc(100%+10px)] w-60 animate-drop rounded-xl border border-line-strong bg-surface p-1.5 shadow-xl shadow-black/40">
                    <div className="px-3 py-2.5">
                      <p className="truncate text-sm font-semibold">{user.name}</p>
                      <p className="font-mono text-[11px] uppercase tracking-wider text-brand">{roleName}</p>
                    </div>
                    <div className="my-1 h-px bg-line" />
                    <MenuLink href="/akun" icon={<UserRound size={17} />} label="Akun saya" />
                    <MenuLink href="/akun/notifikasi" icon={<Bell size={17} />} label="Notifikasi" />
                    <a
                      href="/kas"
                      className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-muted transition hover:bg-surface-2 hover:text-fg"
                    >
                      <Wallet size={17} />
                      Kas kelas
                    </a>
                    {admin && <MenuLink href="/admin" icon={<LayoutDashboard size={17} />} label="Panel pengurus" />}
                    <div className="my-1 h-px bg-line" />
                    <button
                      type="button"
                      onClick={logout}
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm text-muted transition hover:bg-surface-2 hover:text-danger"
                    >
                      <LogOut size={17} /> Keluar
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <Link
              href="/login"
              className="hidden min-h-10 items-center rounded-lg bg-brand px-4 text-sm font-semibold text-ink transition hover:bg-brand-soft sm:flex"
            >
              Masuk
            </Link>
          )}

          <button
            type="button"
            aria-label={drawer ? "Tutup menu" : "Buka menu"}
            aria-expanded={drawer}
            aria-controls="menu-ponsel"
            onClick={() => setDrawer((d) => !d)}
            className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-line text-fg md:hidden"
          >
            {drawer ? <X size={20} /> : <Menu size={20} />}
            {!drawer && chatUnread > 0 && (
              <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full border-2 border-ink bg-wa-green" aria-hidden />
            )}
          </button>
        </div>
      </div>
    </header>
      {drawer && (
        <div
          id="menu-ponsel"
          className="fixed inset-x-0 bottom-0 top-16 z-40 animate-fade-up overflow-y-auto overscroll-contain border-t border-line bg-ink md:hidden"
        >
          <div className="mx-auto max-w-xl px-4 pb-10 pt-3 sm:px-6">
            {user && (
              <div className="mb-3 flex items-center gap-3 rounded-xl border border-line bg-surface px-3 py-3">
                <Avatar name={user.name} src={user.image} size={40} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{user.name}</p>
                  <p className="font-mono text-[11px] uppercase tracking-wider text-brand">{roleName}</p>
                </div>
              </div>
            )}

            <div className="mb-4">
              <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-faint">Tema tampilan</p>
              <ThemeToggle variant="segmented" />
            </div>
            <nav aria-label="Menu ponsel" className="grid gap-1">
              <Link
                href="/"
                className={cx(
                  "flex min-h-12 items-center rounded-lg px-3 font-medium",
                  pathname === "/" ? "bg-surface-2 text-brand" : "text-fg"
                )}
              >
                Beranda
              </Link>
              {GROUPS.map((g) => {
                const open = mobileGroup === g.key || (mobileGroup === null && groupActive(g));
                return (
                  <div key={g.key} className="border-t border-line first:border-0">
                    <button
                      type="button"
                      aria-expanded={open}
                      onClick={() => setMobileGroup(open ? "" : g.key)}
                      className="flex min-h-12 w-full items-center justify-between rounded-lg px-3 text-left font-medium text-fg"
                    >
                      <span className="flex items-center gap-2">
                        {g.label}
                        {g.key === "ruang" && chatUnread > 0 && <span className="h-2 w-2 rounded-full bg-wa-green" aria-hidden />}
                      </span>
                      <ChevronDown size={18} className={cx("text-muted transition", open && "rotate-180")} />
                    </button>
                    {open && (
                      <div className="grid gap-0.5 pb-2 pl-2">
                        {g.items.map((it) => (
                          <Link
                            key={it.href}
                            href={it.href}
                            className={cx(
                              "flex min-h-12 items-center gap-3 rounded-lg px-3",
                              isActive(it.href) ? "bg-surface-2 text-brand" : "text-muted hover:text-fg"
                            )}
                          >
                            {it.icon}
                            <span>
                              <span className="flex items-center gap-2 text-[15px] font-medium leading-tight">
                                {it.label}
                                {it.href === "/obrolan" && chatUnread > 0 && <ChatBadge n={chatUnread} />}
                              </span>
                              <span className="block text-xs text-faint">{it.desc}</span>
                            </span>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>
            <div className="mt-4 grid gap-1 border-t border-line pt-4">
              {user ? (
                <>
                  <MobileLink href="/akun" icon={<UserRound size={18} />} label="Akun saya" />
                  <a href="/kas" className="flex min-h-12 items-center gap-3 rounded-lg px-3 text-muted hover:bg-surface-2 hover:text-fg">
                    <Wallet size={18} />
                    Kas kelas
                  </a>
                  {admin && <MobileLink href="/admin" icon={<LayoutDashboard size={18} />} label="Panel pengurus" />}
                  <button
                    type="button"
                    onClick={logout}
                    className="flex min-h-12 items-center gap-3 rounded-lg px-3 text-left text-danger"
                  >
                    <LogOut size={18} /> Keluar
                  </button>
                </>
              ) : (
                <Link href="/login" className="flex min-h-12 items-center justify-center rounded-lg bg-brand font-semibold text-ink">
                  Masuk anggota
                </Link>
              )}
              <a
                href={instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-h-12 items-center gap-3 rounded-lg px-3 text-muted"
              >
                <InstagramIcon size={18} /> Instagram kelas
              </a>
            </div>
          </div>
        </div>
      )}

      <CommandPalette open={palette} onClose={() => setPalette(false)} items={paletteItems} />
      {user && !pathname.startsWith("/obrolan") && <ChatPulse interval={20000} />}
    </>
  );
}

function MenuLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-muted transition hover:bg-surface-2 hover:text-fg"
    >
      {icon}
      {label}
    </Link>
  );
}

function MobileLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link href={href} className="flex min-h-12 items-center gap-3 rounded-lg px-3 text-muted hover:bg-surface-2 hover:text-fg">
      {icon}
      {label}
    </Link>
  );
}

function ChatBadge({ n }: { n: number }) {
  return (
    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-wa-green px-1.5 text-[11px] font-semibold text-wa-bg">
      {n > 99 ? "99+" : n}
    </span>
  );
}
