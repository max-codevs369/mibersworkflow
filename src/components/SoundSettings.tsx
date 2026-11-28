"use client";

import { useState, useSyncExternalStore } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { playSound, setSoundEnabled, soundEnabled } from "@/lib/sound";
import { clientOnly } from "@/lib/push-client";
import { btn, cx } from "@/lib/ui";

export default function SoundSettings() {
  const stored = useSyncExternalStore(clientOnly.subscribe, soundEnabled, () => true);
  const [override, setOverride] = useState<boolean | null>(null);
  const on = override ?? stored;

  const toggle = () => {
    const next = !on;
    setSoundEnabled(next);
    setOverride(next);
    if (next) playSound("notice", true);
  };

  return (
    <section className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface p-5">
      <div className="flex min-w-0 gap-3">
        <span className={cx("flex h-10 w-10 flex-none items-center justify-center rounded-full", on ? "bg-ok/15 text-ok" : "bg-surface-2 text-faint")}>
          {on ? <Volume2 size={20} /> : <VolumeX size={20} />}
        </span>
        <div className="min-w-0">
          <p className="font-semibold">Suara notifikasi</p>
          <p className="text-sm text-muted">
            {on ? "Berbunyi saat ada notifikasi atau pesan baru di website." : "Notifikasi muncul tanpa suara di website."}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => playSound("notice", true)} className={btn.sm}>
          Coba notifikasi
        </button>
        <button type="button" onClick={() => playSound("chat", true)} className={btn.sm}>
          Coba pesan
        </button>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-label="Suara notifikasi"
          onClick={toggle}
          className={cx("relative h-7 w-12 flex-none rounded-full transition", on ? "bg-brand" : "bg-line-strong")}
        >
          <span className={cx("absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all", on ? "left-6" : "left-1")} />
        </button>
      </div>
    </section>
  );
}
