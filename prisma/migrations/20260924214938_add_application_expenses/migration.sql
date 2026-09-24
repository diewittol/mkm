-- AlterTable
ALTER TABLE "TelegramDraft" ADD COLUMN "expenseKind" TEXT;

-- CreateTable
CREATE TABLE "ApplicationExpense" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "applicationId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ApplicationExpense_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ApplicationExpense_applicationId_idx" ON "ApplicationExpense"("applicationId");
