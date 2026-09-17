import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";
import { isAuthenticated } from "@/lib/auth";

export const runtime = "nodejs";

const MAX_SIZE = 10 * 1024 * 1024; // 10 МБ
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];

// POST /api/upload  (multipart/form-data, поле file)
export async function POST(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "Файл не передан" },
      { status: 400 },
    );
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "Поддерживаются JPG, PNG, WEBP, AVIF" },
      { status: 400 },
    );
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: "Файл больше 10 МБ" },
      { status: 400 },
    );
  }

  // Расширение из MIME-типа
  const extMap: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/avif": "avif",
  };
  const ext = extMap[file.type];

  // Уникальное имя
  const filename = `${randomUUID()}.${ext}`;

  // Сохраняем в public/uploads/products/
  const uploadsDir = join(process.cwd(), "public", "uploads", "products");
  await mkdir(uploadsDir, { recursive: true });

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  await writeFile(join(uploadsDir, filename), buffer);

  // Публичный URL
  const url = `/uploads/products/${filename}`;

  return NextResponse.json({ url }, { status: 201 });
}