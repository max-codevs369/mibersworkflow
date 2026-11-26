-- Jadwal kuliah per semester. Jadwal yang sudah ada dipindahkan ke Semester 1 (aktif).
CREATE TABLE "Semester" (
    "id" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" TEXT,
    "endDate" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Semester_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Semester_number_key" ON "Semester"("number");

INSERT INTO "Semester" ("id", "number", "name", "isActive") VALUES ('semester-1', 1, 'Semester 1', true);

ALTER TABLE "Schedule" ADD COLUMN "semesterId" TEXT;
UPDATE "Schedule" SET "semesterId" = 'semester-1';
ALTER TABLE "Schedule" ALTER COLUMN "semesterId" SET NOT NULL;

DROP INDEX IF EXISTS "Schedule_day_idx";
CREATE INDEX "Schedule_semesterId_day_idx" ON "Schedule"("semesterId", "day");

ALTER TABLE "Schedule" ADD CONSTRAINT "Schedule_semesterId_fkey" FOREIGN KEY ("semesterId") REFERENCES "Semester"("id") ON DELETE CASCADE ON UPDATE CASCADE;
