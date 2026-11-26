import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { isAdminRole, isSuperRole } from "@/lib/roles";

export const getSession = cache(async () => {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session || session.user.isActive === false) return null;
    return { ...session, user: { ...session.user, displayName: session.user.displayName || session.user.name } };
  } catch {
    return null;
  }
});

export type AppSession = NonNullable<Awaited<ReturnType<typeof getSession>>>;

export async function requireUser(next?: string) {
  const session = await getSession();
  if (!session) redirect(next ? `/login?next=${encodeURIComponent(next)}` : "/login");
  return session;
}

export async function requireAdmin() {
  const session = await getSession();
  if (!session) redirect("/login?next=/admin");
  if (!isAdminRole(session.user.role)) redirect("/akun");
  return session;
}

export async function requireSuperAdmin() {
  const session = await requireAdmin();
  if (!isSuperRole(session.user.role)) redirect("/admin?akses=ditolak");
  return session;
}
