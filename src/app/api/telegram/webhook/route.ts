import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { handleCallback, handleMessage } from "@/lib/telegram-bot";

export const runtime = "nodejs";

function secretMatches(received: string | null): boolean {
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!expected || !received) return false;

  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

// POST /api/telegram/webhook — сообщения и нажатия кнопок из личных чатов с ботом.
// Telegram присылает сюда update, подписанный секретом из setWebhook.
// Права (владелец / менеджер / нет доступа) проверяет сам бот по Telegram ID.
export async function POST(request: Request) {
  if (!secretMatches(request.headers.get("x-telegram-bot-api-secret-token"))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const update = await request.json().catch(() => null);

  // Telegram повторяет запрос, если не получил 200, поэтому на всё
  // лишнее и на любые внутренние ошибки тоже отвечаем ok.
  try {
    const query = update?.callback_query;
    const message = update?.message;

    if (query?.data && query.from && query.message?.chat?.type === "private") {
      await handleCallback(query);
    } else if (
      typeof message?.text === "string" &&
      message.from &&
      message.chat?.type === "private"
    ) {
      await handleMessage({
        chatId: message.chat.id,
        from: message.from,
        text: message.text,
      });
    }
  } catch (error) {
    console.error("Telegram webhook error:", error);
  }

  return NextResponse.json({ ok: true });
}
