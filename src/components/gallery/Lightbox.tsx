"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Download, Play, X } from "lucide-react";
import { cx } from "@/lib/ui";
import SafeImg from "@/components/ui/SafeImg";

export type GalleryItem = {
  id: string;
  url: string;
  type: "PHOTO" | "VIDEO";
  caption: string | null;
  by: string;
};

export default function Lightbox({ items }: { items: GalleryItem[] }) {
  const [index, setIndex] = useState<number | null>(null);
  const ref = useRef<HTMLDialogElement>(null);
  const touch = useRef<number | null>(null);

  const open = index !== null;
  const item = open ? items[index] : null;

  const go = useCallback(
    (dir: 1 | -1) => setIndex((i) => (i === null ? i : (i + dir + items.length) % items.length)),
    [items.length]
  );

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, go]);

  return (
    <>
      <div className="grid grid-flow-dense grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4">
        {items.map((m, i) => (
          <button
            key={m.id}
            type="button"
            onClick={() => setIndex(i)}
            className={cx(
              "group relative block aspect-square w-full overflow-hidden rounded-lg border border-line bg-surface-2 text-left",
              items.length > 2 && i % 7 === 0 && "col-span-2 row-span-2"
            )}
            aria-label={m.caption ? `Buka foto: ${m.caption}` : `Buka foto ${i + 1}`}
          >
            {m.type === "VIDEO" ? (
              <>
                <video src={`${m.url}#t=0.1`} preload="metadata" muted playsInline className="h-full w-full object-cover" />
                <span className="absolute inset-0 flex items-center justify-center">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-ink/70 text-fg">
                    <Play size={22} />
                  </span>
                </span>
              </>
            ) : (
              <SafeImg
                src={m.url}
                alt={m.caption ?? ""}
                width={384}
                eager={i < 8}
                className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                fallback={<span className="flex h-full w-full items-center justify-center bg-surface-3 text-xs text-faint">File tidak ditemukan</span>}
              />
            )}
            {m.caption && (
              <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/90 to-transparent p-3 pt-8 text-sm font-medium opacity-0 transition group-hover:opacity-100">
                {m.caption}
              </span>
            )}
          </button>
        ))}
      </div>
      <dialog
        ref={ref}
        onClose={() => setIndex(null)}
        onCancel={(e) => {
          e.preventDefault();
          setIndex(null);
        }}
        className="m-0 h-dvh max-h-none w-screen max-w-none bg-ink p-0 text-fg backdrop:bg-black/90"
      >
        {item && (
          <div
            className="relative flex h-full flex-col"
            onTouchStart={(e) => (touch.current = e.touches[0].clientX)}
            onTouchEnd={(e) => {
              if (touch.current === null) return;
              const dx = e.changedTouches[0].clientX - touch.current;
              if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
              touch.current = null;
            }}
          >
            <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
              <span className="text-sm tabular-nums text-muted">
                {(index ?? 0) + 1} / {items.length}
              </span>
              <div className="flex items-center gap-1">
                <a
                  href={item.url}
                  download
                  className="flex h-11 w-11 items-center justify-center rounded-lg text-muted transition hover:bg-surface-2 hover:text-fg"
                  aria-label="Unduh"
                >
                  <Download size={20} />
                </a>
                <button
                  type="button"
                  onClick={() => setIndex(null)}
                  className="flex h-11 w-11 items-center justify-center rounded-lg text-muted transition hover:bg-surface-2 hover:text-fg"
                  aria-label="Tutup"
                >
                  <X size={22} />
                </button>
              </div>
            </div>
            <div
              className="relative flex min-h-0 flex-1 items-center justify-center px-2 sm:px-16"
              onClick={(e) => e.target === e.currentTarget && setIndex(null)}
            >
              {item.type === "VIDEO" ? (
                <video key={item.id} src={item.url} controls autoPlay playsInline className="max-h-full max-w-full rounded-lg" />
              ) : (
                <img key={item.id} src={item.url} alt={item.caption ?? ""} className="max-h-full max-w-full animate-fade-up rounded-lg object-contain" />
              )}

              {items.length > 1 && (
                <>
                  <NavBtn side="left" onClick={() => go(-1)} />
                  <NavBtn side="right" onClick={() => go(1)} />
                </>
              )}
            </div>
            <div className="px-4 py-4 text-center sm:px-6">
              {item.caption && <p className="font-medium">{item.caption}</p>}
              <p className="text-xs text-faint">diunggah oleh {item.by}</p>
            </div>
          </div>
        )}
      </dialog>
    </>
  );
}

function NavBtn({ side, onClick }: { side: "left" | "right"; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={side === "left" ? "Sebelumnya" : "Berikutnya"}
      className={cx(
        "absolute top-1/2 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-surface/80 text-fg transition hover:bg-brand hover:text-ink sm:flex",
        side === "left" ? "left-3" : "right-3"
      )}
    >
      {side === "left" ? <ChevronLeft size={24} /> : <ChevronRight size={24} />}
    </button>
  );
}
