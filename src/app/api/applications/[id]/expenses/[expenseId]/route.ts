import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { deleteExpense } from "@/lib/order-expenses";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string; expenseId: string }> };

// DELETE /api/applications/:id/expenses/:expenseId
export async function DELETE(_request: Request, { params }: RouteContext) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  const { id, expenseId } = await params;
  const deleted = await deleteExpense(id, expenseId);
  if (!deleted) {
    return NextResponse.json({ error: "Расход не найден" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
