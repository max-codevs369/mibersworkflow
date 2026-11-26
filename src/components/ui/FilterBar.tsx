import Link from "next/link";
import { X } from "lucide-react";
import LiveSearch from "@/components/ui/LiveSearch";
import FilterMenu, { type FilterSection } from "@/components/ui/FilterMenu";
import { WAKTU_OPTIONS, type Waktu } from "@/lib/filters";

type Option = { value: string; label: string; count?: number };

export default function FilterBar({
  path,
  q,
  waktu,
  waktuDefault = "semua",
  waktuHints,
  kategori,
  categories,
  search,
  total,
  noun,
  keep,
}: {
  path: string;
  q?: string;
  waktu?: Waktu;
  waktuDefault?: Waktu;
  waktuHints?: Partial<Record<Waktu, string>>;
  kategori?: string | null;
  categories?: Option[];
  search: { placeholder: string; label: string };
  total: number;
  noun: string;

  keep?: Record<string, string | null | undefined>;
}) {
  const href = (over: { waktu?: Waktu; kategori?: string | null; q?: string }) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(keep ?? {})) if (v) p.set(k, v);
    const query = over.q !== undefined ? over.q : q;
    if (query) p.set("q", query);
    const w = over.waktu ?? waktu;
    if (w && w !== waktuDefault) p.set("waktu", w);
    const k = over.kategori !== undefined ? over.kategori : kategori;
    if (k) p.set("kategori", k);
    const s = p.toString();
    return `${path}${s ? `?${s}` : ""}`;
  };

  const sections: FilterSection[] = [];
  if (waktu) {
    sections.push({
      title: "Waktu",
      kind: "list",
      options: WAKTU_OPTIONS.map((o) => ({
        label: o.label,
        hint: o.value === "semua" ? "Tampilkan semuanya" : waktuHints?.[o.value],
        href: href({ waktu: o.value }),
        active: o.value === waktu,
      })),
    });
  }
  if (categories?.length) {
    sections.push({
      title: "Kategori",
      kind: "chips",
      options: [
        {
          label: "Semua",
          href: href({ kategori: null }),
          active: !kategori,
          count: categories.every((c) => c.count !== undefined) ? categories.reduce((n, c) => n + (c.count ?? 0), 0) : undefined,
        },
        ...categories.map((c) => ({ label: c.label, href: href({ kategori: c.value }), active: kategori === c.value, count: c.count })),
      ],
    });
  }

  const waktuOn = !!waktu && waktu !== waktuDefault;
  const kategoriLabel = kategori ? categories?.find((c) => c.value === kategori)?.label : undefined;
  const pills = [
    ...(waktuOn ? [{ label: WAKTU_OPTIONS.find((o) => o.value === waktu)?.label ?? "", href: href({ waktu: waktuDefault }) }] : []),
    ...(kategoriLabel ? [{ label: kategoriLabel, href: href({ kategori: null }) }] : []),
    ...(q ? [{ label: `“${q}”`, href: href({ q: "" }) }] : []),
  ];

  return (
    <div>
      <div className="flex items-center gap-2">
        <LiveSearch defaultValue={q} placeholder={search.placeholder} label={search.label} className="min-w-0 flex-1" />
        {sections.length > 0 && (
          <FilterMenu sections={sections} activeCount={(waktuOn ? 1 : 0) + (kategoriLabel ? 1 : 0)} resetHref={href({ waktu: waktuDefault, kategori: null })} />
        )}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
        {pills.map((p) => (
          <Link
            key={p.label}
            href={p.href}
            scroll={false}
            className="group inline-flex max-w-full items-center gap-1.5 rounded-full bg-surface-2 py-1 pl-3 pr-2 text-fg transition hover:bg-surface-3"
          >
            <span className="truncate">{p.label}</span>
            <X size={14} className="flex-none text-muted group-hover:text-danger" aria-label="hapus" />
          </Link>
        ))}
        <span className="text-muted">
          {pills.length > 0 && <span className="mr-2 text-line-strong">·</span>}
          <span className="font-semibold text-fg tabular-nums">{total}</span> {noun}
          {!waktuOn && waktu && waktu !== "semua" && waktuHints?.[waktu] && (
            <span className="text-faint"> · {waktuHints[waktu]}</span>
          )}
        </span>
      </div>
    </div>
  );
}
