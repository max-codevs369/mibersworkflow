"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Check, RotateCcw, SlidersHorizontal, X } from "lucide-react";
import { cx } from "@/lib/ui";

export type FilterOption = { label: string; hint?: string; href: string; active: boolean; count?: number };
export type FilterSection = { title: string; kind: "list" | "chips"; options: FilterOption[] };

export default function FilterMenu({
  sections,
  activeCount,
  resetHref,
}: {
  sections: FilterSection[];
  activeCount: number;
  resetHref: string;
}) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={box} className="relative flex-none">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={activeCount ? `Filter, ${activeCount} aktif` : "Filter"}
        className={cx(
          "relative flex h-11 items-center gap-2 rounded-lg border px-3 text-sm font-medium transition",
          open || activeCount
            ? "border-brand/60 bg-brand/10 text-brand"
            : "border-line bg-surface text-muted hover:border-line-strong hover:text-fg"
        )}
      >
        <SlidersHorizontal size={18} />
        <span className="hidden sm:inline">Filter</span>
        {activeCount > 0 && (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1 text-[11px] font-semibold text-ink">
            {activeCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40 bg-black/60 md:hidden" aria-hidden onClick={() => setOpen(false)} />
          <div
            role="dialog"
            aria-label="Pilihan filter"
            className={cx(
              "fixed inset-x-0 bottom-0 z-50 max-h-[80dvh] overflow-y-auto rounded-t-2xl border-t border-line-strong bg-surface p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] shadow-2xl",
              "md:absolute md:inset-x-auto md:bottom-auto md:right-0 md:top-[calc(100%+8px)] md:w-[340px] md:rounded-xl md:border md:p-4 md:pb-4",
              "animate-drop"
            )}
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-line-strong md:hidden" aria-hidden />
            <div className="mb-3 flex items-center justify-between">
              <p className="text-base font-semibold">Filter</p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Tutup"
                className="flex h-8 w-8 items-center justify-center rounded-md text-muted hover:text-fg"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid gap-5">
              {sections.map((s) => (
                <section key={s.title}>
                  <p className="mb-2 text-xs font-medium uppercase tracking-wider text-faint">{s.title}</p>
                  {s.kind === "list" ? (
                    <div className="grid gap-1">
                      {s.options.map((o) => (
                        <Link
                          key={o.label}
                          href={o.href}
                          scroll={false}
                          onClick={() => setOpen(false)}
                          aria-current={o.active ? "true" : undefined}
                          className={cx(
                            "flex items-center gap-3 rounded-lg px-3 py-2.5 transition",
                            o.active ? "bg-brand/10" : "hover:bg-surface-2"
                          )}
                        >
                          <span
                            className={cx(
                              "flex h-[18px] w-[18px] flex-none items-center justify-center rounded-full border-2",
                              o.active ? "border-brand" : "border-line-strong"
                            )}
                          >
                            {o.active && <span className="h-2 w-2 rounded-full bg-brand" />}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className={cx("block text-sm font-medium", o.active ? "text-brand" : "text-fg")}>{o.label}</span>
                            {o.hint && <span className="block text-xs text-muted">{o.hint}</span>}
                          </span>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {s.options.map((o) => (
                        <Link
                          key={o.label}
                          href={o.href}
                          scroll={false}
                          onClick={() => setOpen(false)}
                          aria-current={o.active ? "true" : undefined}
                          className={cx(
                            "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition",
                            o.active
                              ? "border-brand bg-brand text-ink"
                              : o.count === 0
                                ? "border-line/60 text-faint hover:border-line-strong hover:text-muted"
                                : "border-line text-muted hover:border-line-strong hover:text-fg"
                          )}
                        >
                          {o.active && <Check size={14} />}
                          {o.label}
                          {o.count !== undefined && (
                            <span className={cx("text-xs tabular-nums", o.active ? "text-ink/70" : "text-faint")}>{o.count}</span>
                          )}
                        </Link>
                      ))}
                    </div>
                  )}
                </section>
              ))}
            </div>

            {activeCount > 0 && (
              <Link
                href={resetHref}
                scroll={false}
                onClick={() => setOpen(false)}
                className="mt-5 flex items-center justify-center gap-2 rounded-lg border border-line py-2.5 text-sm text-muted transition hover:border-line-strong hover:text-fg"
              >
                <RotateCcw size={15} /> Hapus semua filter
              </Link>
            )}
          </div>
        </>
      )}
    </div>
  );
}
