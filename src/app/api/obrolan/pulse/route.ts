import { getSession } from "@/lib/session";
import { chatSignature, markDelivered } from "@/lib/conversations";
import { markPresence } from "@/lib/presence";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return Response.json({ error: "unauthorized" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  const raw = new URL(request.url).searchParams.get("c");
  const room = raw && /^[a-z0-9_]{1,40}$/i.test(raw) ? raw : null;

  markPresence(session.user.id, room);
  await markDelivered(session.user.id);
  const v = await chatSignature(session.user.id, room);
  return Response.json({ v }, { headers: { "Cache-Control": "no-store" } });
}
