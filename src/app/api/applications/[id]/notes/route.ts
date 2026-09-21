import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAuthenticated } from "@/lib/auth";
import { MAX_PHOTO_BYTES } from "@/lib/order-files";
import { addApplicationNote } from "@/lib/order-notes";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

// GET /api/applications/:id/notes — лента заметок заявки
export async function GET(_request: Request, { params }: RouteContext) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  const { id } = await params;
  const notes = await prisma.applicationNote.findMany({
    where: { applicationId: id },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(notes);
}

// POST /api/applications/:id/notes — multipart: text, photo и/или audio (всё необязательно, но не пусто)
export async function POST(request: Request, { params }: RouteContext) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  const { id } = await params;
  const application = await prisma.application.findUnique({ where: { id } });
  if (!application) {
    return NextResponse.json({ error: "Заявка не найдена" }, { status: 404 });
  }

  const form = await request.formData().catch(() => null);
  const text = typeof form?.get("text") === "string" ? String(form?.get("text")) : "";
  const photoFile = form?.get("photo");
  const audioFile = form?.get("audio");

  // Общий идентификатор загрузки: файлы из одного «Добавить в ленту» — одна заметка
  const rawBatch = form?.get("batch");
  const batchId =
    typeof rawBatch === "string" && /^[A-Za-z0-9_-]{8,40}$/.test(rawBatch)
      ? rawBatch
      : null;

  let photo: Buffer | null = null;
  let audio: Buffer | null = null;
  for (const [file, label] of [
    [photoFile, "Фото"],
    [audioFile, "Аудио"],
  ] as const) {
    if (file instanceof File && file.size > MAX_PHOTO_BYTES) {
      return NextResponse.json({ error: `${label} больше 10 МБ` }, { status: 400 });
    }
  }
  if (photoFile instanceof File && photoFile.size > 0) {
    photo = Buffer.from(await photoFile.arrayBuffer());
  }
  if (audioFile instanceof File && audioFile.size > 0) {
    audio = Buffer.from(await audioFile.arrayBuffer());
  }

  if (!text.trim() && !photo && !audio) {
    return NextResponse.json({ error: "Добавьте текст, фото или голосовое" }, { status: 400 });
  }

  try {
    const note = await addApplicationNote({
      applicationId: id,
      author: "админка",
      text,
      photo,
      audio,
      batchId,
    });
    return NextResponse.json(note, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Не удалось сохранить: нужно изображение (JPG, PNG, WEBP) или аудио (OGG, MP3, M4A)" },
      { status: 400 },
    );
  }
}
