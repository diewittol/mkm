import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAuthenticated } from "@/lib/auth";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { notifyNewApplication } from "@/lib/telegram";

export const runtime = "nodejs";

const RATE_LIMIT = 5;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 минут

// GET /api/applications — список всех заявок
export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  const applications = await prisma.application.findMany({
    include: {
      product: {
        select: { id: true, name: true, slug: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(applications);
}

// POST /api/applications — новая заявка с сайта
export async function POST(request: Request) {
  const body = await request.json();

  // Honeypot: скрытое поле, которое заполняют только боты.
  // Молча делаем вид, что всё прошло успешно, ничего не создавая.
  if (body.website) {
    return NextResponse.json({ id: "ok" }, { status: 201 });
  }

  const ip = getClientIp(request);
  if (!checkRateLimit(`applications:${ip}`, RATE_LIMIT, RATE_LIMIT_WINDOW_MS)) {
    return NextResponse.json(
      { error: "Слишком много заявок. Попробуйте позже." },
      { status: 429 },
    );
  }

  const { name, phone, message, productName } = body;

  if (!name || !phone) {
    return NextResponse.json(
      { error: "Поля name и phone обязательны" },
      { status: 400 },
    );
  }

  // Если пришло название товара — ищем productId
  let productId: string | undefined;
  if (productName) {
    const product = await prisma.product.findFirst({
      where: { name: productName },
    });
    productId = product?.id;
  }

  const application = await prisma.application.create({
    data: {
      name,
      phone,
      message,
      productId,
      status: "new",
    },
  });

  // Не ждём ответа Telegram, чтобы не задерживать ответ посетителю
  void notifyNewApplication({
    id: application.id,
    name,
    phone,
    message,
    productName,
  });

  return NextResponse.json(application, { status: 201 });
}