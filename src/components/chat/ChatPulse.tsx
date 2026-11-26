"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

export default function ChatPulse({ room, interval = 1500 }: { room?: string; interval?: number }) {
  const router = useRouter();
  const last = useRef<string | null>(null);

  useEffect(() => {
    let stop = false;
    let busy = false;
    let timer: ReturnType<typeof setTimeout>;

    let delay = interval;
    const slowest = interval * 3;
    last.current = null;

    const beat = async () => {
      if (stop || busy) return;
      busy = true;
      if (document.visibilityState === "visible") {
        try {
          const res = await fetch(`/api/obrolan/pulse${room ? `?c=${encodeURIComponent(room)}` : ""}`, { cache: "no-store" });
          if (res.ok) {
            const { v } = (await res.json()) as { v: string };
            const changed = last.current !== null && v !== last.current;
            if (changed) router.refresh();
            delay = changed ? interval : Math.min(slowest, Math.round(delay * 1.25));
            last.current = v;
          }
        } catch {
          delay = Math.min(slowest, delay * 2);
        }
      }
      busy = false;
      if (!stop) timer = setTimeout(beat, delay);
    };

    beat();
    const wake = () => {
      delay = interval;
      clearTimeout(timer);
      beat();
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") wake();
    };

    const onActivity = () => {
      if (delay > interval) wake();
    };
    window.addEventListener("keydown", onActivity);
    window.addEventListener("pointerdown", onActivity);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      stop = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("keydown", onActivity);
      window.removeEventListener("pointerdown", onActivity);
    };
  }, [room, interval, router]);

  return null;
}
