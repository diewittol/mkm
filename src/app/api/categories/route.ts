import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAuthenticated } from "@/lib/auth";

export const runtime = "nodejs";

// GET /api/categories
export async function GET() {
  const categories = await prisma.category.findMany({
    orderBy: { order: "asc" },
  });

  return NextResponse.json(categories);
}

// POST /api/categories
export async function POST(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  const body = await request.json();
  const { name, slug, order, description, image } = body;

  if (!name || !slug) {
    return NextResponse.json(
      { error: "Поля name и slug обязательны" },
      { status: 400 },
    );
  }

  const existing = await prisma.category.findUnique({ where: { slug } });
  if (existing) {
    return NextResponse.json(
      { error: "Категория с таким slug уже существует" },
      { status: 409 },
    );
  }

  const category = await prisma.category.create({
    data: {
      name,
      slug,
      order: order ?? 0,
      description: description || null,
      image: image || null,
    },
  });

  return NextResponse.json(category, { status: 201 });
}
