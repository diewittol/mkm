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

// POST /api/applications/:id/notes — multipart: text (необязательно) и photo (необязательно)
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
  const file = form?.get("photo");

  let photo: Buffer | null = null;
  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_PHOTO_BYTES) {
      return NextResponse.json({ error: "Фото больше 10 МБ" }, { status: 400 });
    }
    photo = Buffer.from(await file.arrayBuffer());
  }

  if (!text.trim() && !photo) {
    return NextResponse.json({ error: "Добавьте текст или фото" }, { status: 400 });
  }

  try {
    const note = await addApplicationNote({
      applicationId: id,
      author: "админка",
      text,
      photo,
    });
    return NextResponse.json(note, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Не удалось сохранить: файл должен быть изображением (JPG, PNG, WEBP)" },
      { status: 400 },
    );
  }
}
