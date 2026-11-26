import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ImagePlus, Images, Lock } from "lucide-react";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { container } from "@/components/PageHeader";
import Lightbox from "@/components/gallery/Lightbox";
import FormDialog from "@/components/ui/FormDialog";
import ImagePicker from "@/components/ui/ImagePicker";
import { Field, TextInput } from "@/components/ui/Fields";
import { EmptyState } from "@/components/ui/bits";
import { longDate } from "@/lib/format";
import { isAdminRole } from "@/lib/roles";
import { badge, btn, cx } from "@/lib/ui";
import { contributeMedia } from "../actions";
import { excerpt } from "@/lib/seo";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string }> };

async function getAlbum(slug: string, loggedIn: boolean) {
  return prisma.album.findFirst({
    where: { slug, ...(loggedIn ? {} : { visibility: "PUBLIC" }) },
    include: {
      creator: { select: { displayName: true } },
      media: {
        where: { status: "APPROVED" },
        orderBy: { createdAt: "asc" },
        include: { uploader: { select: { displayName: true } } },
      },
    },
  });
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const session = await getSession();
  const a = await getAlbum((await params).slug, !!session);
  if (!a) return { title: "Album tidak ditemukan", robots: { index: false, follow: false } };
  const description = a.description ? excerpt(a.description) : `Album kenangan "${a.title}" kelas Mibers Duo Anam.`;
  const url = `/kenangan/${encodeURIComponent(a.slug)}`;
  const cover = a.coverUrl ?? a.media.find((m) => m.type === "PHOTO")?.url;
  return {
    title: a.title,
    description,
    alternates: { canonical: url },
    ...(a.visibility === "PUBLIC" ? {} : { robots: { index: false, follow: false } }),
    openGraph: { title: a.title, description, url, ...(cover ? { images: [cover] } : {}) },
    twitter: { card: "summary_large_image", title: a.title, description, ...(cover ? { images: [cover] } : {}) },
  };
}

export default async function AlbumPage({ params }: Params) {
  const { slug } = await params;
  const session = await getSession();
  const album = await getAlbum(slug, !!session);

  if (!album) {
    const hidden = !session && (await prisma.album.findUnique({ where: { slug }, select: { id: true } }));
    if (hidden) {
      return (
        <section className={cx(container, "max-w-xl pt-5")}>
          <Breadcrumbs items={[{ label: "Beranda", href: "/" }, { label: "Galeri kenangan", href: "/kenangan" }, { label: "Album khusus anggota" }]} />
          <div className="mt-10">
          <EmptyState
            icon={<Lock size={32} />}
            title="Album khusus anggota"
            action={
              <Link href={`/login?next=/kenangan/${slug}`} className={btn.primary}>
                Masuk untuk melihat
              </Link>
            }
          >
            Foto-foto di album ini hanya bisa dilihat oleh anggota kelas.
          </EmptyState>
          </div>
        </section>
      );
    }
    notFound();
  }

  const myPending = session
    ? await prisma.media.count({ where: { albumId: album.id, uploadedBy: session.user.id, status: "PENDING" } })
    : 0;

  const items = album.media.map((m) => ({
    id: m.id,
    url: m.url,
    type: m.type,
    caption: m.caption,
    by: m.uploader.displayName,
  }));
  if (album.coverUrl && !items.some((m) => m.url === album.coverUrl)) {
    items.unshift({ id: `cover-${album.id}`, url: album.coverUrl, type: "PHOTO", caption: null, by: album.creator.displayName });
  }

  return (
    <section className={cx(container, "pt-5")}>
      <Breadcrumbs
        items={[
          { label: "Beranda", href: "/" },
          { label: "Galeri kenangan", href: "/kenangan" },
          { label: album.title },
        ]}
      />

      <div className="mt-6 flex flex-col gap-5 sm:mt-8 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0 max-w-3xl">
          <p className="eyebrow">{album.eventDate ? longDate(album.eventDate) : "Album kelas"}</p>
          <h1 className="prose-safe mt-2 text-3xl font-bold sm:text-4xl">{album.title}</h1>
          {album.description && (
            <p className="prose-safe mt-3 whitespace-pre-line leading-relaxed text-muted">{album.description}</p>
          )}
          <p className="mt-3 flex flex-wrap items-center gap-2 text-sm text-faint">
            {items.length} file · dibuat oleh {album.creator.displayName}
            {album.visibility === "MEMBERS_ONLY" && (
              <span className={cx(badge, "bg-surface-3 text-muted")}>
                <Lock size={11} /> KHUSUS ANGGOTA
              </span>
            )}
          </p>
        </div>

        {session && (
          <FormDialog
            title={`Tambah foto ke “${album.title}”`}
            description={
              isAdminRole(session.user.role)
                ? "Foto langsung tampil di album."
                : "Foto akan dicek pengurus sebelum tampil."
            }
            trigger={
              <>
                <ImagePlus size={18} /> Tambah foto
              </>
            }
            action={contributeMedia.bind(null, album.id)}
            submitLabel="Unggah"
            size="lg"
          >
            <ImagePicker
              name="files"
              multiple
              allowVideo
              label="Pilih foto / video"
              hint="Maksimal 20 file."
            />
            <Field label="Keterangan (opsional)" hint="Dipakai untuk semua file yang diunggah sekarang.">
              <TextInput name="caption" maxLength={200} placeholder="Misalnya: foto bareng setelah upacara" />
            </Field>
          </FormDialog>
        )}
      </div>

      {myPending > 0 && (
        <p className="mt-6 rounded-lg border border-brand/30 bg-brand/10 px-4 py-3 text-sm text-fg">
          {myPending} foto kirimanmu masih menunggu persetujuan pengurus.
        </p>
      )}

      <div className="mt-8">
        {items.length === 0 ? (
          <EmptyState icon={<Images size={32} />} title="Album ini masih kosong">
            {session ? "Jadilah yang pertama menambahkan foto." : "Foto akan muncul setelah diunggah anggota."}
          </EmptyState>
        ) : (
          <Lightbox items={items} />
        )}
      </div>
    </section>
  );
}
