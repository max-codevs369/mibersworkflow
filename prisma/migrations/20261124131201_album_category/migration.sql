-- AlterTable
ALTER TABLE "Album" ADD COLUMN     "category" TEXT NOT NULL DEFAULT 'KEGIATAN';

-- CreateIndex
CREATE INDEX "Album_category_idx" ON "Album"("category");
