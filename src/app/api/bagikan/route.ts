import { createHash, randomBytes } from "crypto";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const MAX_BYTES = 5 * 1024 * 1024;

const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "no-store" } });

function sniff(buf: Buffer): string | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  if (buf.toString("ascii", 0, 5) === "%PDF-") return "application/pdf";
  return null;
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && URL.parse(origin)?.host !== request.headers.get("host")) {
    return json({ error: "Asal permintaan tidak valid." }, 403);
  }
  const session = await getSession();
  if (!session) return json({ error: "Masuk dulu." }, 401);

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File) || file.size === 0) return json({ error: "File bukti tidak ditemukan." }, 422);
  if (file.size > MAX_BYTES) return json({ error: "File terlalu besar. Maksimal 5 MB." }, 422);

  const data = Buffer.from(await file.arrayBuffer());
  const mime = sniff(data);
  if (!mime) return json({ error: "Gunakan gambar (JPG, PNG, WEBP) atau PDF." }, 422);

  const token = randomBytes(24).toString("base64url");
  const id = createHash("sha256").update(token).digest("hex");
  const name = (file.name || "bukti").replace(/[^\w.\- ]+/g, "").slice(0, 80) || "bukti";

  await prisma.$transaction([
    prisma.sharedProof.deleteMany({ where: { OR: [{ userId: session.user.id }, { expiresAt: { lt: new Date() } }] } }),
    prisma.sharedProof.create({
      data: { id, userId: session.user.id, name, mime, data, expiresAt: new Date(Date.now() + 30 * 60_000) },
    }),
  ]);

  return json({ token });
}
