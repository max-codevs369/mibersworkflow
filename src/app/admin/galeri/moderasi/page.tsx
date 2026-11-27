import Link from "next/link";
import { Check, CheckCheck, Play, ShieldCheck, X } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import AdminHeader from "@/components/admin/AdminHeader";
import ConfirmButton from "@/components/ui/ConfirmButton";
import { EmptyState } from "@/components/ui/bits";
import { relativeTime } from "@/lib/format";
import { btn, card, cx } from "@/lib/ui";
import { approveAllMedia, reviewMedia } from "../actions";
import { thumbUrl } from "@/lib/thumb";

export const metadata = { title: "Moderasi Foto" };

export default async function MediaModerationPage() {
  await requireAdmin();
  const items = await prisma.media.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
    take: 120,
    include: { uploader: { select: { displayName: true } }, album: { select: { id: true, title: true } } },
  });
  const now = new Date();

  return (
    <div>
      <AdminHeader
        title="Moderasi foto"
        description="Kiriman anggota yang belum tampil di galeri."
        back={{ href: "/admin/galeri", label: "Galeri" }}
      >
        {items.length > 1 && (
          <ConfirmButton
            action={approveAllMedia}
            title={`Setujui ${items.length} file sekaligus?`}
            confirmLabel="Setujui semua"
            tone="primary"
            className={btn.primary}
          >
            <CheckCheck size={17} /> Setujui semua
          </ConfirmButton>
        )}
      </AdminHeader>
      {items.length === 0 ? (
        <EmptyState icon={<ShieldCheck size={32} />} title="Semua sudah diperiksa">
          Tidak ada foto yang menunggu persetujuan.
        </EmptyState>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((m) => (
            <figure key={m.id} className={cx(card, "overflow-hidden")}>
              <a href={m.url} target="_blank" rel="noopener noreferrer" className="block aspect-square bg-surface-2">
                {m.type === "VIDEO" ? (
                  <span className="flex h-full items-center justify-center text-muted">
                    <Play size={28} />
                  </span>
                ) : (
                  <img src={thumbUrl(m.url, 384)} alt="" loading="lazy" className="h-full w-full object-cover" />
                )}
              </a>
              <figcaption className="p-3">
                <p className="truncate text-sm font-semibold">{m.uploader.displayName}</p>
                <p className="truncate text-xs text-muted">
                  ke{" "}
                  <Link href={`/admin/galeri/${m.album.id}`} className="hover:text-brand">
                    {m.album.title}
                  </Link>{" "}
                  · {relativeTime(m.createdAt, now)}
                </p>
                {m.caption && <p className="mt-1 line-clamp-2 text-xs text-fg/80">“{m.caption}”</p>}
                <div className="mt-3 grid grid-cols-2 gap-1.5">
                  <ConfirmButton action={reviewMedia.bind(null, m.id, "APPROVED")} skipConfirm className={btn.smPrimary}>
                    <Check size={15} /> Setujui
                  </ConfirmButton>
                  <ConfirmButton
                    action={reviewMedia.bind(null, m.id, "REJECTED")}
                    title="Tolak file ini?"
                    description="File akan dihapus dan pengirim diberi tahu."
                    confirmLabel="Tolak"
                    className={btn.sm}
                  >
                    <X size={15} /> Tolak
                  </ConfirmButton>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      )}
    </div>
  );
}
