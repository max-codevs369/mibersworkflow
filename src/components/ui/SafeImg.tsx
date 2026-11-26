"use client";

import { useState } from "react";
import { ImageOff } from "lucide-react";
import { cx } from "@/lib/ui";

export default function SafeImg({
  src,
  alt,
  className,
  fallback,
  eager = false,
}: {
  src?: string | null;
  alt: string;
  className?: string;
  fallback?: React.ReactNode;
  eager?: boolean;
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

  return (
    <img
      src={src}
      alt={alt}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      onError={() => setFailed(src)}
      className={className}
    />
  );
}
