import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { deleteApplicationNote } from "@/lib/order-notes";

export const runtime = "nodejs";

// DELETE /api/applications/:id/notes/:noteId
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; noteId: string }> },
) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  const { id, noteId } = await params;
  const deleted = await deleteApplicationNote(id, noteId);
  if (!deleted) {
    return NextResponse.json({ error: "Запись не найдена" }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
