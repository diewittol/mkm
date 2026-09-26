import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAuthenticated } from "@/lib/auth";
import { MAX_PRICE, cleanComment } from "@/lib/money";
import { addExtra } from "@/lib/order-extras";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

// GET /api/applications/:id/extras — доплаты к стоимости заказа
export async function GET(_request: Request, { params }: RouteContext) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  const { id } = await params;
  const extras = await prisma.applicationExtra.findMany({
    where: { applicationId: id },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(extras);
}

// POST /api/applications/:id/extras — добавить доплату (складывается со стоимостью)
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
  const amount = body?.amount;
  if (typeof amount !== "number" || !Number.isInteger(amount) || amount <= 0 || amount > MAX_PRICE) {
    return NextResponse.json({ error: "Некорректная сумма" }, { status: 400 });
  }

  const extra = await addExtra(id, amount, cleanComment(body?.comment));
  return NextResponse.json(extra, { status: 201 });
}
