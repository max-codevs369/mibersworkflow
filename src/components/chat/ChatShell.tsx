"use client";

import { useSelectedLayoutSegment } from "next/navigation";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { cx } from "@/lib/ui";
import ChatPulse from "./ChatPulse";

export default function ChatShell({
  titles,
  list,
  children,
}: {
  titles: Record<string, string>;
  list: React.ReactNode;
  children: React.ReactNode;
}) {
  const segment = useSelectedLayoutSegment();
  const inRoom = segment !== null;
  const title = segment ? titles[segment] : undefined;

  return (
    <div className="flex h-[calc(100dvh-4rem)] flex-col bg-ink">
      {!inRoom && <ChatPulse interval={2500} />}
      <div className="mx-auto w-full max-w-[1480px] px-4 py-2 sm:px-6 lg:px-8 lg:py-3">
        <Breadcrumbs
          items={[
            { label: "Beranda", href: "/" },
            { label: "Ruang bersama" },
            inRoom ? { label: "Ruang obrolan", href: "/obrolan" } : { label: "Ruang obrolan" },
            ...(inRoom ? [{ label: title ?? "Percakapan" }] : []),
          ]}
        />
      </div>

      <div className="mx-auto flex min-h-0 w-full max-w-[1480px] flex-1 lg:px-8 lg:pb-6">
        <div className="flex min-h-0 w-full overflow-hidden border-t border-wa-line lg:rounded-xl lg:border lg:shadow-2xl lg:shadow-black/40">
          <aside
            className={cx(
              "min-h-0 w-full flex-col bg-wa-list lg:flex lg:w-[min(400px,36%)] lg:flex-none lg:border-r lg:border-wa-line",
              inRoom ? "hidden" : "flex"
            )}
          >
            {list}
          </aside>
          <section className={cx("min-h-0 min-w-0 flex-1 flex-col", inRoom ? "flex" : "hidden lg:flex")}>
            {children}
          </section>
        </div>
      </div>
    </div>
  );
}
