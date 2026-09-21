-- CreateTable
CREATE TABLE "Location" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "hours" TEXT,
    "lat" REAL,
    "lon" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- Переносим текущий адрес из настроек первым магазином (с координатами)
INSERT INTO "Location" ("id", "title", "address", "hours", "lat", "lon", "createdAt", "updatedAt")
SELECT 'loc_main', 'Магазин', "address", 'Пн–Пт, 9:00–18:00', 44.672187, 39.972452, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Settings"
WHERE "id" = 'singleton' AND trim("address") <> '';
