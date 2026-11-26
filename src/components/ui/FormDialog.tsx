"use client";

import { useState } from "react";
import Modal from "./Modal";
import ActionForm from "./ActionForm";
import { btn, type ActionState } from "@/lib/ui";

export default function FormDialog({
  trigger,
  triggerClassName,
  triggerLabel,
  title,
  description,
  action,
  children,
  submitLabel = "Simpan",
  size = "md",
  defaultOpen = false,
}: {
  trigger: React.ReactNode;
  triggerClassName?: string;
  triggerLabel?: string;
  title: string;
  description?: string;
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  children: React.ReactNode;
  submitLabel?: string;
  size?: "sm" | "md" | "lg" | "xl";
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [round, setRound] = useState(0);

  return (
    <>
      <button
        type="button"
        aria-label={triggerLabel}
        onClick={() => {
          setRound((r) => r + 1);
          setOpen(true);
        }}
        className={triggerClassName ?? btn.primary}
      >
        {trigger}
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={title} description={description} size={size}>
        <ActionForm
          key={round}
          action={action}
          submitLabel={submitLabel}
          onSuccess={() => setOpen(false)}
          actionsClassName="sticky -bottom-5 z-10 -mx-5 -mb-5 flex-row-reverse justify-start border-t border-line bg-surface px-5 py-4 sm:-mx-6 sm:px-6"
          extra={
            <button type="button" onClick={() => setOpen(false)} className={btn.ghost}>
              Batal
            </button>
          }
        >
          {children}
        </ActionForm>
      </Modal>
    </>
  );
}
