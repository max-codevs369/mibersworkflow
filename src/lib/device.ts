import { cookies, headers } from "next/headers";
import { createHash, randomUUID } from "crypto";

const COOKIE = "m26_device";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

const valid = (v?: string) => (v && UUID.test(v) ? v : null);

export async function readDeviceId() {
  return valid((await cookies()).get(COOKIE)?.value);
}

export async function ensureDeviceId() {
  const store = await cookies();
  const existing = valid(store.get(COOKIE)?.value);
  if (existing) return existing;

  const id = randomUUID();
  store.set(COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365 * 2,
    path: "/",
  });
  return id;
}

export async function getIpHash() {
  const h = await headers();
  const ip =
    h.get("x-forwarded-for")?.split(",")[0].trim() ||
    h.get("x-real-ip") ||
    "local";
  return createHash("sha256")
    .update(ip + (process.env.BETTER_AUTH_SECRET ?? ""))
    .digest("hex");
}