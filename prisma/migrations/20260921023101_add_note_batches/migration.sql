-- AlterTable
ALTER TABLE "ApplicationNote" ADD COLUMN "batchId" TEXT;

-- AlterTable
ALTER TABLE "TelegramDraft" ADD COLUMN "noteBatch" TEXT;
