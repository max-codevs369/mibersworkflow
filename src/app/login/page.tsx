import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { isAdminRole } from "@/lib/roles";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import LoginForm from "./login-form";
import ThemeToggle from "@/components/ThemeToggle";

export const metadata = { title: "Masuk", robots: { index: false, follow: false } };

function safeNext(v?: string) {
  if (typeof v !== "string" || v.length > 512 || /[\u0000-\u001f\u007f\s\\]/.test(v)) return null;
  return /^\/(?!\/)/.test(v) && !v.startsWith("/login") ? v : null;
}

const FEATURES = [
  ["Pengumuman", "info resmi dari pengurus"],
  ["Ruang obrolan", "chat pribadi & grup kelas"],
  ["Materi kuliah", "modul & berkas tugas"],
  ["Galeri", "kirim foto kegiatan kelas"],
];

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNext((await searchParams).next);
  const [session, settings] = await Promise.all([getSession(), getSettings()]);
  if (session) redirect(next ?? (isAdminRole(session.user.role) ? "/admin" : "/akun"));

  const [first, ...rest] = settings.site_name.split(" ");

  return (
    <main className="grid min-h-dvh lg:grid-cols-[1fr_1fr]">
      <aside className="dotgrid relative hidden flex-col justify-between border-r border-line bg-surface p-10 lg:flex xl:p-14">
        <Link href="/" className="flex items-center gap-3">
          <img src="/logo.webp" alt="" width={40} height={40} className="h-10 w-10 rounded-lg" />
          <span>
            <span className="block font-display text-xl font-bold leading-tight">
              {first} <span className="text-brand">{rest.join(" ")}</span>
            </span>
            <span className="block text-sm text-muted">{settings.site_tagline}</span>
          </span>
        </Link>
        <div>
          <p className="eyebrow">Setelah masuk, kamu bisa</p>
          <ul className="mt-5 grid gap-3">
            {FEATURES.map(([k, v]) => (
              <li key={k} className="flex items-baseline gap-3 border-b border-line pb-3">
                <span className="font-mono text-xs text-faint">→</span>
                <span className="font-medium text-fg">{k}</span>
                <span className="text-sm text-muted">{v}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="font-mono text-xs text-faint">{settings.site_short || "Mibers 26"}</p>
      </aside>
      <div className="flex flex-col px-5 py-5 sm:px-10">
        <div className="flex items-center justify-between gap-3">
          <Breadcrumbs items={[{ label: "Beranda", href: "/" }, { label: "Masuk" }]} />
          <ThemeToggle />
        </div>
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
          <Link href="/" className="flex items-center gap-3 lg:hidden">
            <img src="/logo.webp" alt="" width={44} height={44} className="h-11 w-11 flex-none rounded-xl" />
            <span className="min-w-0">
              <span className="block truncate font-display text-lg font-bold leading-tight">
                {first} <span className="text-brand">{rest.join(" ")}</span>
              </span>
              <span className="block truncate text-[13px] text-muted">{settings.site_tagline}</span>
            </span>
          </Link>
          <p className="eyebrow mt-8 lg:mt-0">Masuk anggota</p>
          <h1 className="mt-2 text-3xl font-bold">Selamat datang lagi</h1>
          <p className="mt-2 text-[15px] leading-relaxed text-muted">
            Untuk anggota dan pengurus {settings.site_name}. Belum punya akun? Minta ke pengurus kelas.
          </p>
          <LoginForm next={next} />
        </div>
      </div>
    </main>
  );
}
