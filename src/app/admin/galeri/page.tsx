import Link from "next/link";
import { Images, Lock, Plus, ShieldCheck, Sparkles, X } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import AdminHeader from "@/components/admin/AdminHeader";
import FormDialog from "@/components/ui/FormDialog";
import ConfirmButton from "@/components/ui/ConfirmButton";
import ImagePicker from "@/components/ui/ImagePicker";
import { EmptyState } from "@/components/ui/bits";
import { longDate } from "@/lib/format";
import { badge, btn, card, cx } from "@/lib/ui";
import { FEATURED_MAX } from "@/lib/labels";
import AlbumFields from "./album-fields";
import { createAlbum, toggleFeatured } from "./actions";
import { thumbUrl } from "@/lib/thumb";

export const metadata = { title: "Galeri" };

export default async function AdminGalleryPage() {
  await requireAdmin();
  const [albums, pending] = await Promise.all([
    prisma.album.findMany({
      orderBy: [{ eventDate: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
      include: {
        media: { where: { status: "APPROVED", type: "PHOTO" }, take: 1, orderBy: { createdAt: "asc" }, select: { url: true } },
        _count: { select: { media: true } },
      },
    }),
    prisma.media.count({ where: { status: "PENDING" } }),
  ]);
  const featured = await prisma.media.findMany({
    where: { featuredAt: { not: null } },
    orderBy: { featuredAt: "asc" },
    select: { id: true, url: true, caption: true, album: { select: { id: true, title: true, visibility: true } } },
  });
  const pendingBy = await prisma.media.groupBy({ by: ["albumId"], where: { status: "PENDING" }, _count: true });
  const pendingOf = (id: string) => pendingBy.find((p) => p.albumId === id)?._count ?? 0;

  return (
    <div>
      <AdminHeader title="Galeri" description="Kelola album, unggah foto, dan periksa kiriman anggota.">
        <Link href="/admin/galeri/moderasi" className={cx(pending > 0 ? btn.primary : btn.secondary)}>
          <ShieldCheck size={18} /> Moderasi {pending > 0 && `(${pending})`}
        </Link>
        <FormDialog
          title="Album baru"
          trigger={
            <>
              <Plus size={18} /> Album baru
            </>
          }
          triggerClassName={btn.secondary}
          action={createAlbum}
          submitLabel="Buat album"
          size="lg"
        >
          <AlbumFields />
          <ImagePicker
            name="files"
            multiple
            allowVideo
            label="Foto / video awal (opsional)"
            hint="Maks 30 file. Foto pertama otomatis jadi sampul."
          />
        </FormDialog>
      </AdminHeader>
      <section className={cx(card, "mb-6 p-5")}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 font-bold">
              <Sparkles size={17} className="text-brand" /> Foto pilihan beranda
            </h2>
            <p className="mt-1 text-sm text-muted">
              Hanya foto yang dipilih di sini yang tampil di hero beranda. Buka album, lalu tekan tombol ✦ pada foto terbaik.
            </p>
          </div>
          <span className={cx(badge, featured.length >= FEATURED_MAX ? "bg-brand text-ink" : "bg-surface-3 text-muted")}>
            {featured.length}/{FEATURED_MAX} DIPILIH
          </span>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-3">
          {Array.from({ length: FEATURED_MAX }, (_, i) => featured[i]).map((f, i) =>
            f ? (
              <figure key={f.id} className="relative overflow-hidden rounded-lg border border-line bg-surface-2">
                <img src={thumbUrl(f.url, 640)} alt={f.caption ?? ""} className="aspect-[4/3] w-full object-cover" />
                <figcaption className="truncate px-2.5 py-2 text-xs text-muted">
                  <Link href={`/admin/galeri/${f.album.id}`} className="hover:text-brand">
                    {f.album.title}
                  </Link>
                  {f.album.visibility !== "PUBLIC" && <span className="ml-1 text-danger">(album privat, tidak tampil)</span>}
                </figcaption>
                <ConfirmButton
                  action={toggleFeatured.bind(null, f.id)}
                  skipConfirm
                  ariaLabel="Lepas dari beranda"
                  className="absolute right-1.5 top-1.5 flex h-8 w-8 items-center justify-center rounded-full bg-ink/80 text-fg transition hover:bg-danger hover:text-ink"
                >
                  <X size={15} />
                </ConfirmButton>
              </figure>
            ) : (
              <div
                key={`kosong-${i}`}
                className="flex aspect-[4/3] flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-line-strong text-center text-xs text-faint"
              >
                <Sparkles size={18} />
                Slot {i + 1} kosong
              </div>
            )
          )}
        </div>
      </section>
      {albums.length === 0 ? (
        <EmptyState icon={<Images size={32} />} title="Belum ada album">
          Buat album pertama, lalu unggah foto kegiatan kelas.
        </EmptyState>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
          {albums.map((a) => {
            const cover = a.coverUrl || a.media[0]?.url;
            const p = pendingOf(a.id);
            return (
              <Link
                key={a.id}
                href={`/admin/galeri/${a.id}`}
                className="group overflow-hidden rounded-2xl border border-line bg-surface transition hover:border-brand"
              >
                <div className="relative aspect-[4/3] bg-surface-2">
                  {cover ? (
                    <img src={thumbUrl(cover, 384)} alt="" loading="lazy" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-faint">
                      <Images size={28} />
                    </div>
                  )}
                  <div className="absolute left-2 top-2 flex gap-1">
                    {a.visibility === "MEMBERS_ONLY" && (
                      <span className={cx(badge, "bg-ink/85 text-fg")}>
                        <Lock size={10} /> ANGGOTA
                      </span>
                    )}
                    {p > 0 && <span className={cx(badge, "bg-brand text-ink")}>{p} MENUNGGU</span>}
                  </div>
                </div>
                <div className="p-3.5">
                  <p className="truncate font-semibold group-hover:text-brand">{a.title}</p>
                  <p className="truncate text-xs text-muted">
                    {a._count.media} file{a.eventDate ? ` · ${longDate(a.eventDate)}` : ""}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
