import type { ApplicationStatus } from "@/types/application";

const TELEGRAM_TIMEOUT_MS = 8000;

// Статусы, которые можно выставить кнопками в чате (порядок = порядок кнопок)
export const BUTTON_STATUSES: { status: ApplicationStatus; label: string }[] = [
  { status: "in_progress", label: "В работу" },
  { status: "done", label: "Готово" },
  { status: "rejected", label: "Спам" },
];

export const isButtonStatus = (value: string): value is ApplicationStatus =>
  BUTTON_STATUSES.some((s) => s.status === value);

export const escapeHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export interface ApplicationForTelegram {
  id: string;
  name: string;
  phone: string;
  message?: string | null;
  productName?: string | null;
}

export interface KeyboardBack {
  filter: string;
  page: number;
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
  options: { title?: string; statusNote?: string } = {},
): string {
  const lines = [
    `<b>${escapeHtml(options.title ?? "Новая заявка с сайта")}</b>`,
    "",
    `Имя: ${escapeHtml(app.name)}`,
    `Телефон: ${escapeHtml(app.phone)}`,
  ];
  if (app.productName) lines.push(`Изделие: ${escapeHtml(app.productName)}`);
  if (app.message) lines.push("", escapeHtml(app.message));
  if (options.statusNote) {
    lines.push("", `<b>${escapeHtml(options.statusNote)}</b>`);
  }
  return lines.join("\n");
}

// Кнопки под заявкой. В режиме card (карточка из списка/поиска) callback_data
// несёт контекст списка (фильтр:страница), чтобы вернуться назад.
export function buildKeyboard(
  app: ApplicationForTelegram,
  currentStatus?: string,
  options: { card?: boolean; back?: KeyboardBack } = {},
) {
  const rows: { text: string; url?: string; callback_data?: string }[][] = [];

  const linkRow: { text: string; url: string }[] = [];
  const whatsapp = toWhatsappNumber(app.phone);
  if (whatsapp) {
    linkRow.push({ text: "WhatsApp", url: `https://wa.me/${whatsapp}` });
  }
  const siteUrl = process.env.SITE_URL;
  if (siteUrl) {
    linkRow.push({ text: "Открыть в админке", url: `${siteUrl}/admin/requests` });
  }
  if (linkRow.length) rows.push(linkRow);

  const ctx = options.card
    ? `:${options.back?.filter ?? "s"}:${options.back?.page ?? 0}`
    : "";

  rows.push(
    BUTTON_STATUSES.map(({ status, label }) => ({
      text: status === currentStatus ? `✓ ${label}` : label,
      callback_data: `st:${app.id}:${status}${ctx}`,
    })),
  );

  if (options.card) {
    const actionRow: { text: string; callback_data: string }[] = [];
    if (options.back) {
      actionRow.push({
        text: "К списку",
        callback_data: `ls:${options.back.filter}:${options.back.page}`,
      });
    }
    actionRow.push({ text: "Удалить", callback_data: `dl:${app.id}${ctx}` });
    rows.push(actionRow);
  }

  return { inline_keyboard: rows };
}

export async function telegramCall(method: string, payload: unknown) {
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
      const body = await response.text().catch(() => "");
      // Повторное нажатие на ту же кнопку — не ошибка
      if (!body.includes("message is not modified")) {
        console.error(`Telegram ${method} failed:`, response.status, body);
      }
    }
    return response.ok;
  } catch (error) {
    console.error(`Telegram ${method} error:`, error);
    return false;
  }
}

export const sendMessage = (
  chatId: string | number,
  text: string,
  replyMarkup?: unknown,
) =>
  telegramCall("sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
    reply_markup: replyMarkup,
  });

export const editMessage = (
  chatId: string | number,
  messageId: number,
  text: string,
  replyMarkup?: unknown,
) =>
  telegramCall("editMessageText", {
    chat_id: chatId,
    message_id: messageId,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
    reply_markup: replyMarkup,
  });

export const answerCallback = (callbackQueryId: string, text?: string) =>
  telegramCall("answerCallbackQuery", {
    callback_query_id: callbackQueryId,
    text,
  });

// Уведомление о новой заявке. Ничего не бросает наружу: если Telegram
// недоступен или не настроен, заявка всё равно уже сохранена в базе.
export async function notifyNewApplication(app: ApplicationForTelegram) {
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!process.env.TELEGRAM_BOT_TOKEN || !chatId) return;

  await sendMessage(chatId, buildApplicationText(app), buildKeyboard(app));
}
