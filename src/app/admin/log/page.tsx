import { ScrollText } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/session";
import AdminHeader from "@/components/admin/AdminHeader";
import { Avatar, EmptyState, Pagination } from "@/components/ui/bits";
import { AUDIT_LABEL } from "@/lib/audit";
import { longDateTime } from "@/lib/format";
import { card, cx } from "@/lib/ui";

export const metadata = { title: "Log Aktivitas" };
const PER_PAGE = 40;

export default async function AuditLogPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  await requireSuperAdmin();
  const page = Math.max(1, Math.floor(Number((await searchParams).page)) || 1);
  const [total, logs] = await Promise.all([
    prisma.auditLog.count(),
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      include: { user: { select: { name: true, image: true } } },
    }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));

  return (
    <div>
      <AdminHeader title="Log aktivitas" description={`Jejak semua tindakan pengurus · ${total} catatan`} />
      {logs.length === 0 ? (
        <EmptyState icon={<ScrollText size={32} />} title="Belum ada aktivitas" />
      ) : (
        <div className={cx(card, "divide-y divide-line")}>
          {logs.map((l) => (
            <div key={l.id} className="flex items-start gap-3 px-4 py-3">
              <Avatar name={l.user?.name ?? "Sistem"} src={l.user?.image} size={32} />
              <div className="min-w-0 flex-1 text-sm">
                <p>
                  <span className="font-semibold">{l.user?.name ?? "Akun terhapus"}</span>{" "}
                  <span className="text-muted">{AUDIT_LABEL[l.action] ?? l.action}</span>
                </p>
                <p className="truncate font-mono text-[11px] text-faint">
                  {l.entity}
                  {l.entityId ? ` · ${l.entityId}` : ""}
                </p>
              </div>
              <time className="flex-none text-xs text-faint" dateTime={l.createdAt.toISOString()}>
                {longDateTime(l.createdAt)}
              </time>
            </div>
          ))}
        </div>
      )}
      <Pagination page={Math.min(page, pages)} pages={pages} href={(n) => `/admin/log?page=${n}`} />
    </div>
  );
}
