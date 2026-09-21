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
const FILE_NAME = /^[a-f0-9-]{36}\.(jpg|ogg|mp3|m4a)$/;

const CONTENT_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  ogg: "audio/ogg",
  mp3: "audio/mpeg",
  m4a: "audio/mp4",
};

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

// Голосовое: Telegram присылает OGG/Opus, с телефона бывают mp3/m4a.
// Формат определяем по содержимому, а не по имени файла; сохраняем как есть.
export type AudioKind = "ogg" | "mp3" | "m4a";

export function sniffAudio(buf: Buffer): AudioKind | null {
  if (buf.length < 12) return null;
  if (buf.toString("ascii", 0, 4) === "OggS") return "ogg";
  if (buf.toString("ascii", 0, 3) === "ID3" || (buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0)) {
    return "mp3";
  }
  if (buf.toString("ascii", 4, 8) === "ftyp") return "m4a";
  return null;
}

export async function saveOrderAudio(input: Buffer): Promise<string> {
  const kind = sniffAudio(input);
  if (!kind) throw new Error("Не аудио");

  await mkdir(ORDERS_DIR, { recursive: true });
  const name = `${randomUUID()}.${kind}`;
  await writeFile(join(ORDERS_DIR, name), input);
  return name;
}

export const orderFileType = (name: string) =>
  CONTENT_TYPES[name.split(".").pop() ?? ""] ?? "application/octet-stream";

export async function readOrderFile(name: string): Promise<Buffer | null> {
  if (!FILE_NAME.test(name)) return null;
  try {
    return await readFile(join(ORDERS_DIR, name));
  } catch {
    return null;
  }
}

export async function deleteOrderFile(name: string): Promise<void> {
  if (!FILE_NAME.test(name)) return;
  await unlink(join(ORDERS_DIR, name)).catch(() => {});
}
