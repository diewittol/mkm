import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAuthenticated } from "@/lib/auth";

export const runtime = "nodejs";

// Ищем товар по id ИЛИ slug
async function findProduct(idOrSlug: string) {
  return prisma.product.findFirst({
    where: {
      OR: [{ id: idOrSlug }, { slug: idOrSlug }],
    },
    include: {
      category: true,
      images: { orderBy: { order: "asc" } },
      specifications: true,
    },
  });
}

// GET /api/products/krovat-riviera (или по id)
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  const product = await findProduct(slug);

  if (!product) {
    return NextResponse.json(
      { error: "Изделие не найдено" },
      { status: 404 },
    );
  }

  return NextResponse.json(product);
}

// PATCH /api/products/krovat-riviera
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  const { slug } = await params;
  const body = await request.json();

  const existing = await findProduct(slug);
  if (!existing) {
    return NextResponse.json(
      { error: "Изделие не найдено" },
      { status: 404 },
    );
  }

  const {
    name,
    slug: newSlug,
    categoryId,
    shortDescription,
    description,
    seoTitle,
    seoDescription,
    isPublished,
    specifications,
    images,
  } = body;

  // Если меняется slug — проверяем, что новый свободен
  if (newSlug && newSlug !== existing.slug) {
    const slugTaken = await prisma.product.findUnique({
      where: { slug: newSlug },
    });
    if (slugTaken) {
      return NextResponse.json(
        { error: "Изделие с таким slug уже существует" },
        { status: 409 },
      );
    }
  }

  // categoryId может быть id или slug
  let resolvedCategoryId = existing.categoryId;
  if (categoryId) {
    const category = await prisma.category.findFirst({
      where: { OR: [{ id: categoryId }, { slug: categoryId }] },
    });
    if (!category) {
      return NextResponse.json(
        { error: "Категория не найдена" },
        { status: 400 },
      );
    }
    resolvedCategoryId = category.id;
  }

  const product = await prisma.product.update({
    where: { id: existing.id },
    data: {
      name,
      slug: newSlug,
      categoryId: resolvedCategoryId,
      shortDescription,
      description,
      seoTitle,
      seoDescription,
      isPublished,
      specifications: specifications
        ? {
            deleteMany: {},
            create: specifications
              .filter(
                (s: { name: string; value: string }) => s.name && s.value,
              )
              .map((s: { name: string; value: string }) => ({
                name: s.name,
                value: s.value,
              })),
          }
        : undefined,
      images: images
        ? {
            deleteMany: {},
            create: images.map((img: { url: string }, index: number) => ({
              url: img.url,
              order: index,
            })),
          }
        : undefined,
    },
    include: {
      category: true,
      images: { orderBy: { order: "asc" } },
      specifications: true,
    },
  });

  return NextResponse.json(product);
}