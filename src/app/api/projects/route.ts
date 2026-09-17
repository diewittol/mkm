import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAuthenticated } from "@/lib/auth";

export const runtime = "nodejs";

// GET /api/projects — все проекты, включая черновики (для админки)
export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  const projects = await prisma.project.findMany({
    orderBy: { order: "asc" },
  });

  return NextResponse.json(projects);
}

// POST /api/projects — создание (для админки)
export async function POST(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  const body = await request.json();
  const { title, slug, description, location, imageUrl, order, isPublished } =
    body;

  if (!title || !slug) {
    return NextResponse.json(
      { error: "Поля title и slug обязательны" },
      { status: 400 },
    );
  }

  const existing = await prisma.project.findUnique({ where: { slug } });
  if (existing) {
    return NextResponse.json(
      { error: "Проект с таким slug уже существует" },
      { status: 409 },
    );
  }

  const project = await prisma.project.create({
    data: {
      title,
      slug,
      description: description || null,
      location: location || null,
      imageUrl: imageUrl || null,
      order: order ?? 0,
      isPublished: isPublished ?? false,
    },
  });

  return NextResponse.json(project, { status: 201 });
}