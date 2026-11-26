-- DropIndex
DROP INDEX "Profile_absenNo_key";

-- AlterTable
ALTER TABLE "Profile" DROP COLUMN "absenNo";

-- CreateTable
CREATE TABLE "RosterEntry" (
    "id" TEXT NOT NULL,
    "absenNo" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RosterEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RosterEntry_absenNo_key" ON "RosterEntry"("absenNo");

-- CreateIndex
CREATE UNIQUE INDEX "RosterEntry_userId_key" ON "RosterEntry"("userId");

-- AddForeignKey
ALTER TABLE "RosterEntry" ADD CONSTRAINT "RosterEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

