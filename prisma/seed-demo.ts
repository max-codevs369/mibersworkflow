import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  const admin = await prisma.user.findFirst({ where: { role: "SUPER_ADMIN" } });
  if (!admin) throw new Error("Admin belum ada. Jalankan npx prisma db seed dulu.");

  if ((await prisma.aboutSection.count()) === 0) {
    await prisma.aboutSection.createMany({
      data: [
        { title: "Tentang Kami", sortOrder: 1, content: "Mibers Duo Anam adalah kelas yang saling mendukung. Tulis profil dan sejarah kelas di sini." },
        { title: "Visi", sortOrder: 2, content: "Isi visi kelas di sini." },
        { title: "Misi", sortOrder: 3, content: "Isi misi kelas di sini." },
      ],
    });
  }

  if ((await prisma.announcement.count()) === 0) {
    await prisma.announcement.createMany({
      data: [
        { title: "Pengumuman contoh 1", content: "Ringkasan pengumuman pertama.", authorId: admin.id, isPinned: true },
        { title: "Pengumuman contoh 2", content: "Ringkasan pengumuman kedua.", authorId: admin.id },
        { title: "Pengumuman contoh 3", content: "Ringkasan pengumuman ketiga.", authorId: admin.id },
      ],
    });
  }

  if ((await prisma.event.count()) === 0) {
    await prisma.event.create({
      data: {
        title: "Acara contoh",
        startAt: new Date(Date.now() + 14 * 86400000),
        location: "Lokasi acara",
        type: "ACTIVITY",
      },
    });
  }

  if ((await prisma.organizationPeriod.count()) === 0) {
    const period = await prisma.organizationPeriod.create({
      data: { name: "Kepengurusan 2026", startYear: 2026, endYear: 2027, isActive: true },
    });
    const titles = ["Wali Kelas", "Ketua Kelas", "Wakil Ketua", "Sekretaris"];
    for (let i = 0; i < titles.length; i++) {
      const position = await prisma.position.create({
        data: { title: titles[i], level: i, sortOrder: i },
      });
      await prisma.organizationMember.create({
        data: { periodId: period.id, positionId: position.id, displayName: `Nama ${titles[i]}`, sortOrder: i },
      });
    }
  }

  if ((await prisma.album.count()) === 0) {
    await prisma.album.create({
      data: { title: "Hari Pertama", slug: "hari-pertama", createdBy: admin.id },
    });
  }

  console.log("Data contoh dibuat.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());