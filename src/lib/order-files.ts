import { randomUUID } from "crypto";
import { mkdir, readFile, unlink, writeFile } from "fs/promises";
import { join } from "path";
import sharp from "sharp";

// Фото заказов — это интерьеры клиентов, поэтому хранятся не в public/,
// а в закрытой папке: отдаются только авторизованным (см. API заметок).
const ORDERS_DIR = join(
  process.env.PRIVATE_UPLOADS_DIR ?? join(process.cwd(), "private-uploads"),
  "orders",
);

const MAX_SIDE = 1600;
const FILE_NAME = /^[a-f0-9-]{36}\.jpg$/;

export const MAX_PHOTO_BYTES = 10 * 1024 * 1024;

// Сжимаем до 1600 px по длинной стороне, учитываем поворот из EXIF.
// Заодно это настоящая проверка: не картинка — sharp бросит ошибку.
export async function saveOrderPhoto(input: Buffer): Promise<string> {
  const jpeg = await sharp(input)
    .rotate()
    .resize({ width: MAX_SIDE, height: MAX_SIDE, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 82 })
    .toBuffer();

  await mkdir(ORDERS_DIR, { recursive: true });
  const name = `${randomUUID()}.jpg`;
  await writeFile(join(ORDERS_DIR, name), jpeg);
  return name;
}

export async function readOrderPhoto(name: string): Promise<Buffer | null> {
  if (!FILE_NAME.test(name)) return null;
  try {
    return await readFile(join(ORDERS_DIR, name));
  } catch {
    return null;
  }
}

export async function deleteOrderPhoto(name: string): Promise<void> {
  if (!FILE_NAME.test(name)) return;
  await unlink(join(ORDERS_DIR, name)).catch(() => {});
}
