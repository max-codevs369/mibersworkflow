-- DropForeignKey
ALTER TABLE "Conversation" DROP CONSTRAINT "Conversation_createdBy_fkey";

-- AlterTable
ALTER TABLE "Conversation" ALTER COLUMN "createdBy" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
