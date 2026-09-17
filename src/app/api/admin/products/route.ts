import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAuthenticated } from "@/lib/auth";

export const runtime = "nodejs";

// GET /api/admin/products — все товары, включая черновики
export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  const products = await prisma.product.findMany({
    include: {
      category: true,
      images: { orderBy: { order: "asc" } },
      specifications: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(products);
}