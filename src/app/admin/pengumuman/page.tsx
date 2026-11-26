import Link from "next/link";
import { Pencil, Pin, PinOff, Plus, Trash2, Eye, Megaphone, ArrowUpRight } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import AdminHeader, { FilterTabs } from "@/components/admin/AdminHeader";
import ConfirmButton from "@/components/ui/ConfirmButton";
import FormDialog from "@/components/ui/FormDialog";
import AnnouncementFields from "./announcement-form";
import { EmptyState } from "@/components/ui/bits";
import { longDateTime, toInputDateTime } from "@/lib/format";
import { CATEGORY_LABEL } from "@/lib/announcements";
import { badge, btn, card, cx } from "@/lib/ui";
import { createAnnouncement, deleteAnnouncement, togglePinAnnouncement, updateAnnouncement } from "./actions";

export const metadata = { title: "Pengumuman" };

type Row = Awaited<ReturnType<typeof load>>[number];
const load = () =>
  prisma.announcement.findMany({
    orderBy: [{ isPinned: "desc" }, { publishedAt: "desc" }],
    include: { author: { select: { name: true } } },
  });

export default async function AnnouncementsAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; baru?: string }>;
}) {
  await requireAdmin();
  const sp = await searchParams;
  const now = new Date();
  const all = await load();

  const stateOf = (a: Row) => {
    if (a.status === "DRAFT") return { key: "draft", label: "Draf", tone: "bg-surface-3 text-muted" };
    if (a.publishedAt > now) return { key: "scheduled", label: "Terjadwal", tone: "bg-info/15 text-info" };
    if (a.expiresAt && a.expiresAt <= now) return { key: "expired", label: "Berakhir", tone: "bg-surface-3 text-faint" };
    return { key: "live", label: "Tayang", tone: "bg-ok/15 text-ok" };
  };

  const filter = ["live", "scheduled", "draft", "expired"].includes(sp.status ?? "") ? sp.status! : "all";
  const items = filter === "all" ? all : all.filter((a) => stateOf(a).key === filter);
  const count = (k: string) => all.filter((a) => stateOf(a).key === k).length;

  return (
    <div>
      <AdminHeader title="Pengumuman" description="Tulis, jadwalkan, dan sematkan informasi untuk seluruh kelas.">
        <FormDialog
          title="Tulis pengumuman"
          description="Pengumuman tampil di halaman Pengumuman dan beranda."
          trigger={
            <>
              <Plus size={18} /> Tulis pengumuman
            </>
          }
          action={createAnnouncement}
          submitLabel="Terbitkan"
          size="lg"
          defaultOpen={sp.baru === "1"}
        >
          <AnnouncementFields />
        </FormDialog>
      </AdminHeader>

      <FilterTabs
        active={filter}
        tabs={[
          { key: "all", label: "Semua", count: all.length, href: "/admin/pengumuman" },
          { key: "live", label: "Tayang", count: count("live"), href: "/admin/pengumuman?status=live" },
          { key: "scheduled", label: "Terjadwal", count: count("scheduled"), href: "/admin/pengumuman?status=scheduled" },
          { key: "draft", label: "Draf", count: count("draft"), href: "/admin/pengumuman?status=draft" },
          { key: "expired", label: "Berakhir", count: count("expired"), href: "/admin/pengumuman?status=expired" },
        ]}
      />

      {items.length === 0 ? (
        <EmptyState icon={<Megaphone size={32} />} title="Belum ada pengumuman di sini" />
      ) : (
        <div className={cx(card, "divide-y divide-line overflow-hidden")}>
          {items.map((a) => {
            const s = stateOf(a);
            return (
              <div key={a.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:p-5">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className={cx(badge, s.tone)}>{s.label.toUpperCase()}</span>
                    {a.isPinned && <span className={cx(badge, "bg-brand/15 text-brand")}>DISEMATKAN</span>}
                    {a.priority === "URGENT" && <span className={cx(badge, "bg-danger text-ink")}>MENDESAK</span>}
                    {a.priority === "IMPORTANT" && <span className={cx(badge, "border border-brand/60 text-brand")}>PENTING</span>}
                  </div>
                  <p className="mt-1.5 font-semibold leading-snug">{a.title}</p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-sm text-muted">
                    <span>{CATEGORY_LABEL[a.category]}</span>·<span>{longDateTime(a.publishedAt)}</span>·
                    <span>{a.author.name}</span>·
                    <span className="inline-flex items-center gap-1">
                      <Eye size={13} /> {a.views}
                    </span>
                  </p>
                </div>
                <div className="flex flex-none gap-1.5">
                  {s.key === "live" && (
                    <Link href={`/pengumuman/${a.id}`} target="_blank" className={btn.icon} aria-label="Lihat di situs">
                      <ArrowUpRight size={17} />
                    </Link>
                  )}
                  <ConfirmButton
                    action={togglePinAnnouncement.bind(null, a.id)}
                    skipConfirm
                    className={btn.icon}
                    ariaLabel={a.isPinned ? "Lepas sematan" : "Sematkan"}
                  >
                    {a.isPinned ? <PinOff size={17} /> : <Pin size={17} />}
                  </ConfirmButton>
                  <FormDialog
                    title="Ubah pengumuman"
                    trigger={<Pencil size={17} />}
                    triggerLabel="Ubah"
                    triggerClassName={btn.icon}
                    action={updateAnnouncement.bind(null, a.id)}
                    submitLabel="Simpan perubahan"
                    size="lg"
                  >
                    <AnnouncementFields
                      initial={{
                        title: a.title,
                        content: a.content,
                        category: a.category,
                        priority: a.priority,
                        status: a.status,
                        isPinned: a.isPinned,
                        publishedAt: toInputDateTime(a.publishedAt),
                        expiresAt: toInputDateTime(a.expiresAt),
                        coverUrl: a.coverUrl,
                        actionLabel: a.actionLabel ?? "",
                        actionUrl: a.actionUrl ?? "",
                      }}
                    />
                  </FormDialog>
                  <ConfirmButton
                    action={deleteAnnouncement.bind(null, a.id)}
                    title="Hapus pengumuman?"
                    description={<>“{a.title}” akan dihapus permanen.</>}
                    confirmLabel="Hapus"
                    className={cx(btn.icon, "hover:border-danger hover:text-danger")}
                    ariaLabel="Hapus"
                  >
                    <Trash2 size={17} />
                  </ConfirmButton>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
