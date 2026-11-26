import Link from "next/link";
import { btn } from "@/lib/ui";

export default function RootNotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col items-center justify-center px-6 text-center">
      <p className="font-display text-8xl font-extrabold text-brand">404</p>
      <h1 className="mt-4 text-2xl font-bold">Halaman tidak ditemukan</h1>
      <p className="mt-2 text-muted">Alamat yang kamu buka tidak tersedia.</p>
      <Link href="/" className={`${btn.primary} mt-7`}>
        Kembali ke beranda
      </Link>
    </main>
  );
}
