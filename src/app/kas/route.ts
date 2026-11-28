import { createHash, randomBytes } from "crypto";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const financeUrl = () => (process.env.FINANCE_URL || "https://finance.mibersduoanam.my.id").replace(/\/$/, "");

const noStore = { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" };

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", "/kas");
    return new Response(null, { status: 303, headers: { ...noStore, Location: login.pathname + login.search } });
  }

  const code = randomBytes(32).toString("base64url");
  const hash = createHash("sha256").update(code).digest("hex");
  try {
    await prisma.$executeRaw`INSERT INTO finance.sso_codes (code_hash, user_id, main_session_id, expires_at) VALUES (${hash}, ${session.user.id}, ${session.session.id}, now() + interval '60 seconds')`;
  } catch (e) {
    console.error("[kas]", e instanceof Error ? e.message : e);
    return new Response("Aplikasi kas belum siap. Coba lagi nanti.", { status: 503, headers: { ...noStore, "Content-Type": "text/plain; charset=utf-8" } });
  }

  return new Response(null, { status: 303, headers: { ...noStore, Location: `${financeUrl()}/sso?code=${code}` } });
}
