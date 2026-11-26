import type { Metadata } from "next";
import { requireAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import AdminShell from "./shell";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { default: "Panel Admin", template: "%s · Panel Admin" },
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdmin();
  const [settings, pendingNotes, pendingMedia, reports] = await Promise.all([
    getSettings(),
    prisma.note.count({ where: { status: "PENDING" } }),
    prisma.media.count({ where: { status: "PENDING" } }),
    prisma.noteReport.count({ where: { note: { status: "APPROVED" } } }),
  ]);

  return (
    <AdminShell
      siteName={settings.site_name}
      user={{
        name: session.user.displayName,
        email: session.user.email,
        image: session.user.image ?? null,
        role: String(session.user.role),
      }}
      badges={{ "/admin/dinding": pendingNotes + reports, "/admin/galeri": pendingMedia }}
    >
      {children}
    </AdminShell>
  );
}
