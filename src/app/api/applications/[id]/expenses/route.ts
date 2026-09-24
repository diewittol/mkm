import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAuthenticated } from "@/lib/auth";
import { MAX_PRICE } from "@/lib/money";
import { addExpense, isExpenseKind } from "@/lib/order-expenses";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

// GET /api/applications/:id/expenses — расходы на заказ
export async function GET(_request: Request, { params }: RouteContext) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  const { id } = await params;
  const expenses = await prisma.applicationExpense.findMany({
    where: { applicationId: id },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(expenses);
}

// POST /api/applications/:id/expenses — добавить расход (складывается с прошлыми)
export async function POST(request: Request, { params }: RouteContext) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  const { id } = await params;
  const application = await prisma.application.findUnique({ where: { id } });
  if (!application) {
    return NextResponse.json({ error: "Заявка не найдена" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const kind = body?.kind;
  const amount = body?.amount;

  if (!isExpenseKind(kind)) {
    return NextResponse.json({ error: "Неизвестный вид расхода" }, { status: 400 });
  }
  if (typeof amount !== "number" || !Number.isInteger(amount) || amount <= 0 || amount > MAX_PRICE) {
    return NextResponse.json({ error: "Некорректная сумма" }, { status: 400 });
  }

  const expense = await addExpense(id, kind, amount);
  return NextResponse.json(expense, { status: 201 });
}
