import Link from "next/link";
import { notFound } from "next/navigation";
import { after } from "next/server";
import type { Metadata } from "next";
import { ArrowUpRight, Eye, TriangleAlert } from "lucide-react";
import { prisma } from "@/lib/prisma";
import ShareButtons from "@/components/ShareButtons";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import SafeImg from "@/components/ui/SafeImg";
import AnnouncementBadges from "@/components/AnnouncementBadges";
import { Avatar } from "@/components/ui/bits";
import { longDate, longDateTime } from "@/lib/format";
import { isNew, publicWhere } from "@/lib/announcements";
import { container } from "@/components/PageHeader";
import { cx } from "@/lib/ui";
import { absoluteUrl, excerpt, jsonLd } from "@/lib/seo";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

async function getAnnouncement(id: string) {
  return prisma.announcement.findFirst({
    where: { id, status: "PUBLISHED", publishedAt: { lte: new Date() } },
    include: { author: { select: { displayName: true, image: true } } },
  });
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const a = await getAnnouncement((await params).id);
  if (!a) return { title: "Pengumuman tidak ditemukan", robots: { index: false, follow: false } };
  const description = excerpt(a.content);
  const url = `/pengumuman/${a.id}`;
  return {
    title: a.title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      title: a.title,
      description,
      url,
      publishedTime: a.publishedAt.toISOString(),
      modifiedTime: a.updatedAt.toISOString(),
      authors: [a.author.displayName],
      ...(a.coverUrl ? { images: [a.coverUrl] } : {}),
    },
    twitter: { card: "summary_large_image", title: a.title, description, ...(a.coverUrl ? { images: [a.coverUrl] } : {}) },
  };
}

export default async function AnnouncementDetailPage({ params }: Params) {
  const { id } = await params;
  const a = await getAnnouncement(id);
  if (!a) notFound();

  const now = new Date();
  const expired = a.expiresAt !== null && a.expiresAt <= now;

  after(() =>
    prisma.announcement.update({ where: { id: a.id }, data: { views: { increment: 1 } } }).catch(() => {})
  );

  const others = await prisma.announcement.findMany({
    where: { ...publicWhere(now), id: { not: a.id } },
    orderBy: { publishedAt: "desc" },
    take: 3,
  });

  const edited = a.updatedAt.getTime() - a.publishedAt.getTime() > 60000;
  const settings = await getSettings();
  const ld = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: a.title.slice(0, 110),
    description: excerpt(a.content),
    datePublished: a.publishedAt.toISOString(),
    dateModified: a.updatedAt.toISOString(),
    mainEntityOfPage: absoluteUrl(`/pengumuman/${a.id}`),
    author: { "@type": "Person", name: a.author.displayName },
    publisher: { "@type": "Organization", name: settings.site_name, logo: { "@type": "ImageObject", url: absoluteUrl("/icon-512.png") } },
    image: [absoluteUrl(a.coverUrl ?? "/opengraph-image")],
  };

  return (
    <article className={cx(container, "max-w-3xl pt-5")}>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(ld)} />
      <Breadcrumbs
        items={[
          { label: "Beranda", href: "/" },
          { label: "Pengumuman", href: "/pengumuman" },
          { label: a.title },
        ]}
      />

      {a.priority === "URGENT" && (
        <div role="alert" className="mt-5 flex items-center gap-2.5 rounded-xl bg-danger px-4 py-3 text-sm font-bold text-ink">
          <TriangleAlert size={18} /> Pengumuman mendesak — mohon segera dibaca.
        </div>
      )}
      {expired && (
        <div className="mt-5 rounded-xl border border-line bg-surface px-4 py-3 text-sm text-muted">
          Masa tayang pengumuman ini sudah berakhir. Disimpan sebagai arsip.
        </div>
      )}

      <div className="mt-6 flex flex-wrap gap-1.5">
        <AnnouncementBadges
          category={a.category}
          priority={a.priority}
          isPinned={a.isPinned}
          isNew={isNew(a.publishedAt, now)}
        />
      </div>

      <h1 className="prose-safe mt-4 text-3xl font-bold leading-tight sm:text-4xl">{a.title}</h1>

      <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 border-y border-line py-4 text-sm text-muted">
        <span className="flex items-center gap-2.5">
          <Avatar name={a.author.displayName} src={a.author.image} size={32} />
          <span>
            <span className="block font-semibold text-fg">{a.author.displayName}</span>
            <span className="block text-xs">{longDateTime(a.publishedAt)}</span>
          </span>
        </span>
        <span className="flex items-center gap-1.5">
          <Eye size={16} /> {a.views + 1} kali dibaca
        </span>
      </div>

      {a.coverUrl && (
        <div className="mt-8 overflow-hidden rounded-xl border border-line bg-surface-2">
          <SafeImg src={a.coverUrl} alt={a.title} eager className="max-h-[560px] w-full object-cover" />
        </div>
      )}

      <div className="prose-safe mt-8 whitespace-pre-line text-base leading-[1.85] text-fg sm:text-[17px]">{a.content}</div>

      {edited && <p className="mt-6 text-sm italic text-faint">Diperbarui {longDate(a.updatedAt)}.</p>}

      {a.actionUrl && a.actionLabel && (
        <a
          href={a.actionUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-8 inline-flex min-h-12 items-center gap-2 rounded-lg bg-brand px-6 font-semibold text-ink transition hover:-translate-y-0.5 hover:bg-brand-soft"
        >
          {a.actionLabel} <ArrowUpRight size={18} />
        </a>
      )}

      <div className="mt-10 rounded-2xl border border-line bg-surface p-5">
        <p className="mb-3 text-sm font-semibold">Bagikan ke teman sekelas</p>
        <ShareButtons title={a.title} />
      </div>

      {others.length > 0 && (
        <aside className="mt-14">
          <h2 className="mb-4 text-xl font-bold">Pengumuman lainnya</h2>
          <div className="grid gap-2">
            {others.map((o) => (
              <Link
                key={o.id}
                href={`/pengumuman/${o.id}`}
                className="flex flex-col gap-0.5 rounded-xl border border-line bg-surface px-4 py-3.5 transition hover:border-brand sm:flex-row sm:items-center sm:justify-between sm:gap-4"
              >
                <span className="truncate font-medium">{o.title}</span>
                <span className="flex-none text-sm text-faint">{longDate(o.publishedAt)}</span>
              </Link>
            ))}
          </div>
        </aside>
      )}
    </article>
  );
}
