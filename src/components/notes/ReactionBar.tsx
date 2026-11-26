"use client";

import { useOptimistic, useState, useTransition } from "react";
import { Flag } from "lucide-react";
import { toggleReaction, reportNote } from "@/app/(public)/dinding/actions";
import { REACTIONS } from "@/lib/notes";
import Modal from "@/components/ui/Modal";
import { btn, cx, textarea } from "@/lib/ui";

type State = { counts: Record<string, number>; mine: string[] };

export default function ReactionBar({
  noteId,
  counts,
  mine,
}: {
  noteId: string;
  counts: Record<string, number>;
  mine: string[];
}) {
  const [, start] = useTransition();
  const [state, toggle] = useOptimistic<State, string>({ counts, mine }, (s, emoji) => {
    const has = s.mine.includes(emoji);
    return {
      counts: { ...s.counts, [emoji]: Math.max(0, (s.counts[emoji] ?? 0) + (has ? -1 : 1)) },
      mine: has ? s.mine.filter((e) => e !== emoji) : [...s.mine, emoji],
    };
  });

  const [reportOpen, setReportOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [reported, setReported] = useState(false);
  const [sending, startReport] = useTransition();

  return (
    <div className="mt-4 flex flex-wrap items-center gap-1.5">
      {REACTIONS.map((e) => {
        const active = state.mine.includes(e);
        const n = state.counts[e] ?? 0;
        return (
          <button
            key={e}
            type="button"
            aria-pressed={active}
            aria-label={`Reaksi ${e}`}
            onClick={() =>
              start(async () => {
                toggle(e);
                await toggleReaction(noteId, e);
              })
            }
            className={cx(
              "flex min-h-9 items-center gap-1 rounded-full border px-2.5 text-sm font-medium transition active:scale-95",
              active
                ? "border-brand/50 bg-brand/15 text-fg"
                : "border-line bg-surface-3 text-muted hover:border-line-strong hover:text-fg"
            )}
          >
            <span>{e}</span>
            {n > 0 && <span className="tabular-nums">{n}</span>}
          </button>
        );
      })}

      <button
        type="button"
        onClick={() => setReportOpen(true)}
        disabled={reported}
        aria-label="Laporkan catatan"
        className="ml-auto flex h-9 w-9 items-center justify-center rounded-full text-faint transition hover:bg-surface-3 hover:text-danger disabled:opacity-40"
      >
        <Flag size={15} />
      </button>

      <Modal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        title="Laporkan catatan ini?"
        description="Pengurus akan memeriksa catatan yang dilaporkan."
        size="sm"
      >
        {reported ? (
          <div>
            <p className="text-muted">Terima kasih, laporanmu sudah diterima.</p>
            <button type="button" onClick={() => setReportOpen(false)} className={cx(btn.primary, "mt-5")}>
              Tutup
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            <label className="grid gap-1.5 text-sm font-semibold">
              Alasan (opsional)
              <textarea
                rows={3}
                maxLength={200}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Misalnya: menyinggung, spam, tidak pantas"
                className={textarea}
              />
            </label>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setReportOpen(false)} className={btn.ghost}>
                Batal
              </button>
              <button
                type="button"
                disabled={sending}
                onClick={() =>
                  startReport(async () => {
                    await reportNote(noteId, reason);
                    setReported(true);
                  })
                }
                className={btn.dangerSolid}
              >
                {sending ? "Mengirim..." : "Laporkan"}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
