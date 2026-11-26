import Navbar from "@/components/Navbar";
import { getSession } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { prisma } from "@/lib/prisma";
import { totalUnread } from "@/lib/conversations";

export default async function SiteNavbar() {
  const [session, settings] = await Promise.all([getSession(), getSettings()]);
  const [unread, chatUnread] = session
    ? await Promise.all([
        prisma.notification.count({ where: { userId: session.user.id, isRead: false } }),
        totalUnread(session.user.id),
      ])
    : [0, 0];

  return (
    <>
      <a
        href="#konten"
        className="sr-only z-[200] rounded-md bg-brand px-4 py-2 font-semibold text-ink focus:not-sr-only focus:fixed focus:left-3 focus:top-3"
      >
        Lewati ke konten
      </a>
      <Navbar
        siteName={settings.site_name}
        instagram={settings.instagram}
        user={
          session
            ? {
                name: session.user.name,
                image: session.user.image ?? null,
                role: String(session.user.role ?? "MEMBER"),
              }
            : null
        }
        unread={unread}
        chatUnread={chatUnread}
      />
    </>
  );
}
