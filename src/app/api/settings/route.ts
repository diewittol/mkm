import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAuthenticated } from "@/lib/auth";

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

  const settings = await prisma.settings.upsert({
    where: { id: "singleton" },
    update: {
      companyName: body.companyName,
      phone: body.phone,
      email: body.email,
      address: body.address,
      telegram: body.telegram || null,
      whatsapp: body.whatsapp || null,
    },
    create: {
      id: "singleton",
      companyName: body.companyName,
      phone: body.phone,
      email: body.email,
      address: body.address,
      telegram: body.telegram || null,
      whatsapp: body.whatsapp || null,
    },
  });

  return NextResponse.json(settings);
}