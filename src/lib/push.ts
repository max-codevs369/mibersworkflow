import * as webpush from "web-push";
import { after } from "next/server";
import { prisma } from "@/lib/prisma";

let configured: boolean | null = null;

function ready() {
  if (configured !== null) return configured;
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) {
    console.warn("[push] VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY belum diisi; push notification dimatikan.");
    return (configured = false);
  }
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:admin@localhost", pub, priv);
  return (configured = true);
}

export const pushPublicKey = () => process.env.VAPID_PUBLIC_KEY || null;

export type PushPayload = { title: string; body: string; url?: string | null; tag?: string };

export async function pushToUsers(userIds: string[], p: PushPayload) {
  try {
    if (!ready() || userIds.length === 0) return;
    const subs = await prisma.pushSubscription.findMany({
      where: { userId: { in: [...new Set(userIds)] }, user: { isActive: true } },
      select: { id: true, endpoint: true, p256dh: true, auth: true },
    });
    if (subs.length === 0) return;
    const data = JSON.stringify({
      title: p.title.slice(0, 120),
      body: p.body.slice(0, 300),
      url: p.url && p.url.startsWith("/") ? p.url : "/akun/notifikasi",
      tag: p.tag,
    });
    const dead: string[] = [];
    const alive: string[] = [];
    await Promise.all(
      subs.map(async (s) => {
        try {
          await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, data, {
            TTL: 60 * 60 * 24,
            urgency: "normal",
            timeout: 10_000,
          });
          alive.push(s.id);
        } catch (e) {
          const code = (e as { statusCode?: number }).statusCode;

          if (code === 404 || code === 410) dead.push(s.id);
          else console.error("[push] gagal kirim:", code ?? (e instanceof Error ? e.message : e));
        }
      })
    );
    if (dead.length) await prisma.pushSubscription.deleteMany({ where: { id: { in: dead } } });
    if (alive.length) await prisma.pushSubscription.updateMany({ where: { id: { in: alive } }, data: { lastUsedAt: new Date() } });
  } catch (e) {
    console.error("[push]", e instanceof Error ? e.message : e);
  }
}

export function inBackground(fn: () => Promise<unknown>) {
  const run = () => fn().catch((e) => console.error("[background]", e instanceof Error ? e.message : e));
  try {
    after(run);
  } catch {
    void run();
  }
}
