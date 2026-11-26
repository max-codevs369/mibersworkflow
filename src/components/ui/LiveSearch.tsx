"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { LoaderCircle, Search, X } from "lucide-react";
import { cx, input } from "@/lib/ui";

export default function LiveSearch({
  defaultValue = "",
  placeholder,
  label,
  param = "q",
  className,
}: {
  defaultValue?: string;
  placeholder: string;
  label: string;
  param?: string;
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [value, setValue] = useState(defaultValue);
  const [focused, setFocused] = useState(false);
  const [synced, setSynced] = useState(defaultValue);
  if (synced !== defaultValue) {
    setSynced(defaultValue);
    if (!focused) setValue(defaultValue);
  }
  const [pending, start] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  function push(next: string) {
    const params = new URLSearchParams(window.location.search);
    const term = next.trim();
    if (term) params.set(param, term);
    else params.delete(param);
    params.delete("page");
    const qs = params.toString();
    start(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  }

  function onChange(next: string) {
    setValue(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => push(next), 280);
  }

  return (
    <div role="search" className={cx("relative", className)}>
      <Search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-faint" aria-hidden />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            if (timer.current) clearTimeout(timer.current);
            push(value);
          }
        }}
        placeholder={placeholder}
        aria-label={label}
        className={cx(input, "pl-10 pr-11 [&::-webkit-search-cancel-button]:hidden")}
      />
      <span className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center text-faint">
        {pending ? (
          <LoaderCircle size={17} className="animate-spin" aria-label="Mencari" />
        ) : (
          value && (
            <button
              type="button"
              onClick={() => onChange("")}
              aria-label="Hapus pencarian"
              className="flex h-8 w-8 items-center justify-center rounded-md hover:text-fg"
            >
              <X size={16} />
            </button>
          )
        )}
      </span>
    </div>
  );
}
