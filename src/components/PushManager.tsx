"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { BellRing, LoaderCircle, Share, X } from "lucide-react";
import { clientOnly, enablePush, pushState, syncPush, type PushState } from "@/lib/push-client";
import { btn, cx } from "@/lib/ui";

const SNOOZE_KEY = "m26-push-snooze";
const SNOOZE_MS = 24 * 3_600_000;

export default function PushManager({ publicKey }: { publicKey: string | null }) {
  const detected = useSyncExternalStore(clientOnly.subscribe, pushState, () => null);
  const snoozed = useSyncExternalStore(
    clientOnly.subscribe,
    () => Date.now() - Number(localStorage.getItem(SNOOZE_KEY) || 0) < SNOOZE_MS,
    () => true
  );
  const [override, setState] = useState<PushState | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const state = override ?? detected;

  useEffect(() => {
    if (publicKey && detected === "granted") syncPush(publicKey).catch(() => {});
  }, [publicKey, detected]);

  if (!publicKey || snoozed || dismissed || !state || state === "granted" || state === "unsupported" || state === "denied") return null;

  const snooze = () => {
    localStorage.setItem(SNOOZE_KEY, String(Date.now()));
    setDismissed(true);
  };

  async function turnOn() {
    if (!publicKey) return;
    setBusy(true);
    setError("");
    try {
      const st = await enablePush(publicKey);
      setState(st);
      if (st === "denied") setError("Notifikasi diblokir browser. Buka pengaturan situs untuk mengizinkannya.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal mengaktifkan notifikasi.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-label="Aktifkan notifikasi"
      className="fixed inset-x-3 bottom-3 z-[90] mx-auto max-w-md animate-drop rounded-xl border border-line bg-surface p-4 shadow-2xl shadow-black/30 sm:bottom-5 sm:left-auto sm:right-5 sm:mx-0"
    >
      <button type="button" onClick={snooze} aria-label="Nanti saja" className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-md text-faint hover:text-fg">
        <X size={16} />
      </button>
      <div className="flex gap-3 pr-6">
        <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-brand/15 text-brand">
          <BellRing size={20} />
        </span>
        <div className="min-w-0">
          <p className="font-semibold leading-snug">Nyalakan notifikasi, biar nggak ketinggalan</p>
          {state === "ios-install" ? (
            <p className="mt-1 text-sm leading-relaxed text-muted">
              Di iPhone/iPad, notifikasi hanya jalan kalau situs ini dipasang dulu: ketuk <Share size={13} className="inline -translate-y-px" />{" "}
              <b>Bagikan</b> → <b>Tambah ke Layar Utama</b>, lalu buka dari ikon itu.
            </p>
          ) : (
            <p className="mt-1 text-sm leading-relaxed text-muted">
              Pengumuman, materi baru, pesan obrolan, agenda, dan giliran piket langsung masuk ke HP atau laptopmu.
            </p>
          )}
          {error && <p className="mt-2 text-sm font-medium text-danger">{error}</p>}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {state === "default" && (
              <button type="button" onClick={turnOn} disabled={busy} className={cx(btn.primary, "min-h-10")}>
                {busy ? <LoaderCircle size={16} className="animate-spin" /> : <BellRing size={16} />} Aktifkan notifikasi
              </button>
            )}
            <Link href="/akun/notifikasi" onClick={snooze} className="text-sm font-medium text-muted hover:text-fg">
              Atur di halaman notifikasi
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
