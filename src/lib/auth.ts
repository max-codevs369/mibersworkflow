import { betterAuth } from "better-auth";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { emailOTP } from "better-auth/plugins";
import { prisma } from "@/lib/prisma";
import { resetOtpMail, sendMail } from "@/lib/mail";
import { getSettings } from "@/lib/settings";

const OTP_MINUTES = 10;
const lastSent = new Map<string, number>();

function claimResendSlot(email: string) {
  const now = Date.now();
  for (const [k, t] of lastSent) if (now - t > 10 * 60_000) lastSent.delete(k);
  const wait = 60_000 - (now - (lastSent.get(email) ?? 0));
  if (wait > 0) return Math.ceil(wait / 1000);
  lastSent.set(email, now);
  return 0;
}

async function deliverResetOtp(email: string, otp: string) {
  try {
    const user = await prisma.user.findUnique({ where: { email }, select: { name: true, isActive: true } });
    if (!user?.isActive) return;
    const settings = await getSettings();
    const mail = resetOtpMail({ name: user.name.split(" ")[0] || user.name, site: settings.site_name, otp, minutes: OTP_MINUTES });
    await sendMail({ to: email, ...mail });
  } catch (e) {
    console.error("[mail] gagal mengirim OTP reset:", e instanceof Error ? e.message : e);
  }
}

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    revokeSessionsOnPasswordReset: true,
  },
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== "/email-otp/request-password-reset") return;
      const email = String((ctx.body as { email?: unknown } | undefined)?.email ?? "").trim().toLowerCase();
      if (!email || email.length > 254) throw new APIError("BAD_REQUEST", { message: "Email tidak valid." });
      const wait = claimResendSlot(email);
      if (wait) throw new APIError("TOO_MANY_REQUESTS", { message: `Tunggu ${wait} detik sebelum meminta kode lagi.` });
    }),
  },
  disabledPaths: [
    "/update-user",
    "/sign-in/email-otp",
    "/email-otp/send-verification-otp",
    "/email-otp/verify-email",
    "/email-otp/request-email-change",
    "/email-otp/change-email",
    "/forget-password/email-otp",
  ],
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "MEMBER",
        input: false,
      },
      isActive: {
        type: "boolean",
        required: false,
        defaultValue: true,
        input: false,
      },
    },
  },
  databaseHooks: {
    session: {
      create: {
        before: async (session) => {
          const user = await prisma.user.findUnique({
            where: { id: session.userId },
            select: { isActive: true },
          });
          if (!user?.isActive) {
            throw new APIError("FORBIDDEN", {
              message: "Akun ini sedang dinonaktifkan. Hubungi pengurus kelas.",
            });
          }
        },
      },
    },
  },
  rateLimit: {
    enabled: true,
    window: 60,
    max: 120,
    customRules: {
      "/sign-in/email": { window: 60, max: 8 },
      "/change-password": { window: 300, max: 5 },
      "/email-otp/request-password-reset": { window: 600, max: 5 },
      "/email-otp/check-verification-otp": { window: 600, max: 15 },
      "/email-otp/reset-password": { window: 600, max: 8 },
    },
  },
  plugins: [
    emailOTP({
      otpLength: 6,
      expiresIn: OTP_MINUTES * 60,
      allowedAttempts: 5,
      storeOTP: "hashed",
      disableSignUp: true,
      async sendVerificationOTP({ email, otp, type }) {
        if (type === "forget-password") void deliverResetOtp(email.toLowerCase(), otp);
      },
    }),
    nextCookies(),
  ],
});
