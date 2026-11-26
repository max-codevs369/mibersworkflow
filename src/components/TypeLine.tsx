"use client";

import { useEffect, useState } from "react";

export default function TypeLine({ phrases, prompt = "~/mibers $" }: { phrases: string[]; prompt?: string }) {
  const [index, setIndex] = useState(0);
  const [text, setText] = useState(phrases[0] ?? "");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (phrases.length < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const target = phrases[index];
    let delay = deleting ? 28 : 55;
    if (!deleting && text === target) delay = 2200;
    if (deleting && text === "") delay = 350;

    const t = setTimeout(() => {
      if (!deleting && text === target) {
        setDeleting(true);
      } else if (deleting && text === "") {
        setDeleting(false);
        setIndex((i) => (i + 1) % phrases.length);
      } else if (deleting) {
        setText(target.slice(0, text.length - 1));
      } else {
        setText(phrases[index].slice(0, text.length + 1));
      }
    }, delay);
    return () => clearTimeout(t);
  }, [text, deleting, index, phrases]);

  return (
    <p className="flex min-h-6 max-w-full items-center gap-2 overflow-hidden font-mono text-[13px] sm:text-sm" aria-label={phrases[0]}>
      <span className="flex-none text-ok" aria-hidden>
        {prompt}
      </span>
      <span className="truncate text-fg/85" aria-hidden>
        {text}
      </span>
      <span aria-hidden className="caret -ml-1 inline-block h-[1.1em] w-[0.55em] flex-none bg-brand" />
    </p>
  );
}
