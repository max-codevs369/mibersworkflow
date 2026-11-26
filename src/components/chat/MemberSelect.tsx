"use client";

import { useMemo, useState } from "react";
import { Check, CheckCheck, Search, X } from "lucide-react";
import { Avatar } from "@/components/ui/bits";
import { cx } from "@/lib/ui";

export type Pickable = { id: string; name: string; image: string | null; role: string };

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

export default function MemberSelect({
  people,
  selected,
  onChange,
  autoFocus,
}: {
  people: Pickable[];
  selected: string[];
  onChange: (ids: string[]) => void;
  autoFocus?: boolean;
}) {
  const [q, setQ] = useState("");
  const term = norm(q.trim());
  const shown = useMemo(() => people.filter((p) => !term || norm(p.name).includes(term)), [people, term]);
  const chosen = selected.map((id) => people.find((p) => p.id === id)).filter((p): p is Pickable => !!p);
  const toggle = (id: string) => onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  const allShownOn = shown.length > 0 && shown.every((p) => selected.includes(p.id));
  const toggleAll = () =>
    onChange(
      allShownOn
        ? selected.filter((id) => !shown.some((p) => p.id === id))
        : [...new Set([...selected, ...shown.map((p) => p.id)])]
    );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {chosen.length > 0 && (
        <div className="no-scrollbar flex flex-none gap-3 overflow-x-auto px-4 pb-2 pt-1">
          {chosen.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => toggle(p.id)}
              className="group flex w-14 flex-none flex-col items-center gap-1 text-center"
              aria-label={`Batal pilih ${p.name}`}
            >
              <span className="relative">
                <Avatar name={p.name} src={p.image} size={44} />
                <span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-wa-list bg-wa-meta text-wa-bg transition group-hover:bg-[#f15c6d]">
                  <X size={11} strokeWidth={3} />
                </span>
              </span>
              <span className="w-full truncate text-[11px] text-wa-meta">{p.name.split(" ")[0]}</span>
            </button>
          ))}
        </div>
      )}

      <div className="flex-none px-3 pb-2">
        <label className="flex h-10 items-center gap-3 rounded-lg bg-wa-panel px-3 text-wa-meta focus-within:ring-1 focus-within:ring-wa-green/60">
          <Search size={17} aria-hidden />
          <span className="sr-only">Cari nama anggota</span>
          <input
            type="search"
            value={q}
            autoFocus={autoFocus}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari nama anggota"
            className="min-w-0 flex-1 bg-transparent text-[15px] text-wa-text outline-none placeholder:text-wa-meta [&::-webkit-search-cancel-button]:hidden"
          />
          {q && (
            <button type="button" onClick={() => setQ("")} aria-label="Hapus pencarian" className="hover:text-wa-text">
              <X size={16} />
            </button>
          )}
        </label>
      </div>

      {shown.length > 1 && (
        <button
          type="button"
          onClick={toggleAll}
          className="flex flex-none items-center gap-3 pl-3 text-left transition hover:bg-wa-panel"
        >
          <span className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-wa-green/15 text-wa-green">
            <CheckCheck size={20} />
          </span>
          <span className="flex min-w-0 flex-1 items-center gap-3 border-b border-wa-line py-3 pr-4">
            <span className="min-w-0 flex-1">
              <span className="block text-[15.5px] text-wa-text">{allShownOn ? "Batalkan semua" : "Pilih semua"}</span>
              <span className="block text-sm text-wa-meta">
                {term ? `${shown.length} hasil pencarian` : `${shown.length} anggota`}
              </span>
            </span>
            <span
              aria-hidden
              className={cx(
                "flex h-5 w-5 flex-none items-center justify-center rounded border-2 transition",
                allShownOn ? "border-wa-green bg-wa-green text-wa-bg" : "border-wa-meta/60"
              )}
            >
              {allShownOn && <Check size={13} strokeWidth={3} />}
            </span>
          </span>
        </button>
      )}

      <ul className="wa-scroll min-h-0 flex-1 overflow-y-auto" role="listbox" aria-multiselectable>
        {shown.length === 0 && <li className="px-6 py-10 text-center text-sm text-wa-meta">Tidak ada anggota dengan nama itu.</li>}
        {shown.map((p) => {
          const on = selected.includes(p.id);
          return (
            <li key={p.id} role="option" aria-selected={on}>
              <button type="button" onClick={() => toggle(p.id)} className="flex w-full items-center gap-3 pl-3 text-left transition hover:bg-wa-panel">
                <span className="relative flex-none">
                  <Avatar name={p.name} src={p.image} size={44} />
                  {on && (
                    <span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-wa-list bg-wa-green text-wa-bg">
                      <Check size={11} strokeWidth={3} />
                    </span>
                  )}
                </span>
                <span className="flex min-w-0 flex-1 items-center gap-3 border-b border-wa-line py-3 pr-4">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15.5px] text-wa-text">{p.name}</span>
                    <span className="block truncate text-sm text-wa-meta">{p.role}</span>
                  </span>
                  <span
                    aria-hidden
                    className={cx(
                      "flex h-5 w-5 flex-none items-center justify-center rounded border-2 transition",
                      on ? "border-wa-green bg-wa-green text-wa-bg" : "border-wa-meta/60"
                    )}
                  >
                    {on && <Check size={13} strokeWidth={3} />}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
