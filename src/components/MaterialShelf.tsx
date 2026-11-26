import Link from "next/link";
import { ArrowRight, Download, ExternalLink, Lock } from "lucide-react";
import { relativeTime } from "@/lib/format";
import { btn, cx } from "@/lib/ui";

type Group = { subject: string | null; _count: { _all: number } };
type Item = { id: string; title: string; fileUrl: string; category: string | null; subject: string | null; createdAt: Date };

const COLORS = ["#e8743b", "#3f7fd8", "#2f9e74", "#c9a227", "#d0507f", "#7a5cd6", "#0e8f9e", "#b5552d", "#5d7a2b", "#a0479e"];
const HEIGHTS = ["h-44 sm:h-48", "h-48 sm:h-52", "h-40 sm:h-44", "h-[12.5rem] sm:h-[13.5rem]", "h-44 sm:h-[11.75rem]", "h-[11.5rem] sm:h-[12.5rem]"];
const UMUM = "umum";

function spineLabel(name: string) {
  const paren = name.match(/\(([^)]+)\)\s*$/);

  if (paren && /^[A-Z0-9&]{2,6}$/.test(paren[1])) return paren[1];

  if (paren && name.length > 22) {
    const initials = name
      .slice(0, paren.index)
      .split(/\s+/)
      .filter((w) => w && !/^(dan|&|dan\/atau)$/i.test(w))
      .map((w) => w[0].toUpperCase())
      .join("");
    return `${initials} ${paren[1]}`;
  }
  return name;
}

function fileTag(url: string) {
  if (!url.startsWith("/files/")) return { tag: "LINK", external: true };
  return { tag: (url.split(".").pop() ?? "FILE").toUpperCase().slice(0, 4), external: false };
}

