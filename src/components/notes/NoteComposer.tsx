"use client";

import { startTransition, useActionState, useState } from "react";
import Link from "next/link";
import { PenLine, LoaderCircle, CircleAlert } from "lucide-react";
import { submitNote } from "@/app/(public)/dinding/actions";
import { NOTE_COLOR_NAME, NOTE_TONE, TYPE_LABEL } from "@/lib/notes";
import NoteCard from "./NoteCard";
import Modal from "@/components/ui/Modal";
import { btn, cx, select, textarea } from "@/lib/ui";

type Who = "GUEST" | "MEMBER" | "ADMIN";

function ComposerForm({ who, onClose }: { who: Who; onClose: () => void }) {
  const [state, formAction, pending] = useActionState(submitNote, {});
  const [content, setContent] = useState("");
  const [color, setColor] = useState("YELLOW");

  if (state.ok) {
    return (
      <div className="py-6 text-center">
        <p className="text-2xl font-bold text-brand">Terima kasih!</p>
        <p className="mx-auto mt-3 max-w-sm text-muted">{state.ok}</p>
        <button type="button" onClick={onClose} className={cx(btn.primary, "mt-7")}>
          Kembali ke dinding
        </button>
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-[1.1fr_1fr]">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          startTransition(() => formAction(fd));
        }}
        className="grid content-start gap-5"
      >
        <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
          <input name="website" tabIndex={-1} autoComplete="off" />
        </div>

        <label className="grid gap-1.5 text-sm font-semibold">
          Tulis catatanmu
          <textarea
            name="content"
            required
            minLength={3}
            rows={5}
            maxLength={280}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Semangat ujian besok, teman-teman!"
            className={textarea}
          />
          <span className={cx("text-right text-xs font-normal", content.length > 260 ? "text-brand" : "text-faint")}>
            {content.length}/280
          </span>
        </label>

        <label className="grid gap-1.5 text-sm font-semibold">
          Jenis catatan
          <select name="type" defaultValue="MESSAGE" className={select}>
            {(Object.keys(TYPE_LABEL) as (keyof typeof TYPE_LABEL)[]).map((k) => (
              <option key={k} value={k}>
                {TYPE_LABEL[k]}
              </option>
            ))}
          </select>
        </label>

        <fieldset className="grid gap-2 text-sm font-semibold">
          <legend className="mb-2">Warna penanda</legend>
          <div className="flex flex-wrap gap-2.5">
            {Object.entries(NOTE_TONE).map(([k, hex]) => (
              <label key={k} className="cursor-pointer" title={NOTE_COLOR_NAME[k]}>
                <input
                  type="radio"
                  name="color"
                  value={k}
                  checked={color === k}
                  onChange={() => setColor(k)}
                  className="peer sr-only"
                />
                <span
                  style={{ background: hex }}
                  className="block h-10 w-10 rounded-lg ring-offset-2 ring-offset-surface transition peer-checked:ring-2 peer-checked:ring-brand peer-focus-visible:ring-2 peer-focus-visible:ring-fg"
                />
                <span className="sr-only">{NOTE_COLOR_NAME[k]}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {who === "MEMBER" && (
          <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-medium">
            <input name="anonymous" type="checkbox" className="h-5 w-5 accent-[#ff7a1a]" />
            Sembunyikan namaku (tampil sebagai Anonim)
          </label>
        )}
        {who === "GUEST" && (
          <p className="rounded-lg bg-surface-2 px-3.5 py-3 text-sm leading-relaxed text-muted">
            Catatan tamu tampil sebagai <strong className="text-fg">Anonim</strong> setelah dicek pengurus.{" "}
            <Link href="/login?next=/dinding" className="font-semibold text-brand hover:underline">
              Masuk
            </Link>{" "}
            kalau mau pakai namamu.
          </p>
        )}

        {state.error && (
          <p role="alert" className="flex items-start gap-2 rounded-lg bg-danger/10 px-3.5 py-2.5 text-sm font-medium text-danger">
            <CircleAlert size={18} className="mt-px flex-none" />
            {state.error}
          </p>
        )}

        <div className="flex gap-2">
          <button type="submit" disabled={pending} className={btn.primary}>
            {pending && <LoaderCircle size={16} className="animate-spin" />}
            {pending ? "Menempel..." : "Tempel di dinding"}
          </button>
          <button type="button" onClick={onClose} className={btn.ghost}>
            Batal
          </button>
        </div>
      </form>

      <div className="dotgrid hidden flex-col justify-center rounded-xl border border-line bg-surface p-8 pt-10 md:flex">
        <p className="mb-5 font-mono text-[11px] uppercase tracking-wider text-faint">Pratinjau</p>
        <NoteCard
          note={{
            id: "preview",
            content: content || "Catatanmu akan tampil seperti ini…",
            type: "MESSAGE",
            color,
            isPinned: false,
            isAnonymous: who === "GUEST",
            authorName: who === "GUEST" ? "Anonim" : "Kamu",
            authorKind: who === "ADMIN" ? "ADMIN" : who,
          }}
        />
      </div>
    </div>
  );
}

export default function NoteComposer({ who, disabled }: { who: Who; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const [round, setRound] = useState(0);

  if (disabled) {
    return (
      <Link href="/login?next=/dinding" className={btn.primary}>
        <PenLine size={18} /> Masuk untuk menempel
      </Link>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setRound((r) => r + 1);
          setOpen(true);
        }}
        className={cx(btn.primary, "min-h-12 px-6")}
      >
        <PenLine size={18} /> Tempel catatan
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Tempel catatan baru" size="lg">
        <ComposerForm key={round} who={who} onClose={() => setOpen(false)} />
      </Modal>
    </>
  );
}
