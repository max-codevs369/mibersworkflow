"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { useInitialTheme, type ThemeMode } from "@/components/ThemeProvider";
import { cx } from "@/lib/ui";

const COOKIE = "m26-theme";
const EVENT = "m26-theme-change";
const OPTIONS: { value: ThemeMode; label: string; icon: (size: number) => React.ReactNode }[] = [
  { value: "light", label: "Terang", icon: (s) => <Sun size={s} /> },
  { value: "dark", label: "Gelap", icon: (s) => <Moon size={s} /> },
  { value: "system", label: "Perangkat", icon: (s) => <Monitor size={s} /> },
];

function readMode(): ThemeMode {
  const m = document.cookie.match(/(?:^|;\s*)m26-theme=(light|dark)(?:;|$)/);
  return m ? (m[1] as ThemeMode) : "system";
}

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  window.addEventListener("focus", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("focus", cb);
  };
}

function applyMode(mode: ThemeMode, origin?: { x: number; y: number }) {
  const root = document.documentElement;
  const set = () => {
    if (mode === "system") {
      root.removeAttribute("data-theme");
      document.cookie = `${COOKIE}=; path=/; max-age=0; samesite=lax`;
    } else {
      root.setAttribute("data-theme", mode);
      document.cookie = `${COOKIE}=${mode}; path=/; max-age=31536000; samesite=lax`;
    }
    window.dispatchEvent(new Event(EVENT));
  };
  const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown };
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (origin && doc.startViewTransition && !reduce) {
    root.style.setProperty("--tx", `${origin.x}px`);
    root.style.setProperty("--ty", `${origin.y}px`);
    root.style.setProperty(
      "--tr",
      `${Math.hypot(Math.max(origin.x, innerWidth - origin.x), Math.max(origin.y, innerHeight - origin.y))}px`
    );
    doc.startViewTransition(set);
  } else set();
}

export default function ThemeToggle({
  variant = "menu",
  size = "md",
}: {
  variant?: "menu" | "segmented";
  size?: "md" | "sm";
}) {
  const initial = useInitialTheme();
  const mode = useSyncExternalStore(subscribe, readMode, () => initial);
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  const choose = (m: ThemeMode, e: React.MouseEvent) => {
    setOpen(false);
    if (m === mode) return;
    applyMode(m, { x: e.clientX, y: e.clientY });
  };
  const current = OPTIONS.find((o) => o.value === mode) ?? OPTIONS[2];

  if (variant === "segmented") {
    const sm = size === "sm";
    return (
      <div
        role="radiogroup"
        aria-label="Tema tampilan"
        className={cx("grid w-full grid-cols-3 gap-1 rounded-xl border border-line bg-surface-2", sm ? "p-0.5" : "p-1")}
      >
        {OPTIONS.map((o) => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={mode === o.value}
            aria-label={`Tema ${o.label}`}
            title={o.label}
            onClick={(e) => choose(o.value, e)}
            className={cx(
              "flex min-w-0 items-center justify-center rounded-lg font-medium transition",
              sm ? "min-h-11 flex-col gap-0.5 px-1 text-[11px]" : "min-h-10 gap-1.5 text-sm",
              mode === o.value ? "bg-brand text-ink shadow-sm" : "text-muted hover:bg-surface-3 hover:text-fg"
            )}
          >
            {o.icon(sm ? 15 : 16)}
            <span className="truncate">{o.label}</span>
          </button>
        ))}
      </div>
    );
  }

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`Tema: ${current.label}`}
        aria-expanded={open}
        aria-haspopup="menu"
        title={`Tema: ${current.label}`}
        className="flex h-10 w-10 items-center justify-center rounded-lg text-muted transition hover:bg-surface-2 hover:text-fg"
      >
        <span key={mode} className="animate-drop">
          {current.icon(18)}
        </span>
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+8px)] z-50 w-[min(14rem,calc(100vw-2rem))] animate-drop rounded-xl border border-line-strong bg-surface p-1.5 shadow-xl shadow-black/20"
        >
          {OPTIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              role="menuitemradio"
              aria-checked={mode === o.value}
              onClick={(e) => choose(o.value, e)}
              className={cx(
                "flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-sm transition",
                mode === o.value ? "bg-surface-3 text-fg" : "text-muted hover:bg-surface-2 hover:text-fg"
              )}
            >
              <span aria-hidden className="flex h-8 w-12 flex-none overflow-hidden rounded-md border border-line-strong">
                {o.value === "system" ? (
                  <>
                    <span className="w-1/2 bg-[#f6f3ee]" />
                    <span className="w-1/2 bg-[#141311]" />
                  </>
                ) : (
                  <span className={cx("flex w-full items-end gap-0.5 p-1", o.value === "light" ? "bg-[#f6f3ee]" : "bg-[#141311]")}>
                    <span className="h-1.5 w-4 rounded-sm bg-[#f5822a]" />
                    <span className={cx("h-1.5 w-3 rounded-sm", o.value === "light" ? "bg-[#cdc3b2]" : "bg-[#433f37]")} />
                  </span>
                )}
              </span>
              <span className="flex flex-1 items-center gap-2">
                {o.icon(16)}
                {o.label}
              </span>
              {mode === o.value && <span className="h-2 w-2 rounded-full bg-brand" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
