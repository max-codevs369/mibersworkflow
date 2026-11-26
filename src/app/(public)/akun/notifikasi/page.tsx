import Link from "next/link";
import { Bell, CheckCheck, Trash2 } from "lucide-react";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import ConfirmButton from "@/components/ui/ConfirmButton";
import { EmptyState } from "@/components/ui/bits";
import { relativeTime } from "@/lib/format";
import { btn, cx } from "@/lib/ui";
import { clearRead, markAllRead } from "../actions";
import NotificationLink from "./notification-link";
import PushSettings from "@/components/PushSettings";
import { pushPublicKey } from "@/lib/push";

export const metadata = { title: "Notifikasi", robots: { index: false, follow: false } };

export default async function NotificationsPage() {
  const session = await requireUser("/akun/notifikasi");
  const [items, devices] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.pushSubscription.count({ where: { userId: session.user.id } }),
  ]);
  const now = new Date();
  const unread = items.filter((n) => !n.isRead).length;

  return (
    <div>
      <PushSettings publicKey={pushPublicKey()} devices={devices} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          {unread ? `${unread} belum dibaca` : "Semua sudah dibaca"} · {items.length} notifikasi
        </p>
        <div className="flex gap-2">
          {unread > 0 && (
            <ConfirmButton action={markAllRead} skipConfirm className={btn.sm}>
              <CheckCheck size={15} /> Tandai semua dibaca
            </ConfirmButton>
          )}
          {items.length > unread && (
            <ConfirmButton
              action={clearRead}
              title="Hapus notifikasi yang sudah dibaca?"
              confirmLabel="Hapus"
              className={btn.sm}
            >
              <Trash2 size={15} /> Bersihkan
            </ConfirmButton>
          )}
        </div>
      </div>

      <div className="mt-5 grid gap-2">
        {items.length === 0 ? (
          <EmptyState icon={<Bell size={32} />} title="Belum ada notifikasi">
            Kabar tentang pengumuman, materi, agenda, piket, dan foto kirimanmu akan muncul di sini.
          </EmptyState>
        ) : (
          items.map((n) => {
            const body = (
              <>
                <span
                  className={cx("mt-1.5 h-2.5 w-2.5 flex-none rounded-full", n.isRead ? "bg-transparent" : "bg-brand")}
                  aria-hidden
                />
                <span className="min-w-0 flex-1">
                  <span className={cx("block leading-snug", n.isRead ? "text-muted" : "font-medium text-fg")}>{n.message}</span>
                  <span className="mt-0.5 block text-xs text-faint">{relativeTime(n.createdAt, now)}</span>
                </span>
              </>
            );
            const cls = cx(
              "flex w-full items-start gap-3 rounded-xl border px-4 py-3.5 text-left transition",
              n.isRead ? "border-line bg-transparent" : "border-line-strong bg-surface hover:border-brand"
            );
            return n.link ? (
              <NotificationLink key={n.id} id={n.id} href={n.link} className={cls}>
                {body}
              </NotificationLink>
            ) : (
              <div key={n.id} className={cls}>
                {body}
              </div>
            );
          })
        )}
      </div>
      {items.length >= 100 && (
        <p className="mt-4 text-center text-xs text-faint">
          Menampilkan 100 terbaru. <Link href="/akun/notifikasi" className="underline">Muat ulang</Link>
        </p>
      )}
    </div>
  );
}
