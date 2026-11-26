-- DropForeignKey
ALTER TABLE "Piket" DROP CONSTRAINT "Piket_userId_fkey";

-- AlterTable
ALTER TABLE "Profile" ADD COLUMN     "absenNo" INTEGER;

-- DropTable
DROP TABLE "Piket";

-- CreateIndex
CREATE UNIQUE INDEX "Profile_absenNo_key" ON "Profile"("absenNo");

