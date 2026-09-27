-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Settings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'singleton',
    "companyName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "telegram" TEXT,
    "whatsapp" TEXT,
    "heroImage" TEXT,
    "heroColor" TEXT,
    "heroOverlay" INTEGER NOT NULL DEFAULT 40,
    "heroTextTheme" TEXT NOT NULL DEFAULT 'auto',
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Settings" ("address", "companyName", "email", "id", "phone", "telegram", "updatedAt", "whatsapp") SELECT "address", "companyName", "email", "id", "phone", "telegram", "updatedAt", "whatsapp" FROM "Settings";
DROP TABLE "Settings";
ALTER TABLE "new_Settings" RENAME TO "Settings";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
