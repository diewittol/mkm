-- AlterTable
ALTER TABLE "ApplicationExpense" ADD COLUMN "comment" TEXT;

-- CreateTable
CREATE TABLE "ApplicationExtra" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "applicationId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ApplicationExtra_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ApplicationExtra_applicationId_idx" ON "ApplicationExtra"("applicationId");
