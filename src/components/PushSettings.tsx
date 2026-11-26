"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { BellOff, BellRing, CircleAlert, CircleCheck, LoaderCircle, Send, Smartphone } from "lucide-react";
import { clientOnly, disablePushHere, enablePush, pushState, syncPush, type PushState } from "@/lib/push-client";
import { sendTestPush } from "@/app/push-actions";
import { btn, cx } from "@/lib/ui";

export default function PushSettings({ publicKey, devices }: { publicKey: string | null; devices: number }) {
  const detected = useSyncExternalStore(clientOnly.subscribe, pushState, () => null);
  const [override, setState] = useState<PushState | null>(null);
  const [busy, setBusy] = useState<"" | "on" | "off" | "test">("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const state = override ?? detected;

  useEffect(() => {
    if (detected === "granted" && publicKey) syncPush(publicKey).catch(() => {});
  }, [publicKey, detected]);

  async function run(kind: "on" | "off" | "test", fn: () => Promise<void>) {
    setBusy(kind);
    setMsg(null);
    try {
      await fn();
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Terjadi kesalahan." });
    } finally {
      setBusy("");
    }
  }

  const on = state === "granted";
  const status: Record<PushState, { text: string; tone: string }> = {
    granted: { text: "Aktif di perangkat ini", tone: "text-ok" },
    default: { text: "Belum diaktifkan", tone: "text-gold" },
    denied: { text: "Diblokir oleh browser", tone: "text-danger" },
    "ios-install": { text: "Perlu dipasang ke Layar Utama dulu", tone: "text-gold" },
    unsupported: { text: "Browser ini belum mendukung", tone: "text-faint" },
  };

  return (
    <section className="mb-6 rounded-xl border border-line bg-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 gap-3">
          <span className={cx("flex h-10 w-10 flex-none items-center justify-center rounded-full", on ? "bg-ok/15 text-ok" : "bg-brand/15 text-brand")}>
            {on ? <BellRing size={20} /> : <BellOff size={20} />}
          </span>
          <div className="min-w-0">
            <p className="font-semibold">Notifikasi ke HP / laptop</p>
            <p className={cx("text-sm font-medium", state ? status[state].tone : "text-faint")}>
              {state ? status[state].text : "Memeriksa…"}
              <span className="font-normal text-faint"> · {devices} perangkat terdaftar</span>
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {state === "default" && publicKey && (
            <button
              type="button"
              disabled={!!busy}
              onClick={() =>
                run("on", async () => {
                  const st = await enablePush(publicKey);
                  setState(st);
                  setMsg(st === "granted" ? { ok: true, text: "Notifikasi aktif. Coba kirim tes." } : { ok: false, text: "Izin notifikasi tidak diberikan." });
                })
              }
              className={btn.primary}
            >
              {busy === "on" ? <LoaderCircle size={16} className="animate-spin" /> : <BellRing size={16} />} Aktifkan
            </button>
          )}
          {on && (
            <>
              <button
                type="button"
                disabled={!!busy}
                onClick={() =>
                  run("test", async () => {
                    const r = await sendTestPush();
                    setMsg(r.error ? { ok: false, text: r.error } : { ok: true, text: "Tes terkirim. Notifikasi akan muncul dalam beberapa detik." });
                  })
                }
                className={btn.secondary}
              >
                {busy === "test" ? <LoaderCircle size={16} className="animate-spin" /> : <Send size={16} />} Kirim tes
              </button>
              <button
                type="button"
                disabled={!!busy}
                onClick={() =>
                  run("off", async () => {
                    await disablePushHere();
                    setMsg({ ok: true, text: "Perangkat ini tidak akan menerima push lagi. Notifikasi tetap tersimpan di halaman ini." });
                    setState("default");
                  })
                }
                className={btn.ghost}
              >
                Matikan di sini
              </button>
            </>
          )}
        </div>
      </div>
      {state === "denied" && (
        <p className="mt-3 text-sm leading-relaxed text-muted">
          Klik ikon gembok di sebelah alamat situs → <b>Notifikasi</b> → <b>Izinkan</b>, lalu muat ulang halaman ini.
        </p>
      )}
      {state === "ios-install" && (
        <p className="mt-3 flex gap-2 text-sm leading-relaxed text-muted">
          <Smartphone size={16} className="mt-0.5 flex-none" />
          Buka situs ini di Safari, ketuk <b>Bagikan</b> → <b>Tambah ke Layar Utama</b>, lalu buka dari ikon baru di layar utama dan aktifkan notifikasi di sini.
        </p>
      )}
      {msg && (
        <p className={cx("mt-3 flex items-start gap-2 text-sm font-medium", msg.ok ? "text-ok" : "text-danger")}>
          {msg.ok ? <CircleCheck size={16} className="mt-0.5 flex-none" /> : <CircleAlert size={16} className="mt-0.5 flex-none" />}
          {msg.text}
        </p>
      )}
      <p className="mt-3 text-xs text-faint">
        Yang dikirim: pengumuman, materi baru, agenda &amp; pengingat H-1, giliran piket pagi hari, pesan obrolan, dan kabar foto/catatanmu.
      </p>
    </section>
  );
}
