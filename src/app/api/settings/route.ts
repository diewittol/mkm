import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAuthenticated } from "@/lib/auth";
import { HERO_COLOR_PATTERN, HERO_MAX_OVERLAY } from "@/lib/hero";

export const runtime = "nodejs";

// GET /api/settings
export async function GET() {
  const settings = await prisma.settings.findUnique({
    where: { id: "singleton" },
  });

  return NextResponse.json(settings);
}

// PATCH /api/settings
export async function PATCH(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  const body = await request.json();

  // Фон главного экрана: меняем только то, что пришло в запросе
  const hero: {
    heroImage?: string | null;
    heroColor?: string | null;
    heroOverlay?: number;
    heroTextTheme?: string;
  } = {};
  if ("heroImage" in body) {
    const image = body.heroImage;
    if (image !== null && !(typeof image === "string" && image.startsWith("/uploads/"))) {
      return NextResponse.json({ error: "Некорректное фото" }, { status: 400 });
    }
    hero.heroImage = image;
  }
  if ("heroColor" in body) {
    const color = body.heroColor;
    if (color !== null && !(typeof color === "string" && HERO_COLOR_PATTERN.test(color))) {
      return NextResponse.json({ error: "Цвет в формате #rrggbb" }, { status: 400 });
    }
    hero.heroColor = color;
  }
  if ("heroOverlay" in body) {
    const overlay = body.heroOverlay;
    if (!Number.isInteger(overlay) || overlay < 0 || overlay > HERO_MAX_OVERLAY) {
      return NextResponse.json({ error: "Затемнение от 0 до 80" }, { status: 400 });
    }
    hero.heroOverlay = overlay;
  }
  if ("heroTextTheme" in body) {
    if (!["auto", "dark", "light"].includes(body.heroTextTheme)) {
      return NextResponse.json({ error: "Некорректный цвет текста" }, { status: 400 });
    }
    hero.heroTextTheme = body.heroTextTheme;
  }

  const settings = await prisma.settings.upsert({
    where: { id: "singleton" },
    update: {
      companyName: body.companyName,
      phone: body.phone,
      email: body.email,
      address: body.address,
      telegram: body.telegram || null,
      whatsapp: body.whatsapp || null,
      ...hero,
    },
    create: {
      id: "singleton",
      companyName: body.companyName,
      phone: body.phone,
      email: body.email,
      address: body.address,
      telegram: body.telegram || null,
      whatsapp: body.whatsapp || null,
      ...hero,
    },
  });

  return NextResponse.json(settings);
}