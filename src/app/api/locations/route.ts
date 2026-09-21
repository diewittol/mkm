import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAuthenticated } from "@/lib/auth";
import { locationFormSchema } from "@/lib/schemas";
import { parseCoordinates } from "@/lib/coordinates";

export const runtime = "nodejs";

// GET /api/locations — все адреса (для админки)
export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  const locations = await prisma.location.findMany({
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(locations);
}

// POST /api/locations — новый адрес
export async function POST(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  const parsed = locationFormSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Некорректные данные" },
      { status: 400 },
    );
  }

  const { title, address, hours, coordinates } = parsed.data;
  const point = coordinates ? parseCoordinates(coordinates) : null;

  const location = await prisma.location.create({
    data: {
      title,
      address,
      hours: hours || null,
      lat: point?.lat ?? null,
      lon: point?.lon ?? null,
    },
  });

  return NextResponse.json(location, { status: 201 });
}
