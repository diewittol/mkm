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

// POST /api/telegram/webhook — сообщения и нажатия кнопок из чата с ботом.
// Telegram присылает сюда update, подписанный секретом из setWebhook.
export async function POST(request: Request) {
  if (!secretMatches(request.headers.get("x-telegram-bot-api-secret-token"))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const update = await request.json().catch(() => null);
  const allowedChat = process.env.TELEGRAM_CHAT_ID;

  // Telegram повторяет запрос, если не получил 200, поэтому на всё
  // лишнее и на любые внутренние ошибки тоже отвечаем ok.
  try {
    const query = update?.callback_query;
    const message = update?.message;

    // Принимаем только события из настроенного чата
    if (query?.data && query.message) {
      if (allowedChat && String(query.message.chat.id) === allowedChat) {
        await handleCallback(query);
      }
    } else if (typeof message?.text === "string" && message.chat) {
      if (allowedChat && String(message.chat.id) === allowedChat) {
        await handleMessage(message.chat.id, message.text);
      }
    }
  } catch (error) {
    console.error("Telegram webhook error:", error);
  }

  return NextResponse.json({ ok: true });
}
