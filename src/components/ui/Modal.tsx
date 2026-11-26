"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { cx } from "@/lib/ui";

const SIZE = {
  sm: "max-w-md",
  md: "max-w-xl",
  lg: "max-w-3xl",
  xl: "max-w-5xl",
};

export default function Modal({
  open,
  onClose,
  title,
  description,
  size = "md",
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  size?: keyof typeof SIZE;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onMouseDown={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className={cx(
        "m-auto max-h-[92dvh] w-[calc(100%-1.5rem)] overflow-clip rounded-2xl border border-line-strong bg-surface p-0 text-left font-sans text-base font-normal text-fg shadow-2xl shadow-black/60",
        "open:animate-fade-up",
        SIZE[size]
      )}
    >
      {open && (
        <div className="flex max-h-[92dvh] min-w-0 flex-col overflow-clip">
          {(title || description) && (
            <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4 sm:px-6">
              <div className="min-w-0">
                {title && <h2 className="text-lg font-bold leading-snug sm:text-xl">{title}</h2>}
                {description && <p className="mt-1 text-sm text-muted">{description}</p>}
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Tutup"
                className="-mr-2 flex h-10 w-10 flex-none items-center justify-center rounded-lg text-muted transition hover:bg-surface-2 hover:text-fg"
              >
                <X size={20} />
              </button>
            </div>
          )}
          <div className="min-w-0 overflow-y-auto overflow-x-hidden overscroll-contain px-5 py-5 sm:px-6">{children}</div>
        </div>
      )}
    </dialog>
  );
}
