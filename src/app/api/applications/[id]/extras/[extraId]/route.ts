import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { deleteExtra } from "@/lib/order-extras";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string; extraId: string }> };

// DELETE /api/applications/:id/extras/:extraId
export async function DELETE(_request: Request, { params }: RouteContext) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  const { id, extraId } = await params;
  const deleted = await deleteExtra(id, extraId);
  if (!deleted) {
    return NextResponse.json({ error: "Доплата не найдена" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
