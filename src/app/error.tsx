"use client";

import Link from "next/link";
import { btn } from "@/lib/ui";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-[70dvh] max-w-lg flex-col items-center justify-center px-5 py-16 text-center">
      <p className="font-mono text-sm text-danger">500</p>
      <h1 className="mt-2 text-3xl font-bold">Terjadi kesalahan</h1>
      <p className="mt-3 text-muted">Coba muat ulang. Kalau masih terjadi, kabari pengurus kelas.</p>
      <div className="mt-7 flex flex-wrap justify-center gap-2">
        <button type="button" onClick={() => reset()} className={btn.primary}>
          Coba lagi
        </button>
        <Link href="/" className={btn.secondary}>
          Ke beranda
        </Link>
      </div>
    </main>
  );
}
