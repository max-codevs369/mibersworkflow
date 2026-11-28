import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const rows = await prisma.notificationSound.findMany({ select: { kind: true, updatedAt: true } });
  const kinds = Object.fromEntries(rows.map((r) => [r.kind, r.updatedAt.getTime()]));
  return Response.json({ kinds }, { headers: { "Cache-Control": "public, max-age=60" } });
}
