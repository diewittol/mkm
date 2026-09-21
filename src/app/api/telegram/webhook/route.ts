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

// Что в сообщении: текст, фото, файл-картинка или что-то, что бот не принимает
function describeMessage(message: Record<string, unknown>) {
  const photos = Array.isArray(message.photo) ? message.photo : [];
  const largestPhoto = photos.at(-1) as { file_id?: string; file_size?: number } | undefined;

  const document = message.document as
    | { file_id?: string; file_size?: number; mime_type?: string }
    | undefined;
  const imageDocument = document?.mime_type?.startsWith("image/") ? document : undefined;

  const source = largestPhoto ?? imageDocument;
  const hasOtherMedia = Boolean(
    (document && !imageDocument) ||
      message.video ||
      message.voice ||
      message.audio ||
      message.video_note ||
      message.animation ||
      message.sticker,
  );

  return {
    text: typeof message.text === "string" ? message.text : undefined,
    caption: typeof message.caption === "string" ? message.caption : undefined,
    photoFileId: source?.file_id,
    photoSize: source?.file_size,
    unsupported: hasOtherMedia,
  };
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
    } else if (message?.from && message.chat?.type === "private") {
      const parts = describeMessage(message);
      if (parts.text !== undefined || parts.photoFileId || parts.unsupported) {
        await handleMessage({
          chatId: message.chat.id,
          messageId: message.message_id,
          from: message.from,
          ...parts,
        });
      }
    }
  } catch (error) {
    console.error("Telegram webhook error:", error);
  }

  return NextResponse.json({ ok: true });
}
