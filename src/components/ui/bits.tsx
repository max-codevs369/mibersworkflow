import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import SafeImg from "./SafeImg";
import { initials } from "@/lib/format";
import { cx } from "@/lib/ui";

const AVATAR_TONES = ["#f5822a", "#8db3df", "#8cc28a", "#e29ab5", "#e0c062", "#b9a3e6"];

export const avatarTone = (name: string) =>
  AVATAR_TONES[[...name].reduce((s, c) => s + c.charCodeAt(0), 0) % AVATAR_TONES.length];

export function Avatar({
  name,
  src,
  size = 40,
  className,
}: {
  name: string;
  src?: string | null;
  size?: number;
  className?: string;
}) {
  const tone = avatarTone(name);
  const fallback = (
    <span className="flex h-full w-full items-center justify-center" style={{ background: tone, color: "#141311" }}>
      {initials(name)}
    </span>
  );
  return (
    <span
      style={{ width: size, height: size, fontSize: Math.max(11, Math.round(size * 0.36)) }}
      className={cx(
        "relative inline-flex flex-none items-center justify-center overflow-hidden rounded-full bg-surface-3 font-semibold",
        className
      )}
    >
      {src ? <SafeImg src={src} alt={name} width={size} className="h-full w-full object-cover" fallback={fallback} /> : fallback}
    </span>
  );
}

export function EmptyState({
  title,
  children,
  icon,
  action,
  className,
}: {
  title: string;
  children?: React.ReactNode;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cx(
        "flex flex-col items-center rounded-xl border border-dashed border-line-strong px-5 py-12 text-center",
        className
      )}
    >
      {icon && <div className="mb-3 text-faint">{icon}</div>}
      <p className="font-semibold text-fg">{title}</p>
      {children && <div className="mt-1.5 max-w-md text-sm leading-relaxed text-muted">{children}</div>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Pagination({
  page,
  pages,
  href,
}: {
  page: number;
  pages: number;
  href: (page: number) => string;
}) {
  if (pages <= 1) return null;
  const cls =
    "inline-flex min-h-10 items-center gap-1 rounded-lg border border-line px-3 text-sm font-medium text-muted transition hover:border-line-strong hover:text-fg";
  return (
    <nav aria-label="Halaman" className="mt-8 flex items-center justify-between gap-3">
      {page > 1 ? (
        <Link href={href(page - 1)} className={cls}>
          <ChevronLeft size={16} /> <span className="hidden sm:inline">Sebelumnya</span>
        </Link>
      ) : (
        <span />
      )}
      <span className="font-mono text-xs text-muted">
        {page} / {pages}
      </span>
      {page < pages ? (
        <Link href={href(page + 1)} className={cls}>
          <span className="hidden sm:inline">Berikutnya</span> <ChevronRight size={16} />
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}

export function InstagramIcon({ size = 20 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}
