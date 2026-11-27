"use client";

import { useState } from "react";
import { ImageOff } from "lucide-react";
import { cx } from "@/lib/ui";
import { thumbUrl } from "@/lib/thumb";

export default function SafeImg({
  src,
  alt,
  className,
  fallback,
  eager = false,
  width,
}: {
  src?: string | null;
  alt: string;
  className?: string;
  fallback?: React.ReactNode;
  eager?: boolean;
  width?: number;
}) {
  const [failed, setFailed] = useState<string | null>(null);

  if (!src || failed === src) {
    return (
      <>
        {fallback ?? (
          <span className={cx("flex h-full w-full items-center justify-center bg-surface-3 text-faint", className)}>
            <ImageOff size={22} aria-hidden />
            <span className="sr-only">{alt || "Gambar tidak tersedia"}</span>
          </span>
        )}
      </>
    );
  }

  const one = width ? thumbUrl(src, width) : src;
  const two = width ? thumbUrl(src, width * 2) : src;

  return (
    <img
      src={one}
      srcSet={one !== two ? `${one} 1x, ${two} 2x` : undefined}
      alt={alt}
      loading={eager ? "eager" : "lazy"}
      fetchPriority={eager ? "high" : undefined}
      decoding="async"
      onError={() => setFailed(src)}
      className={className}
    />
  );
}
