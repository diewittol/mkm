import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";
import {
  answerCallback,
  editApplicationMessage,
  isButtonStatus,
} from "@/lib/telegram";
import { APPLICATION_STATUS_LABELS } from "@/types/application";

export const runtime = "nodejs";

interface TelegramCallbackQuery {
  id: string;
  data?: string;
  from: { username?: string; first_name?: string };
  message?: { message_id: number; chat: { id: number } };
}

function secretMatches(received: string | null): boolean {
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!expected || !received) return false;

  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

// POST /api/telegram/webhook — нажатия на кнопки под уведомлением о заявке.
// Telegram присылает сюда update, подписанный секретом из setWebhook.
export async function POST(request: Request) {
  if (!secretMatches(request.headers.get("x-telegram-bot-api-secret-token"))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const update = await request.json().catch(() => null);
  const query: TelegramCallbackQuery | undefined = update?.callback_query;

  // Telegram повторяет запрос, если не получил 200, поэтому на всё
  // лишнее тоже отвечаем ok.
  if (!query?.data || !query.message) {
    return NextResponse.json({ ok: true });
  }

  // Принимаем нажатия только из настроенного чата
  const allowedChat = process.env.TELEGRAM_CHAT_ID;
  if (!allowedChat || String(query.message.chat.id) !== allowedChat) {
    return NextResponse.json({ ok: true });
  }

  const [prefix, id, status] = query.data.split(":");
  if (prefix !== "st" || !id || !status || !isButtonStatus(status)) {
    return NextResponse.json({ ok: true });
  }

  const application = await prisma.application.findUnique({
    where: { id },
    include: { product: { select: { name: true } } },
  });

  if (!application) {
    await answerCallback(query.id, "Заявка не найдена (возможно, удалена)");
    return NextResponse.json({ ok: true });
  }

  await prisma.application.update({ where: { id }, data: { status } });

  const who = query.from.username
    ? `@${query.from.username}`
    : (query.from.first_name?.trim() || "менеджер");

  await Promise.all([
    answerCallback(query.id, `Статус: ${APPLICATION_STATUS_LABELS[status]}`),
    editApplicationMessage(
      query.message.chat.id,
      query.message.message_id,
      {
        id: application.id,
        name: application.name,
        phone: application.phone,
        message: application.message,
        productName: application.product?.name ?? null,
      },
      status,
      who,
    ),
  ]);

  return NextResponse.json({ ok: true });
}
