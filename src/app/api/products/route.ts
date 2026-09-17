import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAuthenticated } from "@/lib/auth";

export const runtime = "nodejs";

// GET /api/products?category=beds
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");

  const products = await prisma.product.findMany({
    where: {
      isPublished: true,
      ...(category ? { category: { slug: category } } : {}),
    },
    include: {
      category: true,
      images: { orderBy: { order: "asc" } },
      specifications: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(products);
}

// POST /api/products
export async function POST(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  const body = await request.json();

  const {
    name,
    slug,
    categoryId,
    shortDescription,
    description,
    seoTitle,
    seoDescription,
    images,
  } = body;

  if (!name || !slug || !categoryId) {
    return NextResponse.json(
      { error: "Поля name, slug и categoryId обязательны" },
      { status: 400 },
    );
  }

  // categoryId может быть id или slug
  const category = await prisma.category.findFirst({
    where: { OR: [{ id: categoryId }, { slug: categoryId }] },
  });

  if (!category) {
    return NextResponse.json(
      { error: "Категория не найдена" },
      { status: 400 },
    );
  }

  const existing = await prisma.product.findUnique({ where: { slug } });
  if (existing) {
    return NextResponse.json(
      { error: "Изделие с таким slug уже существует" },
      { status: 409 },
    );
  }

  const product = await prisma.product.create({
    data: {
      name,
      slug,
      categoryId: category.id,
      shortDescription,
      description,
      seoTitle,
      seoDescription,
      isPublished: body.isPublished ?? false,
      specifications: {
        create: (body.specifications ?? [])
          .filter((s: { name: string; value: string }) => s.name && s.value)
          .map((s: { name: string; value: string }) => ({
            name: s.name,
            value: s.value,
          })),
      },
      images: {
        create: (images ?? []).map((img: { url: string }, index: number) => ({
          url: img.url,
          order: index,
        })),
      },
    },
    include: {
      category: true,
      images: { orderBy: { order: "asc" } },
      specifications: true,
    },
  });

  return NextResponse.json(product, { status: 201 });
}