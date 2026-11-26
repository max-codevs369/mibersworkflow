"use client";

import { btn } from "@/lib/ui";

export default function AdminError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-md py-20 text-center">
      <p className="font-mono text-sm text-danger">Gagal memuat</p>
      <h1 className="mt-2 text-2xl font-bold">Halaman ini tidak bisa dibuka</h1>
      <p className="mt-2 text-muted">Coba lagi. Kalau berulang, periksa koneksi database.</p>
      <button type="button" onClick={() => reset()} className={`${btn.primary} mt-6`}>
        Coba lagi
      </button>
    </div>
  );
}
