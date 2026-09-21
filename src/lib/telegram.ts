import {
  APPLICATION_STATUS_LABELS,
  type ApplicationStatus,
} from "@/types/application";

const TELEGRAM_TIMEOUT_MS = 8000;

// Статусы, которые можно выставить кнопками в чате (порядок = порядок кнопок)
const BUTTON_STATUSES: { status: ApplicationStatus; label: string }[] = [
  { status: "in_progress", label: "В работу" },
  { status: "done", label: "Готово" },
  { status: "rejected", label: "Спам" },
];

export const isButtonStatus = (value: string): value is ApplicationStatus =>
  BUTTON_STATUSES.some((s) => s.status === value);

const escapeHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export interface ApplicationForTelegram {
  id: string;
  name: string;
  phone: string;
  message?: string | null;
  productName?: string | null;
}

// Номер для wa.me: только цифры, 8XXXXXXXXXX -> 7XXXXXXXXXX
function toWhatsappNumber(phone: string): string | null {
  let digits = phone.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("8")) {
    digits = `7${digits.slice(1)}`;
  } else if (digits.length === 10) {
    digits = `7${digits}`;
  }
  return digits.length >= 11 ? digits : null;
}

export function buildApplicationText(
  app: ApplicationForTelegram,
  statusNote?: string,
): string {
  const lines = [
    "<b>Новая заявка с сайта</b>",
    "",
    `Имя: ${escapeHtml(app.name)}`,
    `Телефон: ${escapeHtml(app.phone)}`,
  ];
  if (app.productName) lines.push(`Изделие: ${escapeHtml(app.productName)}`);
  if (app.message) lines.push("", escapeHtml(app.message));
  if (statusNote) lines.push("", `<b>${escapeHtml(statusNote)}</b>`);
  return lines.join("\n");
}

export function buildKeyboard(
  app: ApplicationForTelegram,
  currentStatus?: ApplicationStatus,
) {
  const linkRow: { text: string; url: string }[] = [];

  const whatsapp = toWhatsappNumber(app.phone);
  if (whatsapp) {
    linkRow.push({ text: "WhatsApp", url: `https://wa.me/${whatsapp}` });
  }

  const siteUrl = process.env.SITE_URL;
  if (siteUrl) {
    linkRow.push({ text: "Открыть в админке", url: `${siteUrl}/admin/requests` });
  }

  const statusRow = BUTTON_STATUSES.map(({ status, label }) => ({
    text: status === currentStatus ? `✓ ${label}` : label,
    callback_data: `st:${app.id}:${status}`,
  }));

  return { inline_keyboard: [...(linkRow.length ? [linkRow] : []), statusRow] };
}

async function telegramCall(method: string, payload: unknown) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return null;

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(TELEGRAM_TIMEOUT_MS),
    });

    if (!response.ok) {
      console.error(
        `Telegram ${method} failed:`,
        response.status,
        await response.text().catch(() => ""),
      );
    }
    return response.ok;
  } catch (error) {
    console.error(`Telegram ${method} error:`, error);
    return false;
  }
}

// Уведомление о новой заявке. Ничего не бросает наружу: если Telegram
// недоступен или не настроен, заявка всё равно уже сохранена в базе.
export async function notifyNewApplication(app: ApplicationForTelegram) {
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!process.env.TELEGRAM_BOT_TOKEN || !chatId) return;

  await telegramCall("sendMessage", {
    chat_id: chatId,
    text: buildApplicationText(app),
    parse_mode: "HTML",
    disable_web_page_preview: true,
    reply_markup: buildKeyboard(app),
  });
}

export const answerCallback = (callbackQueryId: string, text: string) =>
  telegramCall("answerCallbackQuery", {
    callback_query_id: callbackQueryId,
    text,
  });

export const editApplicationMessage = (
  chatId: string | number,
  messageId: number,
  app: ApplicationForTelegram,
  status: ApplicationStatus,
  who: string,
) =>
  telegramCall("editMessageText", {
    chat_id: chatId,
    message_id: messageId,
    text: buildApplicationText(
      app,
      `${APPLICATION_STATUS_LABELS[status]} — ${who}`,
    ),
    parse_mode: "HTML",
    disable_web_page_preview: true,
    reply_markup: buildKeyboard(app, status),
  });
