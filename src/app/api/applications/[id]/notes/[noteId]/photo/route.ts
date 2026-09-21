import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAuthenticated } from "@/lib/auth";
import { readOrderFile } from "@/lib/order-files";

export const runtime = "nodejs";

// GET /api/applications/:id/notes/:noteId/photo — фото заказа, только для админа
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; noteId: string }> },
) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  const { id, noteId } = await params;
  const note = await prisma.applicationNote.findFirst({
    where: { id: noteId, applicationId: id },
    select: { photo: true },
  });
  const file = note?.photo ? await readOrderFile(note.photo) : null;
  if (!file) {
    return NextResponse.json({ error: "Фото не найдено" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(file), {
    headers: {
      "Content-Type": "image/jpeg",
      // Приватные данные: только в кэше самого браузера, не общем
      "Cache-Control": "private, max-age=86400",
    },
  });
}
