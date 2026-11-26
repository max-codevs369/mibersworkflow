"use client";

import { useEffect } from "react";

const KEY = "m26-scroll";

export default function ScrollKeeper() {
  useEffect(() => {
    const key = () => `${KEY}:${location.pathname}${location.search}`;
    const root = document.documentElement;
    const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    const timers: ReturnType<typeof setTimeout>[] = [];

    if ((nav?.type === "reload" || nav?.type === "back_forward") && !location.hash) {
      let target = 0;
      try {
        target = Number(sessionStorage.getItem(key())) || 0;
      } catch {}
      const jump = () => {
        const prev = root.style.scrollBehavior;
        root.style.scrollBehavior = "auto";
        window.scrollTo(0, Math.max(0, Math.min(target, root.scrollHeight - innerHeight)));
        root.style.scrollBehavior = prev;
      };
      jump();
      document.fonts?.ready.then(() => requestAnimationFrame(jump));
      timers.push(setTimeout(jump, 350));
      const stop = () => timers.forEach(clearTimeout);
      addEventListener("wheel", stop, { once: true, passive: true });
      addEventListener("touchstart", stop, { once: true, passive: true });
      addEventListener("keydown", stop, { once: true });
    }
    history.scrollRestoration = "auto";

    const save = () => {
      try {
        sessionStorage.setItem(key(), String(Math.round(scrollY)));
      } catch {}
      history.scrollRestoration = "manual";
    };
    addEventListener("pagehide", save);
    return () => {
      timers.forEach(clearTimeout);
      removeEventListener("pagehide", save);
    };
  }, []);

  return null;
}
