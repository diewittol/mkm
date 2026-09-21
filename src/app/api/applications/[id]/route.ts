import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAuthenticated } from "@/lib/auth";
import { deleteApplicationWithFiles } from "@/lib/order-notes";

export const runtime = "nodejs";

// PATCH /api/applications/:id — смена статуса
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();

  const existing = await prisma.application.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json(
      { error: "Заявка не найдена" },
      { status: 404 },
    );
  }

  const application = await prisma.application.update({
    where: { id },
    data:
      body.status === "new"
        ? { status: "new", handledBy: null, handledAt: null }
        : {
            status: body.status,
            handledBy: "админка",
            handledAt: new Date(),
          },
  });

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