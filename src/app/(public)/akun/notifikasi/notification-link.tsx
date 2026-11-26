"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { openNotification } from "../actions";

export default function NotificationLink({
  id,
  href,
  className,
  children,
}: {
  id: string;
  href: string;
  className: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const safe = href.startsWith("/") && !href.startsWith("//") ? href : "/";

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await openNotification(id);
          router.push(safe);
        })
      }
      className={className}
    >
      {children}
    </button>
  );
}
