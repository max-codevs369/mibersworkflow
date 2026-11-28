"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { X } from "lucide-react";
import { armSound, playSound } from "@/lib/sound";

type Notice = { key: number; title: string; body: string; url: string; icon: string };

export default function InAppNotice() {
  const router = useRouter();
  const pathname = usePathname();
  const [items, setItems] = useState<Notice[]>([]);
  const seq = useRef(0);

  useEffect(() => {
    armSound();
    if (!("serviceWorker" in navigator)) return;
    const onMessage = (e: MessageEvent) => {
      const d = e.data;
      if (!d || d.type !== "m26-notice") return;
      const n: Notice = {
        key: ++seq.current,
        title: String(d.title ?? ""),
        body: String(d.body ?? ""),
        url: typeof d.url === "string" && d.url.startsWith("/") ? d.url : "/",
        icon: typeof d.icon === "string" && d.icon.startsWith("/") ? d.icon : "/icon.png",
      };
      setItems((list) => [n, ...list].slice(0, 3));
      playSound(d.kind === "message" ? "message" : "notice");
      setTimeout(() => setItems((list) => list.filter((x) => x.key !== n.key)), 5500);
    };
    navigator.serviceWorker.addEventListener("message", onMessage);
    return () => navigator.serviceWorker.removeEventListener("message", onMessage);
  }, []);

  useEffect(() => {
    const m = pathname.match(/^\/obrolan\/([a-z0-9_]+)$/i);
    if (!m || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.ready
      .then((reg) => reg.active?.postMessage({ type: "m26-clear", tag: `chat-${m[1]}` }))
      .catch(() => {});
  }, [pathname]);

  if (items.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-2 z-[120] flex flex-col items-center gap-2 px-2 sm:top-4">
      {items.map((n) => (
        <div
          key={n.key}
          role="status"
          className="pointer-events-auto flex w-full max-w-sm animate-drop items-start gap-3 rounded-2xl bg-wa-panel p-3 pr-2 text-wa-text shadow-2xl shadow-black/40 ring-1 ring-black/10"
        >
          <button
            type="button"
            onClick={() => {
              setItems((list) => list.filter((x) => x.key !== n.key));
              router.push(n.url);
            }}
            className="flex min-w-0 flex-1 items-start gap-3 text-left"
          >
            <img src={n.icon} alt="" className="h-11 w-11 flex-none rounded-full bg-wa-active object-cover" />
            <span className="min-w-0 flex-1">
              <span className="flex items-baseline justify-between gap-2">
                <span className="truncate text-[15px] font-semibold">{n.title}</span>
                <span className="flex-none text-[11px] text-wa-green">sekarang</span>
              </span>
              <span className="mt-0.5 line-clamp-2 text-sm leading-snug text-wa-meta">{n.body}</span>
            </span>
          </button>
          <button
            type="button"
            aria-label="Tutup"
            onClick={() => setItems((list) => list.filter((x) => x.key !== n.key))}
            className="flex h-7 w-7 flex-none items-center justify-center rounded-full text-wa-meta hover:bg-wa-active hover:text-wa-text"
          >
            <X size={15} />
          </button>
        </div>
      ))}
    </div>
  );
}
