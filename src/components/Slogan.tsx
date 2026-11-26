import { cx } from "@/lib/ui";

export default function Slogan({ text, size = "lg", className }: { text: string; size?: "lg" | "sm"; className?: string }) {
  const parts = text
    .split(/(?=\bwe are\b)/i)
    .map((p) => p.trim().replace(/[,.]$/, ""))
    .filter(Boolean);
  if (!parts.length) return null;

  return (
    <p
      className={cx(
        "flex flex-wrap items-baseline font-display font-extrabold tracking-tight",
        size === "lg" ? "gap-x-3 gap-y-1 text-2xl sm:text-3xl" : "gap-x-2 text-base",
        className
      )}
    >
      {parts.map((p, i) => (
        <span key={i} className="contents">
          {i > 0 && (
            <span aria-hidden className={cx("font-normal text-faint", size === "lg" ? "text-xl sm:text-2xl" : "text-sm")}>
              /
            </span>
          )}
          <span className={cx("relative", i === parts.length - 1 && parts.length > 1 ? "text-brand" : "text-fg")}>
            {p}
            {i === parts.length - 1 && parts.length > 1 && size === "lg" && (
              <span aria-hidden className="absolute -bottom-1 left-0 h-[3px] w-full rounded-full bg-brand/40" />
            )}
          </span>
        </span>
      ))}
    </p>
  );
}
