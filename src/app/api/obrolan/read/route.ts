import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && URL.parse(origin)?.host !== request.headers.get("host")) {
    return new Response(null, { status: 403 });
  }
  const session = await getSession();
  if (!session) return new Response(null, { status: 401 });
  const body = (await request.json().catch(() => null)) as { id?: unknown } | null;
  const id = typeof body?.id === "string" && /^[a-z0-9_]{1,40}$/i.test(body.id) ? body.id : null;
  if (!id) return new Response(null, { status: 400 });
  await prisma.conversationMember.updateMany({
    where: { conversationId: id, userId: session.user.id },
    data: { lastReadAt: new Date() },
  });
  return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
}
