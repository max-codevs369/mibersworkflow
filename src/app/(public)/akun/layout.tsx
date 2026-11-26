import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { container } from "@/components/PageHeader";
import { Avatar } from "@/components/ui/bits";
import { ROLE_NAME, type RoleKey } from "@/lib/roles";
import { cx } from "@/lib/ui";
import AccountTabs from "./tabs";
import Breadcrumbs from "@/components/ui/Breadcrumbs";

export const dynamic = "force-dynamic";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const session = await requireUser("/akun");
  const unread = await prisma.notification.count({ where: { userId: session.user.id, isRead: false } });
  const role = String(session.user.role ?? "MEMBER") as RoleKey;

  return (
    <section className={cx(container, "max-w-5xl pt-5")}>
      <Breadcrumbs items={[{ label: "Beranda", href: "/" }, { label: "Akun saya" }]} />
      <div className="mt-6 flex items-center gap-4">
        <Avatar name={session.user.displayName} src={session.user.image} size={60} />
        <div className="min-w-0">
          <p className="eyebrow">Akun saya</p>
          <h1 className="mt-1 truncate text-2xl font-bold sm:text-3xl">{session.user.displayName}</h1>
          <p className="truncate text-sm text-muted">
            {ROLE_NAME[role] ?? "Anggota"} · {session.user.email}
          </p>
        </div>
      </div>
      <AccountTabs unread={unread} admin={role === "ADMIN" || role === "SUPER_ADMIN"} />
      <div className="mt-8">{children}</div>
    </section>
  );
}
