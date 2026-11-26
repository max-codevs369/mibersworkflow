import Link from "next/link";
import Slogan from "@/components/Slogan";
import type { Settings } from "@/lib/settings";
import { InstagramIcon } from "@/components/ui/bits";

const COLS = [
  {
    title: "Kelas",
    links: [
      { href: "/tentang", label: "Tentang kami" },
      { href: "/struktur", label: "Struktur organisasi" },
      { href: "/agenda", label: "Agenda & jadwal" },
    ],
  },
  {
    title: "Kabar",
    links: [
      { href: "/pengumuman", label: "Pengumuman" },
      { href: "/materi", label: "Materi kuliah" },
    ],
  },
  {
    title: "Ruang bersama",
    links: [
      { href: "/dinding", label: "Dinding catatan" },
      { href: "/kenangan", label: "Galeri kenangan" },
      { href: "/obrolan", label: "Ruang obrolan" },
    ],
  },
];

export default function Footer({ settings }: { settings: Settings }) {
  const year = new Date().getFullYear();
  const [first, ...rest] = settings.site_name.split(" ");
  const campus = [
    settings.study_program,
    settings.department && `Jurusan ${settings.department.replace(/^jurusan\s+/i, "")}`,
    settings.school_name,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <footer className="mt-20 border-t border-line bg-surface">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.2fr_2fr] lg:px-8">
        <div className="min-w-0">
          <Link href="/" className="inline-flex items-center gap-3">
            <img src="/logo.webp" alt="" width={40} height={40} className="h-10 w-10 rounded-lg" />
            <span className="font-display text-xl font-bold">
              {first} <span className="text-brand">{rest.join(" ")}</span>
            </span>
          </Link>
          {settings.site_tagline && <Slogan text={settings.site_tagline} size="sm" className="mt-3" />}
          <p className="mt-1.5 text-xs italic text-faint">Sekali Mibers, selamanya keluarga.</p>
          {campus && <p className="mt-4 font-mono text-xs uppercase tracking-wider text-muted">{campus}</p>}
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted">{settings.site_description}</p>
          <a
            href={settings.instagram}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 inline-flex min-h-10 items-center gap-2 rounded-lg border border-line-strong px-3.5 text-sm font-medium text-fg transition hover:border-brand hover:text-brand"
          >
            <InstagramIcon size={17} />
            Instagram kelas
          </a>
        </div>
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
          {COLS.map((c) => (
            <nav key={c.title} aria-label={c.title} className="grid content-start gap-2.5">
              <p className="font-mono text-[11px] uppercase tracking-wider text-faint">{c.title}</p>
              {c.links.map((l) => (
                <Link key={l.href} href={l.href} className="w-fit text-sm text-muted transition hover:text-fg">
                  {l.label}
                </Link>
              ))}
            </nav>
          ))}
        </div>
      </div>
      <div className="border-t border-line">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-5 text-xs text-faint sm:px-6 lg:px-8">
          <p>
            © {year} {settings.site_name}
            {settings.class_year ? ` · Angkatan ${settings.class_year}` : ""}
          </p>
          <nav aria-label="Legal" className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <Link href="/privasi" className="transition hover:text-fg">
              Kebijakan Privasi
            </Link>
            <Link href="/ketentuan" className="transition hover:text-fg">
              Ketentuan Layanan
            </Link>
            <a href="#konten" className="transition hover:text-fg">
              Kembali ke atas ↑
            </a>
          </nav>
        </div>
      </div>
    </footer>
  );
}
