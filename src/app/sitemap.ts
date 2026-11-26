import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { publicWhere } from "@/lib/announcements";
import { siteUrl } from "@/lib/seo";

export const dynamic = "force-dynamic";

const STATIC_PAGES: { path: string; priority: number; changeFrequency: "daily" | "weekly" | "monthly" | "yearly" }[] = [
  { path: "/", priority: 1, changeFrequency: "daily" },
  { path: "/pengumuman", priority: 0.9, changeFrequency: "daily" },
  { path: "/agenda", priority: 0.8, changeFrequency: "weekly" },
  { path: "/agenda/piket", priority: 0.5, changeFrequency: "weekly" },
  { path: "/kenangan", priority: 0.8, changeFrequency: "weekly" },
  { path: "/dinding", priority: 0.7, changeFrequency: "daily" },
  { path: "/struktur", priority: 0.7, changeFrequency: "monthly" },
  { path: "/tentang", priority: 0.8, changeFrequency: "monthly" },
  { path: "/ketentuan", priority: 0.2, changeFrequency: "yearly" },
  { path: "/privasi", priority: 0.2, changeFrequency: "yearly" },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const now = new Date();
  const entries: MetadataRoute.Sitemap = STATIC_PAGES.map((p) => ({
    url: `${base}${p.path}`,
    lastModified: now,
    changeFrequency: p.changeFrequency,
    priority: p.priority,
  }));

  try {
    const [announcements, albums] = await Promise.all([
      prisma.announcement.findMany({
        where: publicWhere(now),
        select: { id: true, updatedAt: true, coverUrl: true },
        orderBy: { publishedAt: "desc" },
        take: 1000,
      }),
      prisma.album.findMany({
        where: { visibility: "PUBLIC" },
        select: { slug: true, createdAt: true, coverUrl: true },
        orderBy: { createdAt: "desc" },
        take: 1000,
      }),
    ]);
    for (const a of announcements) {
      entries.push({
        url: `${base}/pengumuman/${a.id}`,
        lastModified: a.updatedAt,
        changeFrequency: "weekly",
        priority: 0.7,
        ...(a.coverUrl ? { images: [new URL(a.coverUrl, base).toString()] } : {}),
      });
    }
    for (const al of albums) {
      entries.push({
        url: `${base}/kenangan/${encodeURIComponent(al.slug)}`,
        lastModified: al.createdAt,
        changeFrequency: "monthly",
        priority: 0.6,
        ...(al.coverUrl ? { images: [new URL(al.coverUrl, base).toString()] } : {}),
      });
    }
  } catch {
  }

  return entries;
}
