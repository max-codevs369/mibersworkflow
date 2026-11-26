export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

export type ActionState = { ok?: boolean; error?: string; message?: string };

const base =
  "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition active:translate-y-px disabled:pointer-events-none disabled:opacity-55";

export const btn = {
  primary: `${base} min-h-11 bg-brand px-5 text-ink hover:bg-brand-soft`,
  secondary: `${base} min-h-11 border border-line-strong bg-surface-2 px-5 text-fg hover:border-brand hover:text-brand`,
  ghost: `${base} min-h-11 px-4 text-muted hover:bg-surface-2 hover:text-fg`,
  danger: `${base} min-h-11 border border-danger/40 px-5 text-danger hover:bg-danger hover:text-ink`,
  dangerSolid: `${base} min-h-11 bg-danger px-5 text-ink hover:brightness-110`,
  sm: `${base} min-h-9 rounded-md border border-line-strong px-3 text-sm text-fg hover:border-brand hover:text-brand`,
  smPrimary: `${base} min-h-9 rounded-md bg-brand px-3 text-sm text-ink hover:bg-brand-soft`,
  smDanger: `${base} min-h-9 rounded-md border border-danger/40 px-3 text-sm text-danger hover:bg-danger hover:text-ink`,
  icon: `${base} h-10 w-10 flex-none rounded-lg border border-line text-muted hover:border-brand hover:text-brand`,
};

export const field =
  "w-full rounded-lg border border-line-strong bg-ink px-3.5 text-[15px] text-fg placeholder:text-faint outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:opacity-60";

export const input = `${field} min-h-11`;
export const textarea = `${field} py-2.5 leading-relaxed`;
export const select = `${field} min-h-11 pr-8`;

export const card = "rounded-2xl border border-line bg-surface";

export const chip = (active: boolean) =>
  cx(
    "inline-flex min-h-9 items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 text-sm font-medium transition",
    active
      ? "border-brand bg-brand text-ink"
      : "border-line text-muted hover:border-line-strong hover:text-fg"
  );

export const badge = "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold tracking-wide";

export const readableTone = (hex: string) => `color-mix(in oklab, ${hex} 68%, var(--color-fg))`;
