import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAuthenticated } from "@/lib/auth";
import { locationFormSchema } from "@/lib/schemas";
import { parseCoordinates } from "@/lib/coordinates";

export const runtime = "nodejs";

// PATCH /api/locations/:id
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  const { id } = await params;

  const parsed = locationFormSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Некорректные данные" },
      { status: 400 },
    );
  }

  const existing = await prisma.location.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Адрес не найден" }, { status: 404 });
  }

  const { title, address, hours, coordinates } = parsed.data;
  const point = coordinates ? parseCoordinates(coordinates) : null;

  const location = await prisma.location.update({
    where: { id },
    data: {
      title,
      address,
      hours: hours || null,
      lat: point?.lat ?? null,
      lon: point?.lon ?? null,
    },
  });

  return NextResponse.json(location);
}

// DELETE /api/locations/:id
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  const { id } = await params;

  const existing = await prisma.location.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Адрес не найден" }, { status: 404 });
  }

  await prisma.location.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
