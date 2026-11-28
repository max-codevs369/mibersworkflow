import { createHash, createHmac, timingSafeEqual } from "crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { notifyAll, notifyUsers } from "@/lib/notify";
import { directKeyOf } from "@/lib/conversations";
import { inBackground, pushToUsers } from "@/lib/push";

export const dynamic = "force-dynamic";

const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "no-store" } });

function verified(raw: string, signature: string | null) {
  const secret = process.env.FINANCE_BRIDGE_SECRET;
  if (!secret || secret.length < 32 || !signature || !/^[a-f0-9]{64}$/.test(signature)) return false;
  const expected = createHmac("sha256", secret).update(raw).digest();
  return timingSafeEqual(expected, Buffer.from(signature, "hex"));
}

const text = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

async function activeIds(ids: unknown) {
  if (!Array.isArray(ids)) return [];
  const wanted = ids.filter((x): x is string => typeof x === "string").slice(0, 500);
  const rows = await prisma.user.findMany({ where: { id: { in: wanted }, isActive: true }, select: { id: true } });
  return rows.map((r) => r.id);
}

async function sendChat(fromId: string, toId: string, content: string) {
  const users = await prisma.user.findMany({
    where: { id: { in: [fromId, toId] }, isActive: true },
    select: { id: true, displayName: true, name: true, image: true },
  });
  const from = users.find((u) => u.id === fromId);
  if (!from || !users.some((u) => u.id === toId) || fromId === toId) return json({ error: "Pengirim atau penerima tidak valid." }, 422);

  const key = directKeyOf(fromId, toId);
  let conv = await prisma.conversation.findUnique({ where: { directKey: key }, select: { id: true } });
  if (!conv) {
    try {
      conv = await prisma.conversation.create({
        data: { type: "DIRECT", directKey: key, createdBy: fromId, members: { create: [{ userId: fromId }, { userId: toId }] } },
        select: { id: true },
      });
    } catch {
      conv = await prisma.conversation.findUnique({ where: { directKey: key }, select: { id: true } });
    }
  }
  if (!conv) return json({ error: "Obrolan tidak bisa dibuat." }, 500);

  const now = new Date();
  await prisma.$transaction([
    prisma.message.create({ data: { conversationId: conv.id, senderId: fromId, content, createdAt: now } }),
    prisma.conversation.update({ where: { id: conv.id }, data: { lastMessageAt: now } }),
    prisma.conversationMember.updateMany({ where: { conversationId: conv.id, userId: fromId }, data: { lastReadAt: now } }),
  ]);

  const senderName = from.displayName || from.name;
  const conversationId = conv.id;
  inBackground(() =>
    pushToUsers([toId], {
      title: senderName,
      body: content.length > 140 ? `${content.slice(0, 140)}…` : content,
      url: `/obrolan/${conversationId}`,
      tag: `chat-${conversationId}`,
      icon: from.image,
      chat: { id: conversationId, line: content.slice(0, 140) },
    })
  );
  revalidatePath("/obrolan", "layout");
  return json({ ok: true, conversationId });
}

async function announce(body: Record<string, unknown>) {
  const authorId = text(body.authorId, 64);
  const author = await prisma.user.findFirst({ where: { id: authorId, isActive: true }, select: { id: true } });
  const title = text(body.title, 160);
  const content = text(body.content, 5000);
  if (!author || !title || !content) return json({ error: "Data pengumuman tidak lengkap." }, 422);
  const priority = body.priority === "URGENT" ? "URGENT" : body.priority === "IMPORTANT" ? "IMPORTANT" : "NORMAL";
  const actionUrl = text(body.actionUrl, 300);
  const now = new Date();

  const created = await prisma.announcement.create({
    data: {
      title,
      content,
      category: "FINANCE",
      priority,
      status: "PUBLISHED",
      authorId: author.id,
      publishedAt: now,
      notifiedAt: now,
      actionLabel: text(body.actionLabel, 60) || null,
      actionUrl: actionUrl.startsWith("/") ? actionUrl : null,
    },
    select: { id: true },
  });
  await notifyAll({
    exceptUserId: author.id,
    type: "announcement",
    message: `${priority === "URGENT" ? "[Mendesak] " : ""}Pengumuman baru: ${title}`,
    link: `/pengumuman/${created.id}`,
  });
  revalidatePath("/");
  revalidatePath("/pengumuman", "layout");
  return json({ ok: true, announcementId: created.id });
}

async function takeShare(token: string, userId: string) {
  if (!/^[A-Za-z0-9_-]{20,100}$/.test(token) || !userId) return json({ error: "Token tidak valid." }, 422);
  const id = createHash("sha256").update(token).digest("hex");
  const row = await prisma.sharedProof.findUnique({ where: { id } });
  if (!row || row.userId !== userId || row.expiresAt < new Date()) return json({ error: "Bukti sudah kedaluwarsa. Bagikan ulang dari aplikasi pembayaran." }, 404);
  await prisma.sharedProof.delete({ where: { id } });
  return json({ ok: true, name: row.name, mime: row.mime, data: Buffer.from(row.data).toString("base64") });
}

export async function POST(request: Request) {
  const raw = await request.text();
  if (raw.length > 20_000 || !verified(raw, request.headers.get("x-finance-signature"))) return json({ error: "unauthorized" }, 401);

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(raw);
  } catch {
    return json({ error: "bad json" }, 400);
  }
  const ts = Number(body.ts);
  if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > 300) return json({ error: "expired" }, 401);

  try {
    switch (body.action) {
      case "notify": {
        const ids = await activeIds(body.userIds);
        const message = text(body.message, 300);
        if (!ids.length || !message) return json({ error: "Penerima atau pesan kosong." }, 422);
        const link = text(body.link, 300);
        await notifyUsers(ids, { type: "finance", message, link: link.startsWith("/") ? link : "/kas" });
        return json({ ok: true, count: ids.length });
      }
      case "chat": {
        const content = text(body.text, 4000);
        if (!content) return json({ error: "Pesan kosong." }, 422);
        return await sendChat(text(body.fromUserId, 64), text(body.toUserId, 64), content);
      }
      case "announce":
        return await announce(body);
      case "share":
        return await takeShare(text(body.token, 100), text(body.userId, 64));
      default:
        return json({ error: "unknown action" }, 400);
    }
  } catch (e) {
    console.error("[finance-bridge]", e instanceof Error ? e.message : e);
    return json({ error: "Gagal memproses permintaan." }, 500);
  }
}
