import { Pin } from "lucide-react";
import { NOTE_TONE, TYPE_LABEL, noteAuthorLine, type NoteTypeKey } from "@/lib/notes";
import { cx, readableTone } from "@/lib/ui";

export type NoteData = {
  id: string;
  content: string;
  type: string;
  color: string;
  isPinned: boolean;
  isAnonymous: boolean;
  authorName: string;
  authorKind: string;
};

export function Clip({ tone }: { tone: string }) {
  return (
    <svg
      viewBox="0 0 40 30"
      width="40"
      height="30"
      aria-hidden
      className="pointer-events-none absolute -top-[15px] left-1/2 -translate-x-1/2 drop-shadow-[0_2px_2px_rgba(0,0,0,.5)]"
    >
      <path d="M12 14 V5 a4 4 0 0 1 4-4 h8 a4 4 0 0 1 4 4 v9" fill="none" stroke="#8a857c" strokeWidth="2.2" />
      <path d="M6 14 h28 l-3 14 H9 z" fill={tone} />
      <path d="M6 14 h28 l-.7 3.2 H6.7 z" fill="rgba(0,0,0,.18)" />
    </svg>
  );
}

export default function NoteCard({
  note,
  children,
  compact = false,
}: {
  note: NoteData;
  children?: React.ReactNode;
  compact?: boolean;
}) {
  const tone = NOTE_TONE[note.color] ?? NOTE_TONE.YELLOW;
  return (
    <article
      className={cx(
        "relative flex h-full flex-col rounded-xl border border-line bg-surface-2 px-5 pb-4 pt-6 transition hover:border-line-strong",
        compact ? "min-h-44" : "min-h-52"
      )}
    >
      <Clip tone={tone} />
      <span aria-hidden className="absolute inset-y-4 left-0 w-[3px] rounded-r" style={{ background: tone }} />

      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[11px] uppercase tracking-wider" style={{ color: readableTone(tone) }}>
          {TYPE_LABEL[note.type as NoteTypeKey] ?? "Pesan"}
        </span>
        {note.isPinned && (
          <span className="inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-wider text-muted">
            <Pin size={11} /> Disematkan
          </span>
        )}
      </div>

      <p
        className={cx(
          "prose-safe mt-2.5 whitespace-pre-line text-[15px] leading-relaxed text-fg",
          compact && "line-clamp-5"
        )}
      >
        {note.content}
      </p>
      <p className="mt-3 text-[13px] text-muted">— {noteAuthorLine(note)}</p>
      {children && <div className="mt-auto pt-1">{children}</div>}
    </article>
  );
}
