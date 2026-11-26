import Link from "next/link";
import { getSettings } from "@/lib/settings";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import ThemeToggle from "@/components/ThemeToggle";
import ResetForm from "./reset-form";

export const metadata = { title: "Lupa kata sandi", robots: { index: false, follow: false } };

const STEPS = [
  ["Masukkan email", "email yang dipakai untuk masuk"],
  ["Ketik kode 6 angka", "dikirim ke email, berlaku 10 menit"],
  ["Buat kata sandi baru", "perangkat lain otomatis dikeluarkan"],
];

export default async function ForgotPasswordPage() {
  const settings = await getSettings();
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
          <p className="eyebrow">Caranya gampang</p>
          <ol className="mt-5 grid gap-3">
            {STEPS.map(([k, v], i) => (
              <li key={k} className="flex items-baseline gap-3 border-b border-line pb-3">
                <span className="font-mono text-xs text-faint">{i + 1}.</span>
                <span className="font-medium text-fg">{k}</span>
                <span className="text-sm text-muted">{v}</span>
              </li>
            ))}
          </ol>
        </div>
        <p className="font-mono text-xs text-faint">{settings.site_short || "Mibers 26"}</p>
      </aside>
      <div className="flex flex-col px-5 py-5 sm:px-10">
        <div className="flex items-center justify-between gap-3">
          <Breadcrumbs items={[{ label: "Masuk", href: "/login" }, { label: "Lupa kata sandi" }]} />
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
          <p className="eyebrow mt-8 lg:mt-0">Lupa kata sandi</p>
          <h1 className="mt-2 text-3xl font-bold">Atur ulang kata sandi</h1>
          <p className="mt-2 text-[15px] leading-relaxed text-muted">Kami kirim kode ke email akunmu. Tidak perlu lapor pengurus.</p>
          <ResetForm />
          <p className="mt-8 text-center text-sm text-muted">
            Sudah ingat?{" "}
            <Link href="/login" className="font-semibold text-brand hover:underline">
              Kembali ke halaman masuk
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