export default function MaterialShelf({
  subjects,
  groups,
  latest,
  loggedIn,
  now,
}: {
  subjects: string[];
  groups: Group[];
  latest: Item[];
  loggedIn: boolean;
  now: Date;
}) {
  const countOf = (s: string | null) => groups.find((g) => g.subject === s)?._count._all ?? 0;
  const extra = groups.map((g) => g.subject).filter((s): s is string => !!s && !subjects.includes(s));
  const names = [...subjects, ...extra];
  const shelf = [
    ...names.map((n, i) => ({ key: n, name: n, label: spineLabel(n), count: countOf(n), color: COLORS[i % COLORS.length], h: HEIGHTS[i % HEIGHTS.length] })),
    ...(countOf(null) > 0 || names.length === 0
      ? [{ key: UMUM, name: "Umum", label: "Umum", count: countOf(null), color: "#8b7f73", h: "h-40 sm:h-44" }]
      : []),
  ];
  const total = groups.reduce((s, g) => s + g._count._all, 0);
  const filled = shelf.filter((s) => s.count > 0).length;
  const open = (key?: string) => {
    const target = key ? `/materi?matkul=${encodeURIComponent(key)}` : "/materi";
    return loggedIn ? target : `/login?next=${encodeURIComponent(target)}`;
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.05fr] lg:gap-8">
      <div className="flex min-w-0 flex-col justify-between gap-6 rounded-xl border border-line bg-surface p-6 sm:p-7">
        <div className="min-w-0">
          <p className="max-w-md leading-relaxed text-muted">
            Slide dosen, modul praktikum, sampai kisi-kisi ujian kami taruh di satu rak, satu binder untuk tiap mata
            kuliah. Tidak perlu lagi scroll grup sampai jempol pegal cuma buat cari file minggu lalu.
          </p>
          <div className="no-scrollbar mt-6 overflow-x-auto pb-1">
            <div className="inline-block min-w-full">
              <div className="flex items-end gap-1 px-1 sm:gap-1.5" role="list" aria-label="Rak materi per mata kuliah">
                {shelf.map((s) => (
                  <Link
                    key={s.key}
                    href={open(s.key)}
                    role="listitem"
                    title={`${s.name}: ${s.count} materi`}
                    aria-label={`${s.name}, ${s.count} materi`}
                    style={{ backgroundColor: s.color }}
                    className={cx(
                      "group relative flex w-[2.6rem] flex-none flex-col items-center justify-between rounded-t-md rounded-b-[3px] px-0.5 pb-2.5 pt-2 text-white shadow-[inset_-5px_0_0_rgba(0,0,0,.14),inset_3px_0_0_rgba(255,255,255,.12)] transition duration-300 hover:-translate-y-2.5 focus-visible:-translate-y-2.5 sm:w-11",
                      s.h,
                      s.count === 0 && "opacity-55 saturate-[.7] hover:opacity-100 hover:saturate-100"
                    )}
                  >
                    <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-black/25 px-1 font-mono text-[11px] font-bold tabular-nums">
                      {s.count}
                    </span>
                    <span className="line-clamp-2 max-h-[72%] overflow-hidden text-[11px] font-semibold leading-[1.15] tracking-wide [text-shadow:0_1px_0_rgba(0,0,0,.25)] [writing-mode:vertical-rl] rotate-180">
                      {s.label}
                    </span>
                    <span aria-hidden className="h-1.5 w-5 rounded-full bg-black/25" />
                  </Link>
                ))}
              </div>
              <div aria-hidden className="h-3 rounded-sm bg-gradient-to-b from-[#8a6142] to-[#5e3f29] shadow-[0_6px_10px_-6px_rgba(0,0,0,.6)]" />
            </div>
          </div>
          <p className="mt-3 font-mono text-[11px] text-faint">
            {total > 0
              ? `${total} materi · ${filled} dari ${shelf.length} mata kuliah sudah terisi · klik binder`
              : "rak masih kosong · materi pertama segera menyusul"}
          </p>
        </div>
        <Link href={open()} className={cx(btn.primary, "min-h-12 w-full px-5 sm:w-auto sm:self-start")}>
          {loggedIn ? "Buka rak materi" : "Masuk untuk buka materi"} <ArrowRight size={18} />
        </Link>
      </div>
      <div className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-[#2a2f36] bg-[#0d1117] font-mono text-[13px] text-[#c9d1d9] shadow-lg shadow-black/20">
        <div className="flex h-10 flex-none items-center gap-2 border-b border-[#21262d] bg-[#161b22] px-4">
          <span aria-hidden className="h-3 w-3 rounded-full bg-[#ff5f57]" />
          <span aria-hidden className="h-3 w-3 rounded-full bg-[#febc2e]" />
          <span aria-hidden className="h-3 w-3 rounded-full bg-[#28c840]" />
          <span className="ml-2 truncate text-[12px] text-[#8b949e]">mibers@26: ~/materi</span>
        </div>
        <div className="flex flex-1 flex-col gap-1.5 p-4 sm:p-5">
          <p>
            <span className="text-[#7ee787]">mibers@26</span>
            <span className="text-[#8b949e]">:</span>
            <span className="text-[#79c0ff]">~/materi</span>
            <span className="text-[#8b949e]">$</span> ls -t | head -4
          </p>
          {!loggedIn ? (
            <>
              <p className="text-[#ff7b72]">ls: tidak bisa membuka &apos;~/materi&apos;: khusus anggota kelas</p>
              <p className="flex items-center gap-2 text-[#8b949e]">
                <Lock size={13} /> isi rak hanya bisa dibaca setelah login
              </p>
              <Link
                href={open()}
                className="mt-auto inline-flex w-fit items-center gap-1.5 pt-4 text-[#79c0ff] underline-offset-4 hover:underline"
              >
                $ login --lanjut ~/materi <ArrowRight size={14} />
              </Link>
            </>
          ) : latest.length === 0 ? (
            <>
              <p className="text-[#8b949e]">total 0</p>
              <p className="text-[#8b949e]"># belum ada materi. begitu pengurus mengunggah, muncul di sini.</p>
            </>
          ) : (
            <ul className="mt-1 grid min-w-0 grid-cols-[minmax(0,1fr)] gap-1">
              {latest.map((m) => {
                const f = fileTag(m.fileUrl);
                return (
                  <li key={m.id}>
                    <a
                      href={m.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group -mx-2 flex items-center gap-3 rounded-md px-2 py-1.5 transition hover:bg-[#161b22]"
                    >
                      <span className="w-11 flex-none rounded bg-[#21262d] py-0.5 text-center text-[10px] font-bold tracking-wider text-[#d2a8ff]">
                        {f.tag}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[#e6edf3] group-hover:text-[#79c0ff]">{m.title}</span>
                        <span className="block truncate text-[11px] text-[#8b949e]">
                          {m.subject ?? "Umum"}{m.category ? ` · ${m.category}` : ""} · {relativeTime(m.createdAt, now)}
                        </span>
                      </span>
                      <span className="flex-none text-[#8b949e] group-hover:text-[#79c0ff]">
                        {f.external ? <ExternalLink size={15} /> : <Download size={15} />}
                      </span>
                    </a>
                  </li>
                );
              })}
            </ul>
          )}

          <p className="mt-auto flex items-center pt-4">
            <span className="text-[#7ee787]">mibers@26</span>
            <span className="text-[#8b949e]">:</span>
            <span className="text-[#79c0ff]">~/materi</span>
            <span className="text-[#8b949e]">$</span>
            <span aria-hidden className="ml-1.5 inline-block h-4 w-2 animate-pulse bg-[#c9d1d9]" />
          </p>
        </div>
      </div>
    </div>
  );
}
