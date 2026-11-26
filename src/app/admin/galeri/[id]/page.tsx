import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight, Check, ImagePlus, Pencil, Play, Sparkles, Star, Trash2, X } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import AdminHeader from "@/components/admin/AdminHeader";
import ActionForm from "@/components/ui/ActionForm";
import FormDialog from "@/components/ui/FormDialog";
import ConfirmButton from "@/components/ui/ConfirmButton";
import ImagePicker from "@/components/ui/ImagePicker";
import { Field, TextInput } from "@/components/ui/Fields";
import { EmptyState } from "@/components/ui/bits";
import { badge, btn, card, cx } from "@/lib/ui";
import AlbumFields from "../album-fields";
import { deleteAlbum, deleteMedia, reviewMedia, setCover, toggleFeatured, updateAlbum, updateCaption, uploadMedia } from "../actions";

export const metadata = { title: "Kelola Album" };

export default async function AdminAlbumPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const album = await prisma.album.findUnique({
    where: { id },
    include: {
      media: {
        orderBy: [{ status: "asc" }, { createdAt: "desc" }],
        include: { uploader: { select: { name: true } } },
      },
    },
  });
  if (!album) notFound();
  const pending = album.media.filter((m) => m.status === "PENDING").length;

  return (
    <div>
      <AdminHeader
        title={album.title}
        description={`${album.media.length} file${pending ? ` · ${pending} menunggu persetujuan` : ""}`}
        back={{ href: "/admin/galeri", label: "Galeri" }}
      >
        <Link href={`/kenangan/${album.slug}`} target="_blank" className={btn.secondary}>
          Lihat <ArrowUpRight size={16} />
        </Link>
        <FormDialog
          title="Unggah ke album"
          trigger={
            <>
              <ImagePlus size={18} /> Unggah foto
            </>
          }
          action={uploadMedia.bind(null, album.id)}
          submitLabel="Unggah"
          size="lg"
        >
          <ImagePicker name="files" multiple allowVideo label="Pilih foto / video" hint="Maks 30 file." />
          <Field label="Keterangan untuk semua file (opsional)">
            <TextInput name="caption" maxLength={200} />
          </Field>
        </FormDialog>
      </AdminHeader>
      <div className="grid gap-6">
        <section className={cx(card, "p-5 sm:p-6")}>
          <h2 className="mb-4 font-bold">Detail album</h2>
          <ActionForm action={updateAlbum.bind(null, album.id)} submitLabel="Simpan">
            <div className="grid gap-5 md:grid-cols-2">
              <div className="grid content-start gap-5">
                <AlbumFields a={album} />
              </div>
              <Field label="Sampul" hint="Sampul baru otomatis ikut masuk ke isi album. Bisa juga pilih ★ pada foto.">
                <ImagePicker name="cover" defaultUrl={album.coverUrl} removable crop={4 / 3} label="Unggah sampul" />
              </Field>
            </div>
          </ActionForm>
          <div className="mt-6 border-t border-line pt-5">
            <ConfirmButton
              action={deleteAlbum.bind(null, album.id)}
              title="Hapus album ini?"
              description={`Album beserta ${album.media.length} file di dalamnya akan dihapus permanen.`}
              confirmLabel="Hapus album"
              className={btn.danger}
            >
              <Trash2 size={16} /> Hapus album
            </ConfirmButton>
          </div>
        </section>
        <section>
          {album.media.length === 0 ? (
            <EmptyState icon={<ImagePlus size={32} />} title="Album masih kosong">
              Gunakan tombol “Unggah foto” di atas.
            </EmptyState>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {album.media.map((m) => {
                const isCover = album.coverUrl === m.url;
                return (
                  <figure
                    key={m.id}
                    className={cx(
                      "overflow-hidden rounded-xl border bg-surface",
                      m.status === "PENDING" ? "border-brand" : isCover ? "border-ok" : "border-line"
                    )}
                  >
                    <a href={m.url} target="_blank" rel="noopener noreferrer" className="relative block aspect-square bg-surface-2">
                      {m.type === "VIDEO" ? (
                        <span className="flex h-full items-center justify-center text-muted">
                          <Play size={28} />
                        </span>
                      ) : (
                        <img src={m.url} alt="" loading="lazy" className="h-full w-full object-cover" />
                      )}
                      <span className="absolute left-1.5 top-1.5 flex gap-1">
                        {m.status === "PENDING" && <span className={cx(badge, "bg-brand text-ink")}>MENUNGGU</span>}
                        {isCover && <span className={cx(badge, "bg-ok text-ink")}>SAMPUL</span>}
                        {m.featuredAt && <span className={cx(badge, "bg-brand text-ink")}>BERANDA</span>}
                      </span>
                    </a>
                    <figcaption className="p-2.5">
                      <p className="truncate text-xs text-muted" title={m.caption ?? ""}>
                        {m.caption || <span className="italic text-faint">tanpa keterangan</span>}
                      </p>
                      <p className="truncate text-[11px] text-faint">oleh {m.uploader.name}</p>
                      <div className="mt-2 flex gap-1">
                        {m.status === "PENDING" ? (
                          <>
                            <ConfirmButton
                              action={reviewMedia.bind(null, m.id, "APPROVED")}
                              skipConfirm
                              ariaLabel="Setujui"
                              className="flex h-8 flex-1 items-center justify-center rounded-md bg-brand text-ink hover:bg-brand-soft"
                            >
                              <Check size={15} />
                            </ConfirmButton>
                            <ConfirmButton
                              action={reviewMedia.bind(null, m.id, "REJECTED")}
                              title="Tolak foto ini?"
                              description="File akan dihapus dan pengirim diberi tahu."
                              confirmLabel="Tolak"
                              ariaLabel="Tolak"
                              className="flex h-8 flex-1 items-center justify-center rounded-md border border-line text-muted hover:border-danger hover:text-danger"
                            >
                              <X size={15} />
                            </ConfirmButton>
                          </>
                        ) : (
                          <>
                            {m.type === "PHOTO" && !isCover && (
                              <ConfirmButton
                                action={setCover.bind(null, album.id, m.url)}
                                skipConfirm
                                ariaLabel="Jadikan sampul"
                                className="flex h-8 w-8 items-center justify-center rounded-md border border-line text-muted hover:border-ok hover:text-ok"
                              >
                                <Star size={14} />
                              </ConfirmButton>
                            )}
                            {m.type === "PHOTO" && (
                              <ConfirmButton
                                action={toggleFeatured.bind(null, m.id)}
                                skipConfirm
                                title="Tidak bisa dipilih"
                                ariaLabel={m.featuredAt ? "Lepas dari beranda" : "Pilih untuk beranda"}
                                className={cx(
                                  "flex h-8 w-8 items-center justify-center rounded-md border transition",
                                  m.featuredAt
                                    ? "border-brand bg-brand/15 text-brand"
                                    : "border-line text-muted hover:border-brand hover:text-brand"
                                )}
                              >
                                <Sparkles size={14} />
                              </ConfirmButton>
                            )}
                            <FormDialog
                              title="Ubah keterangan"
                              trigger={<Pencil size={14} />}
                              triggerLabel="Ubah keterangan"
                              triggerClassName="flex h-8 w-8 items-center justify-center rounded-md border border-line text-muted hover:border-brand hover:text-brand"
                              action={updateCaption.bind(null, m.id)}
                              size="sm"
                            >
                              <Field label="Keterangan">
                                <TextInput name="caption" maxLength={200} defaultValue={m.caption ?? ""} />
                              </Field>
                            </FormDialog>
                            <ConfirmButton
                              action={deleteMedia.bind(null, m.id)}
                              title="Hapus file ini?"
                              confirmLabel="Hapus"
                              ariaLabel="Hapus"
                              className="ml-auto flex h-8 w-8 items-center justify-center rounded-md border border-line text-muted hover:border-danger hover:text-danger"
                            >
                              <Trash2 size={14} />
                            </ConfirmButton>
                          </>
                        )}
                      </div>
                    </figcaption>
                  </figure>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
