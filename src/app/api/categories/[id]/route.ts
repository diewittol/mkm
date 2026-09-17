import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAuthenticated } from "@/lib/auth";

export const runtime = "nodejs";

// PATCH /api/categories/:id
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();

  const existing = await prisma.category.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json(
      { error: "Категория не найдена" },
      { status: 404 },
    );
  }

  // Если меняется slug — проверяем, что новый свободен
  if (body.slug && body.slug !== existing.slug) {
    const slugTaken = await prisma.category.findUnique({
      where: { slug: body.slug },
    });
    if (slugTaken) {
      return NextResponse.json(
        { error: "Категория с таким slug уже существует" },
        { status: 409 },
      );
    }
  }

  const category = await prisma.category.update({
    where: { id },
    data: {
      name: body.name,
      slug: body.slug,
      order: body.order,
      description: body.description || null,
      image: body.image || null,
    },
  });

  return NextResponse.json(category);
}

// DELETE /api/categories/:id
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  const { id } = await params;

  const existing = await prisma.category.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json(
      { error: "Категория не найдена" },
      { status: 404 },
    );
  }

  await prisma.category.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
