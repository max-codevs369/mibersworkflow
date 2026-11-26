"use client";

import { useRef } from "react";
import { Reply } from "lucide-react";
import { cx } from "@/lib/ui";

const TRIGGER = 64;
const MAX = 96;
const EDGE = 24;

type Gesture = { id: number; x: number; y: number; axis: "x" | "y" | null; armed: boolean };

export default function SwipeReply({
  id,
  onReply,
  disabled,
  className,
  children,
}: {
  id?: string;
  onReply: () => void;
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const row = useRef<HTMLDivElement>(null);
  const icon = useRef<HTMLSpanElement>(null);
  const g = useRef<Gesture | null>(null);
  const swipedAt = useRef(0);

  function paint(dx: number, animate: boolean) {
    const el = row.current;
    if (el) {
      el.style.transition = animate ? "transform 180ms ease-out" : "none";
      el.style.transform = dx ? `translate3d(${dx}px,0,0)` : "";
    }
    const ic = icon.current;
    if (ic) {
      const p = Math.min(dx / TRIGGER, 1);
      ic.style.transition = animate ? "opacity 180ms, transform 180ms" : "none";
      ic.style.opacity = String(p);
      ic.style.transform = `scale(${0.4 + p * 0.6})`;
    }
  }

  function end(commit: boolean) {
    const s = g.current;
    g.current = null;
    if (!s || s.axis !== "x") return;
    swipedAt.current = Date.now();
    paint(0, true);
    if (commit && s.armed) onReply();
  }

  return (
    <div id={id} className="relative" style={{ touchAction: "pan-y" }}>
      <span
        ref={icon}
        aria-hidden
        className="pointer-events-none absolute left-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center"
        style={{ opacity: 0 }}
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-wa-chip text-wa-meta shadow-sm shadow-black/30">
          <Reply size={17} />
        </span>
      </span>
      <div
        ref={row}
        className={cx("will-change-transform", className)}
        onPointerDown={(e) => {
          if (disabled || e.pointerType === "mouse" || !e.isPrimary) return;

          if (e.clientX < EDGE) return;
          g.current = { id: e.pointerId, x: e.clientX, y: e.clientY, axis: null, armed: false };
        }}
        onPointerMove={(e) => {
          const s = g.current;
          if (!s || e.pointerId !== s.id) return;
          const dx = e.clientX - s.x;
          const dy = e.clientY - s.y;
          if (!s.axis) {
            if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
            if (dx > 0 && Math.abs(dx) > Math.abs(dy) * 1.2) {
              s.axis = "x";
              try {
                e.currentTarget.setPointerCapture(e.pointerId);
              } catch {}
            } else {
              g.current = null;
              return;
            }
          }
          const d = Math.max(0, dx);
          const eased = d <= TRIGGER ? d : TRIGGER + (d - TRIGGER) * 0.35;
          paint(Math.min(eased, MAX), false);
          if (!s.armed && d >= TRIGGER) {
            s.armed = true;
            navigator.vibrate?.(10);
          } else if (s.armed && d < TRIGGER) {
            s.armed = false;
          }
        }}
        onPointerUp={() => end(true)}
        onPointerCancel={() => end(false)}
        onClickCapture={(e) => {
          if (Date.now() - swipedAt.current < 350) {
            e.preventDefault();
            e.stopPropagation();
          }
        }}
      >
        {children}
      </div>
    </div>
  );
}
