"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CornerDownLeft, Search, X } from "lucide-react";
import { cx } from "@/lib/ui";

export type PaletteItem = {
  href: string;
  label: string;
  desc: string;
  group: string;
  icon: React.ReactNode;
  keywords?: string;
};

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

export default function CommandPalette({
  open,
  onClose,
  items,
}: {
  open: boolean;
  onClose: () => void;
  items: PaletteItem[];
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const results = useMemo(() => {
    const words = norm(q.trim()).split(/\s+/).filter(Boolean);
    if (!words.length) return items;
    return items
      .map((it) => {
        const label = norm(it.label);
        const hay = norm(`${it.label} ${it.desc} ${it.group} ${it.keywords ?? ""}`);
        if (!words.every((w) => hay.includes(w))) return null;
        const score = (label.startsWith(words[0]) ? 0 : label.includes(words[0]) ? 1 : 2) * 100 + label.length;
        return { it, score };
      })
      .filter((x): x is { it: PaletteItem; score: number } => x !== null)
      .sort((a, b) => a.score - b.score)
      .map((x) => x.it);
  }, [items, q]);

  const searching = q.trim().length > 0;
  const current = Math.min(active, Math.max(results.length - 1, 0));

  useEffect(() => {
    if (!open) return;
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    const t = requestAnimationFrame(() => inputRef.current?.focus());
    return () => {
      cancelAnimationFrame(t);
      document.documentElement.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${current}"]`)?.scrollIntoView({ block: "nearest" });
  }, [current]);

  if (!open) return null;

  function close() {
    setQ("");
    setActive(0);
    onClose();
  }

  function go(item?: PaletteItem) {
    if (!item) return;
    close();
    router.push(item.href);
  }

  let lastGroup = "";

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center bg-black/70 px-3 pt-[10vh] backdrop-blur-sm sm:pt-[14vh]" onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Cari halaman"
        className="flex max-h-[75dvh] w-full max-w-xl animate-drop flex-col overflow-hidden rounded-2xl border border-line-strong bg-surface shadow-2xl shadow-black/60"
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            close();
          } else if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((current + 1) % Math.max(results.length, 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((current - 1 + results.length) % Math.max(results.length, 1));
          } else if (e.key === "Enter") {
            e.preventDefault();
            go(results[current]);
          }
        }}
      >
        <div className="flex items-center gap-3 border-b border-line px-4">
          <Search size={19} className="flex-none text-muted" aria-hidden />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setActive(0);
            }}
            placeholder="Mau ke halaman mana?"
            aria-label="Cari halaman"
            aria-controls="hasil-cari"
            aria-activedescendant={results[current] ? `hasil-${current}` : undefined}
            className="h-14 min-w-0 flex-1 bg-transparent text-base text-fg outline-none placeholder:text-faint"
          />
          <button
            type="button"
            onClick={close}
            aria-label="Tutup"
            className="flex h-8 items-center gap-1 rounded-md border border-line px-2 text-xs text-muted transition hover:text-fg"
          >
            <span className="hidden sm:inline">Esc</span>
            <X size={14} className="sm:hidden" />
          </button>
        </div>

        <ul id="hasil-cari" ref={listRef} role="listbox" className="min-h-0 flex-1 overflow-y-auto p-2">
          {results.length === 0 ? (
            <li className="px-4 py-10 text-center text-sm text-muted">
              Tidak ada halaman untuk “{q.trim()}”.
            </li>
          ) : (
            results.map((it, i) => {
              const heading = !searching && it.group !== lastGroup ? it.group : null;
              lastGroup = it.group;
              const on = i === current;
              return (
                <li key={it.href} role="presentation">
                  {heading && <p className="px-3 pb-1.5 pt-3 text-xs font-semibold uppercase tracking-wider text-faint first:pt-1">{heading}</p>}
                  <button
                    type="button"
                    id={`hasil-${i}`}
                    role="option"
                    aria-selected={on}
                    data-index={i}
                    onMouseMove={() => setActive(i)}
                    onClick={() => go(it)}
                    className={cx(
                      "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition",
                      on ? "bg-surface-3" : "hover:bg-surface-2"
                    )}
                  >
                    <span
                      className={cx(
                        "flex h-9 w-9 flex-none items-center justify-center rounded-lg border",
                        on ? "border-brand/40 bg-brand/15 text-brand" : "border-line bg-surface-2 text-muted"
                      )}
                    >
                      {it.icon}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-fg">{it.label}</span>
                      <span className="block truncate text-xs text-muted">
                        {searching ? `${it.group} · ${it.desc}` : it.desc}
                      </span>
                    </span>
                    {on && <CornerDownLeft size={15} className="flex-none text-muted" aria-hidden />}
                  </button>
                </li>
              );
            })
          )}
        </ul>

        <div className="hidden items-center gap-4 border-t border-line px-4 py-2.5 text-xs text-faint sm:flex">
          <span className="flex items-center gap-1.5">
            <Kbd>↑</Kbd>
            <Kbd>↓</Kbd> pilih
          </span>
          <span className="flex items-center gap-1.5">
            <Kbd>Enter</Kbd> buka
          </span>
          <span className="ml-auto flex items-center gap-1.5">
            <Kbd>Ctrl</Kbd>
            <Kbd>K</Kbd> buka / tutup
          </span>
        </div>
      </div>
    </div>
  );
}

export function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded border border-line-strong bg-surface-2 px-1 font-sans text-[11px] font-medium text-muted">
      {children}
    </kbd>
  );
}
