-- CreateTable
CREATE TABLE "AdminCredential" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'singleton',
    "passwordHash" TEXT NOT NULL,
    "changedBy" TEXT,
    "updatedAt" DATETIME NOT NULL
);
