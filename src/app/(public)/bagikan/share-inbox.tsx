"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FileText, LoaderCircle, ReceiptText, Share2, Wallet, X } from "lucide-react";
import { btn, card, cx } from "@/lib/ui";

type Shared = { blob: Blob; name: string; url: string | null };

const CACHE = "m26-share";
const KEY = "/bagikan/file";

async function readShared(): Promise<Shared | null> {
  if (!("caches" in window)) return null;
  const cache = await caches.open(CACHE);
  const res = await cache.match(KEY);
  if (!res) return null;
  const blob = await res.blob();
  const name = decodeURIComponent(res.headers.get("x-file-name") || "bukti");
  return { blob, name, url: blob.type.startsWith("image/") ? URL.createObjectURL(blob) : null };
}

async function clearShared() {
  if ("caches" in window) await (await caches.open(CACHE)).delete(KEY);
}

export default function ShareInbox() {
  const [shared, setShared] = useState<Shared | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let url: string | null = null;
    readShared()
      .then((s) => {
        url = s?.url ?? null;
        setShared(s);
      })
      .catch(() => setShared(null));
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, []);

  async function useForKas() {
    if (!shared) return;
    setBusy(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.set("file", new File([shared.blob], shared.name, { type: shared.blob.type }));
      const res = await fetch("/api/bagikan", { method: "POST", body: fd });
      const data = (await res.json().catch(() => ({}))) as { token?: string; error?: string };
      if (!res.ok || !data.token) throw new Error(data.error || "Bukti gagal dikirim. Coba lagi.");
      await clearShared();
      window.location.href = `/kas?to=${encodeURIComponent(`/bayar?bukti=${data.token}`)}`;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Bukti gagal dikirim. Coba lagi.");
      setBusy(false);
    }
  }

  async function discard() {
    await clearShared();
    setShared(null);
  }

  if (shared === undefined) {
    return (
      <div className={cx(card, "flex items-center justify-center gap-2 p-10 text-muted")}>
        <LoaderCircle size={18} className="animate-spin" /> Membuka file yang dibagikan…
      </div>
    );
  }

  if (!shared) {
    return (
      <div className={cx(card, "grid justify-items-center gap-3 p-8 text-center")}>
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand/15 text-brand">
          <Share2 size={22} />
        </span>
        <h1 className="text-lg font-bold">Belum ada bukti yang dibagikan</h1>
        <p className="text-sm text-muted">
          Setelah bayar kas lewat GoPay atau e-wallet lain, buka bukti bayarnya, tekan <b>Bagikan</b>, lalu pilih <b>Mibers Duo Anam</b>. Bukti
          akan langsung terlampir di halaman Bayar kas.
        </p>
        <p className="text-xs text-faint">Fitur bagikan tersedia di Android jika website ini sudah dipasang ke layar utama.</p>
        <a href="/kas" className={btn.secondary}>
          <Wallet size={16} /> Buka kas kelas
        </a>
      </div>
    );
  }

  return (
    <div className={cx(card, "overflow-hidden")}>
      <div className="flex items-center gap-3 border-b border-line bg-surface-2/60 px-5 py-4">
        <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-brand/15 text-brand">
          <ReceiptText size={20} />
        </span>
        <div className="min-w-0">
          <h1 className="font-bold">Bukti bayar kas</h1>
          <p className="truncate text-xs text-muted">{shared.name}</p>
        </div>
      </div>
      <div className="grid gap-4 p-5">
        {shared.url ? (
          <img src={shared.url} alt="Bukti yang dibagikan" className="mx-auto max-h-[55vh] w-auto rounded-lg border border-line bg-white object-contain" />
        ) : (
          <div className="flex items-center gap-3 rounded-lg border border-line p-4 text-sm">
            <FileText size={22} className="flex-none text-brand" /> {shared.name}
          </div>
        )}
        <p className="text-sm text-muted">Bukti ini akan dilampirkan ke pembayaran kas. Kamu tinggal memilih tagihan lalu mengirim pengajuan.</p>
        {error && <p className="text-sm text-danger">{error}</p>}
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={useForKas} disabled={busy} className={cx(btn.primary, "flex-1")}>
            {busy ? <LoaderCircle size={16} className="animate-spin" /> : <Wallet size={16} />} Pakai untuk bayar kas
          </button>
          <button type="button" onClick={discard} disabled={busy} className={btn.ghost}>
            <X size={16} /> Buang
          </button>
        </div>
        <Link href="/" className="text-center text-xs text-faint hover:text-muted">
          Kembali ke beranda
        </Link>
      </div>
    </div>
  );
}
