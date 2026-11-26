import Link from "next/link";
import { btn } from "@/lib/ui";

export default function NotFound() {
  return (
    <section className="mx-auto flex min-h-[60dvh] max-w-lg flex-col items-center justify-center px-5 py-16 text-center">
      <p className="font-mono text-sm text-brand">404</p>
      <h1 className="mt-2 text-3xl font-bold">Halaman tidak ditemukan</h1>
      <p className="mt-3 text-muted">Mungkin sudah dipindah, dihapus, atau alamatnya salah ketik.</p>
      <div className="mt-7 flex flex-wrap justify-center gap-2">
        <Link href="/" className={btn.primary}>
          Ke beranda
        </Link>
        <Link href="/pengumuman" className={btn.secondary}>
          Lihat pengumuman
        </Link>
      </div>
    </section>
  );
}
