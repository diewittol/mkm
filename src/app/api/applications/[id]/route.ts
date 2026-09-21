import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAuthenticated } from "@/lib/auth";
import type { Prisma } from "@prisma/client";
import { deleteApplicationWithFiles } from "@/lib/order-notes";
import { MAX_PRICE } from "@/lib/money";

export const runtime = "nodejs";

const STATUSES = ["new", "in_progress", "done", "rejected"];

// PATCH /api/applications/:id — смена статуса и/или стоимости
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  const { id } = await params;
  const body = (await request.json().catch(() => null)) ?? {};

  const existing = await prisma.application.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json(
      { error: "Заявка не найдена" },
      { status: 404 },
    );
  }

  const data: Prisma.ApplicationUpdateInput = {};

  if ("status" in body) {
    if (typeof body.status !== "string" || !STATUSES.includes(body.status)) {
      return NextResponse.json({ error: "Неизвестный статус" }, { status: 400 });
    }
    Object.assign(
      data,
      body.status === "new"
        ? { status: "new", handledBy: null, handledAt: null }
        : { status: body.status, handledBy: "админка", handledAt: new Date() },
    );
  }

  // Стоимость в рублях: целое число, null или 0 — убрать
  if ("price" in body) {
    const price = body.price;
    const valid =
      price === null ||
      (typeof price === "number" && Number.isInteger(price) && price >= 0 && price <= MAX_PRICE);
    if (!valid) {
      return NextResponse.json({ error: "Некорректная стоимость" }, { status: 400 });
    }
    data.price = price || null;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Нечего менять" }, { status: 400 });
  }

  const application = await prisma.application.update({ where: { id }, data });

  return NextResponse.json(application);
}

// DELETE /api/applications/:id
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  const { id } = await params;

  const existing = await prisma.application.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json(
      { error: "Заявка не найдена" },
      { status: 404 },
    );
  }

  await deleteApplicationWithFiles(id);

  return NextResponse.json({ success: true });
}