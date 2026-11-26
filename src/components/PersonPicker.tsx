"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { LoaderCircle, Search, X } from "lucide-react";
import { cx, input } from "@/lib/ui";

type Person = { absenNo: number; name: string };

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

export default function PersonPicker({
  people,
  selected,
  keep,
}: {
  people: Person[];
  selected: Person | null;
  keep: Record<string, string>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [pending, start] = useTransition();
  const box = useRef<HTMLDivElement>(null);

  const hits = useMemo(() => {
    const t = norm(q.trim());
    if (!t) return [];
    const byNumber = /^\d+$/.test(t) ? people.filter((p) => String(p.absenNo).startsWith(t)) : [];
    const byName = people.filter((p) => norm(p.name).split(/\s+/).some((w) => w.startsWith(t)) || norm(p.name).includes(t));
    return [...new Map([...byNumber, ...byName].map((p) => [p.absenNo, p])).values()].slice(0, 6);
  }, [q, people]);

  function go(absen: number | null) {
    const p = new URLSearchParams(keep);
    if (absen) p.set("absen", String(absen));
    else p.delete("absen");
    setQ("");
    setOpen(false);
    const qs = p.toString();
    start(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  }

  if (selected) {
    return (
      <div className="flex h-11 items-center gap-2 rounded-lg border border-brand/50 bg-brand/10 pl-2 pr-1">
        <span className="flex h-7 min-w-7 items-center justify-center rounded-md bg-brand px-1.5 font-mono text-xs font-bold text-ink">
          {selected.absenNo}
        </span>
        <span className="min-w-0 flex-1 truncate text-sm font-medium">{selected.name}</span>
        {pending ? (
          <LoaderCircle size={16} className="mr-2 animate-spin text-muted" />
        ) : (
          <button
            type="button"
            onClick={() => go(null)}
            aria-label="Hapus sorotan nama"
            className="flex h-9 w-9 items-center justify-center rounded-md text-muted transition hover:bg-surface-3 hover:text-fg"
          >
            <X size={16} />
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      ref={box}
      className="relative"
      onBlur={(e) => {
        if (!box.current?.contains(e.relatedTarget as Node)) setOpen(false);
      }}
    >
      <Search size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-faint" aria-hidden />
      <input
        type="search"
        value={q}
        role="combobox"
        aria-expanded={open && hits.length > 0}
        aria-controls="saran-nama"
        aria-label="Cari nama atau nomor absen"
        placeholder="Cari nama atau no. absen"
        onChange={(e) => {
          setQ(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((a) => Math.min(a + 1, hits.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
          } else if (e.key === "Enter" && hits[active]) {
            e.preventDefault();
            go(hits[active].absenNo);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        className={cx(input, "pl-10 [&::-webkit-search-cancel-button]:hidden")}
      />
      {open && q.trim() && (
        <ul
          id="saran-nama"
          role="listbox"
          className="absolute inset-x-0 top-[calc(100%+6px)] z-30 animate-drop overflow-hidden rounded-xl border border-line-strong bg-surface p-1 shadow-xl shadow-black/40"
        >
          {hits.length === 0 ? (
            <li className="px-3 py-3 text-sm text-muted">Tidak ada nama yang cocok.</li>
          ) : (
            hits.map((p, i) => (
              <li key={p.absenNo} role="option" aria-selected={i === active}>
                <button
                  type="button"
                  onMouseEnter={() => setActive(i)}
                  onClick={() => go(p.absenNo)}
                  className={cx(
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition",
                    i === active ? "bg-surface-3" : "hover:bg-surface-2"
                  )}
                >
                  <span className="flex h-6 min-w-6 items-center justify-center rounded bg-surface-2 px-1 font-mono text-xs tabular-nums text-muted">
                    {p.absenNo}
                  </span>
                  <span className="truncate">{p.name}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
