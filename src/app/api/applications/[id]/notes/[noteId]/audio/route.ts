import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAuthenticated } from "@/lib/auth";
import { orderFileType, readOrderFile } from "@/lib/order-files";

export const runtime = "nodejs";

// GET /api/applications/:id/notes/:noteId/audio — голосовое, только для админа.
// Поддерживает Range: без него браузеры (особенно Safari) не могут перематывать.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; noteId: string }> },
) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  const { id, noteId } = await params;
  const note = await prisma.applicationNote.findFirst({
    where: { id: noteId, applicationId: id },
    select: { audio: true },
  });
  const file = note?.audio ? await readOrderFile(note.audio) : null;
  if (!note?.audio || !file) {
    return NextResponse.json({ error: "Запись не найдена" }, { status: 404 });
  }

  const headers: Record<string, string> = {
    "Content-Type": orderFileType(note.audio),
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, max-age=86400",
  };

  const range = /^bytes=(\d*)-(\d*)$/.exec(request.headers.get("range") ?? "");
  if (range && (range[1] || range[2])) {
    const size = file.length;
    let start = range[1] ? Number(range[1]) : size - Number(range[2]);
    const end = range[1] && range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
    start = Math.max(0, start);

    if (start > end || start >= size) {
      return new NextResponse(null, {
        status: 416,
        headers: { ...headers, "Content-Range": `bytes */${size}` },
      });
    }

    return new NextResponse(new Uint8Array(file.subarray(start, end + 1)), {
      status: 206,
      headers: {
        ...headers,
        "Content-Range": `bytes ${start}-${end}/${size}`,
        "Content-Length": String(end - start + 1),
      },
    });
  }

  return new NextResponse(new Uint8Array(file), {
    headers: { ...headers, "Content-Length": String(file.length) },
  });
}
