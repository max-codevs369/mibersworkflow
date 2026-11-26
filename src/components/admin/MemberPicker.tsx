"use client";

import { useMemo, useState } from "react";
import { Check, Search, X } from "lucide-react";
import { Avatar } from "@/components/ui/bits";
import { cx, input } from "@/lib/ui";

type User = { id: string; name: string; image: string | null; role: string };

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

export default function MemberPicker({
  users,
  defaultSelected = [],
  name = "members",
}: {
  users: User[];
  defaultSelected?: string[];
  name?: string;
}) {
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState(() => new Set(defaultSelected));
  const term = norm(q.trim());
  const visible = useMemo(() => new Set(users.filter((u) => !term || norm(u.name).includes(term)).map((u) => u.id)), [users, term]);

  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const allVisibleOn = visible.size > 0 && [...visible].every((id) => selected.has(id));

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-semibold">Anggota grup</span>
        <span className="text-sm text-muted">
          <span className="font-semibold text-brand tabular-nums">{selected.size}</span> dipilih
        </span>
      </div>
      <div className="relative">
        <Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" aria-hidden />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Cari nama anggota"
          aria-label="Cari nama anggota"
          className={cx(input, "pl-10 pr-10 [&::-webkit-search-cancel-button]:hidden")}
        />
        {q && (
          <button
            type="button"
            onClick={() => setQ("")}
            aria-label="Hapus pencarian"
            className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-faint hover:text-fg"
          >
            <X size={16} />
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-2 text-sm">
        <button
          type="button"
          onClick={() =>
            setSelected((s) => {
              const n = new Set(s);
              visible.forEach((id) => (allVisibleOn ? n.delete(id) : n.add(id)));
              return n;
            })
          }
          className="rounded-md border border-line px-3 py-1.5 text-muted transition hover:border-line-strong hover:text-fg"
        >
          {allVisibleOn ? "Batalkan semua" : term ? "Pilih semua hasil" : "Pilih semua"}
        </button>
        {selected.size > 0 && (
          <button
            type="button"
            onClick={() => setSelected(new Set())}
            className="rounded-md px-3 py-1.5 text-muted transition hover:text-danger"
          >
            Kosongkan
          </button>
        )}
      </div>
      <ul className="max-h-72 overflow-y-auto rounded-lg border border-line">
        {users.map((u) => {
          const on = selected.has(u.id);
          return (
            <li key={u.id} hidden={!visible.has(u.id)} className="border-b border-line last:border-0">
              <label className="flex cursor-pointer items-center gap-3 px-3 py-2.5 transition hover:bg-surface-2">
                <input type="checkbox" name={name} value={u.id} checked={on} onChange={() => toggle(u.id)} className="sr-only" />
                <Avatar name={u.name} src={u.image} size={34} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{u.name}</span>
                  <span className="block truncate text-xs text-muted">{u.role}</span>
                </span>
                <span
                  aria-hidden
                  className={cx(
                    "flex h-5 w-5 flex-none items-center justify-center rounded border transition",
                    on ? "border-brand bg-brand text-ink" : "border-line-strong"
                  )}
                >
                  {on && <Check size={14} strokeWidth={3} />}
                </span>
              </label>
            </li>
          );
        })}
        {visible.size === 0 && <li className="px-3 py-6 text-center text-sm text-faint">Tidak ada nama yang cocok.</li>}
      </ul>
    </div>
  );
}
