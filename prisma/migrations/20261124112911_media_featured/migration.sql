-- AlterTable
ALTER TABLE "Media" ADD COLUMN     "featuredAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Media_featuredAt_idx" ON "Media"("featuredAt");
