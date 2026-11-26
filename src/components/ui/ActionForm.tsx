"use client";

import { startTransition, useActionState, useEffect, useRef } from "react";
import { CircleAlert, CircleCheck, LoaderCircle } from "lucide-react";
import { btn, cx, type ActionState } from "@/lib/ui";

type Props = {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  children: React.ReactNode;
  submitLabel?: string;
  pendingLabel?: string;
  className?: string;
  submitClassName?: string;
  resetOnSuccess?: boolean;
  onSuccess?: () => void;
  extra?: React.ReactNode;
  actionsClassName?: string;
  hideSubmit?: boolean;
};

export default function ActionForm({
  action,
  children,
  submitLabel = "Simpan",
  pendingLabel = "Menyimpan...",
  className,
  submitClassName,
  resetOnSuccess = false,
  onSuccess,
  extra,
  actionsClassName,
  hideSubmit = false,
}: Props) {
  const [state, formAction, pending] = useActionState(action, {});
  const formRef = useRef<HTMLFormElement>(null);
  const successRef = useRef(onSuccess);

  useEffect(() => {
    successRef.current = onSuccess;
  });

  useEffect(() => {
    if (!state.ok) return;
    if (resetOnSuccess) formRef.current?.reset();
    successRef.current?.();
  }, [state, resetOnSuccess]);

  return (
    <form
      ref={formRef}
      noValidate={false}
      onSubmit={(e) => {
        e.preventDefault();
        if (pending) return;
        const fd = new FormData(e.currentTarget);
        startTransition(() => formAction(fd));
      }}
      className={cx("grid gap-5", className)}
    >
      {children}

      {state.error && (
        <p role="alert" className="flex items-start gap-2 rounded-lg bg-danger/10 px-3.5 py-2.5 text-sm font-medium text-danger">
          <CircleAlert size={18} className="mt-px flex-none" />
          {state.error}
        </p>
      )}
      {state.ok && state.message && (
        <p role="status" className="flex items-start gap-2 rounded-lg bg-ok/10 px-3.5 py-2.5 text-sm font-medium text-ok">
          <CircleCheck size={18} className="mt-px flex-none" />
          {state.message}
        </p>
      )}

      {!hideSubmit && (
        <div className={cx("flex flex-wrap items-center gap-2", actionsClassName)}>
          <button type="submit" disabled={pending} className={submitClassName ?? btn.primary}>
            {pending && <LoaderCircle size={16} className="animate-spin" />}
            {pending ? pendingLabel : submitLabel}
          </button>
          {extra}
        </div>
      )}
    </form>
  );
}
