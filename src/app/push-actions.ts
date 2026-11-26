"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { pushToUsers } from "@/lib/push";

type Sub = { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } };

const str = (v: unknown, max: number) => (typeof v === "string" && v.length > 0 && v.length <= max ? v : null);

export async function savePushSubscription(sub: Sub, userAgent?: string): Promise<{ ok?: true; error?: string }> {
  const session = await getSession();
  if (!session) return { error: "Masuk dulu untuk mengaktifkan notifikasi." };
  const endpoint = str(sub?.endpoint, 1000);
  const p256dh = str(sub?.keys?.p256dh, 200);
  const auth = str(sub?.keys?.auth, 100);
  if (!endpoint || !p256dh || !auth || !/^https:\/\//.test(endpoint)) return { error: "Data langganan notifikasi tidak valid." };

  const count = await prisma.pushSubscription.count({ where: { userId: session.user.id } });
  if (count >= 10) {
    const old = await prisma.pushSubscription.findMany({
      where: { userId: session.user.id },
      orderBy: { lastUsedAt: "asc" },
      take: count - 9,
      select: { id: true },
    });
    await prisma.pushSubscription.deleteMany({ where: { id: { in: old.map((o) => o.id) } } });
  }

  await prisma.pushSubscription.upsert({
    where: { endpoint },
    create: { endpoint, p256dh, auth, userId: session.user.id, userAgent: str(userAgent, 300) },
    update: { p256dh, auth, userId: session.user.id, userAgent: str(userAgent, 300), lastUsedAt: new Date() },
  });
  return { ok: true };
}

export async function removePushSubscription(endpoint: string) {
  const ep = str(endpoint, 1000);
  if (!ep) return;
  const session = await getSession();
  await prisma.pushSubscription.deleteMany({ where: { endpoint: ep, ...(session ? { userId: session.user.id } : {}) } });
}

export async function sendTestPush(): Promise<{ ok?: true; error?: string }> {
  const session = await getSession();
  if (!session) return { error: "Masuk dulu." };
  const n = await prisma.pushSubscription.count({ where: { userId: session.user.id } });
  if (!n) return { error: "Belum ada perangkat yang aktif. Aktifkan notifikasi dulu." };
  await pushToUsers([session.user.id], {
    title: "🔔 Tes notifikasi",
    body: `Mantap, ${session.user.displayName}! Notifikasi sudah aktif di perangkat ini.`,
    url: "/akun/notifikasi",
    tag: "test",
  });
  return { ok: true };
}
