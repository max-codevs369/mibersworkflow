import { prisma } from "@/lib/prisma";
import { isSoundKind } from "@/lib/sound-kinds";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ kind: string }> }) {
  const { kind } = await params;
  if (!isSoundKind(kind)) return new Response("Not found", { status: 404 });
  const row = await prisma.notificationSound.findUnique({ where: { kind } });
  if (!row) return new Response("Not found", { status: 404 });
  const versioned = new URL(request.url).searchParams.get("v") === String(row.updatedAt.getTime());
  return new Response(new Uint8Array(row.data), {
    headers: {
      "Content-Type": "audio/wav",
      "Content-Length": String(row.size),
      "Cache-Control": versioned ? "public, max-age=31536000, immutable" : "public, max-age=60",
      "X-Content-Type-Options": "nosniff",
      "Content-Disposition": `inline; filename="${kind}.wav"`,
    },
  });
}
