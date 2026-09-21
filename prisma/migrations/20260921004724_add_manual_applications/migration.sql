-- CreateTable
CREATE TABLE "TelegramDraft" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "chatId" TEXT NOT NULL,
    "step" TEXT NOT NULL,
    "name" TEXT,
    "phone" TEXT,
    "message" TEXT,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Application" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "message" TEXT,
    "productId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'new',
    "handledBy" TEXT,
    "handledAt" DATETIME,
    "source" TEXT NOT NULL DEFAULT 'site',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Application_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Application" ("createdAt", "handledAt", "handledBy", "id", "message", "name", "phone", "productId", "status", "updatedAt") SELECT "createdAt", "handledAt", "handledBy", "id", "message", "name", "phone", "productId", "status", "updatedAt" FROM "Application";
DROP TABLE "Application";
ALTER TABLE "new_Application" RENAME TO "Application";
CREATE INDEX "Application_status_idx" ON "Application"("status");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "TelegramDraft_chatId_key" ON "TelegramDraft"("chatId");
