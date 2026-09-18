import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAuthenticated } from "@/lib/auth";

export const runtime = "nodejs";

// PATCH /api/projects/:id
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();

  const existing = await prisma.project.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json(
      { error: "Проект не найден" },
      { status: 404 },
    );
  }

  // Проверка уникальности slug, если меняется
  if (body.slug && body.slug !== existing.slug) {
    const slugTaken = await prisma.project.findUnique({
      where: { slug: body.slug },
    });
    if (slugTaken) {
      return NextResponse.json(
        { error: "Проект с таким slug уже существует" },
        { status: 409 },
      );
    }
  }

  const project = await prisma.project.update({
    where: { id },
    data: {
      title: body.title,
      slug: body.slug,
      description: body.description || null,
      location: body.location || null,
      order: body.order,
      isPublished: body.isPublished,
      images: body.images
        ? {
            deleteMany: {},
            create: body.images.map(
              (img: { url: string }, index: number) => ({
                url: img.url,
                order: index,
              }),
            ),
          }
        : undefined,
    },
    include: { images: { orderBy: { order: "asc" } } },
  });

  return NextResponse.json(project);
}

// DELETE /api/projects/:id
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  const { id } = await params;

  const existing = await prisma.project.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json(
      { error: "Проект не найден" },
      { status: 404 },
    );
  }

  await prisma.project.delete({ where: { id } });

  return NextResponse.json({ success: true });
}