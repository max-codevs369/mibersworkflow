"use client";

import { useState, useTransition } from "react";
import { LoaderCircle } from "lucide-react";
import Modal from "./Modal";
import { btn, cx } from "@/lib/ui";

type Result = void | { error?: string } | undefined | unknown;

export default function ConfirmButton({
  action,
  children,
  title = "Yakin?",
  description,
  confirmLabel = "Ya, lanjutkan",
  tone = "danger",
  className,
  ariaLabel,
  skipConfirm = false,
}: {
  action: () => Promise<Result>;
  children: React.ReactNode;
  title?: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  tone?: "danger" | "primary";
  className?: string;
  ariaLabel?: string;
  skipConfirm?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  function run() {
    setError("");
    start(async () => {
      try {
        const res = (await action()) as { error?: string } | undefined;
        if (res && typeof res === "object" && "error" in res && res.error) {
          setError(res.error);
          if (skipConfirm) setOpen(true);
          return;
        }
        setOpen(false);
      } catch (e) {
        if (e && typeof e === "object" && "digest" in e && String((e as { digest: unknown }).digest).startsWith("NEXT_REDIRECT")) {
          throw e;
        }
        setError("Terjadi kesalahan. Coba lagi.");
        if (skipConfirm) setOpen(true);
      }
    });
  }

  return (
    <>
      <button
        type="button"
        aria-label={ariaLabel}
        disabled={pending}
        onClick={() => (skipConfirm ? run() : setOpen(true))}
        className={className ?? btn.smDanger}
      >
        {pending && skipConfirm ? <LoaderCircle size={16} className="animate-spin" /> : children}
      </button>

      <Modal open={open} onClose={() => !pending && setOpen(false)} title={title} size="sm">
        {description && <div className="text-[15px] leading-relaxed text-muted">{description}</div>}
        {error && (
          <p role="alert" className="mt-4 rounded-lg bg-danger/10 px-3 py-2 text-sm font-medium text-danger">
            {error}
          </p>
        )}
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button type="button" onClick={() => setOpen(false)} disabled={pending} className={btn.ghost}>
            Batal
          </button>
          <button
            type="button"
            onClick={run}
            disabled={pending}
            className={cx(tone === "danger" ? btn.dangerSolid : btn.primary)}
          >
            {pending && <LoaderCircle size={16} className="animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </Modal>
    </>
  );
}
