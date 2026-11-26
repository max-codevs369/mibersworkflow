import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword } from "better-auth/crypto";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error("SEED_ADMIN_EMAIL dan SEED_ADMIN_PASSWORD belum diisi di .env");
  }

  const admin = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      name: "Admin Mibers Duo Anam",
      email,
      emailVerified: true,
      role: "SUPER_ADMIN",
    },
  });

  const hasCredential = await prisma.account.findFirst({
    where: { userId: admin.id, providerId: "credential" },
  });
  if (!hasCredential) {
    await prisma.account.create({
      data: {
        accountId: admin.id,
        providerId: "credential",
        userId: admin.id,
        password: await hashPassword(password),
      },
    });
  }

  const settings: Record<string, string> = {
    site_name: "Mibers Duo Anam",
    site_short: "Mibers 26",
    site_tagline: "We Are Family We Are MIB",
    site_description: "Pusat informasi, obrolan, dan kenangan kelas Mibers Duo Anam.",
    class_year: "2026",
    instagram: "https://www.instagram.com/miberss_26",
    note_guest_enabled: "true",
    gallery_member_auto_approve: "false",
    note_member_auto_approve: "true",
    note_guest_daily_limit: "3",
    note_member_daily_limit: "10",
  };

  for (const [key, value] of Object.entries(settings)) {
    await prisma.siteSetting.upsert({
      where: { key },
      update: {},
      create: { key, value },
    });
  }

  const existing = await prisma.note.findFirst({ where: { authorId: admin.id } });
  if (!existing) {
    await prisma.note.create({
      data: {
        content: "Selamat datang di website Mibers Duo Anam!",
        type: "DAILY",
        color: "YELLOW",
        rotation: -2,
        authorId: admin.id,
        authorName: "Admin",
        authorKind: "ADMIN",
        isPinned: true,
        status: "APPROVED",
      },
    });
  }

  console.log("Seed selesai. Admin:", admin.email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());