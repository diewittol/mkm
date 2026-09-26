import { prisma } from "@/lib/prisma";
import { formatRub } from "@/lib/money";
import { APPLICATION_STATUS_LABELS, type ApplicationStatus } from "@/types/application";

const TELEGRAM_TIMEOUT_MS = 8000;

// Статусы, которые можно выставить кнопками в чате (порядок = порядок кнопок)
export const BUTTON_STATUSES: { status: ApplicationStatus; label: string }[] = [
  { status: "called", label: "Отзвонился" },
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
  orderNumber?: string | null;
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
  options: {
    title?: string;
    statusNote?: string;
    price?: number | null;
    // Расход на заказ (только владельцу): undefined — не показывать ни расход, ни «заказ − расход»
    expenses?: number;
  } = {},
): string {
  const lines = [
    `<b>${escapeHtml(options.title ?? "Новая заявка с сайта")}</b>`,
    "",
    `Имя: ${escapeHtml(app.name)}`,
    `Телефон: ${escapeHtml(app.phone)}`,
  ];
  if (app.orderNumber) lines.push(`№ заказа: ${escapeHtml(app.orderNumber)}`);
  if (app.productName) lines.push(`Изделие: ${escapeHtml(app.productName)}`);
  if (app.message) lines.push("", escapeHtml(app.message));

  const financeLines: string[] = [];
  if (options.price) financeLines.push(`Стоимость: <b>${formatRub(options.price)}</b>`);
  if (options.expenses) financeLines.push(`Расход: ${formatRub(options.expenses)}`);
  if (options.expenses !== undefined && (options.price || options.expenses)) {
    financeLines.push(
      `Заказ − расход: <b>${formatRub((options.price ?? 0) - options.expenses)}</b>`,
    );
  }
  if (financeLines.length) lines.push("", ...financeLines);

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
  options: {
    card?: boolean;
    back?: KeyboardBack;
    canDelete?: boolean;
    notesCount?: number;
    // Кнопка «Финансы» (стоимость + расходы, только владельцу): undefined — не показывать
    finance?: { price: number | null; expenses: number };
  } = {},
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

  if (options.card) {
    // В карточке статус — один пункт меню, а не ряд кнопок: открывает отдельный
    // экран с вариантами (см. случай "sm" в боте)
    const statusText = currentStatus
      ? (APPLICATION_STATUS_LABELS[currentStatus as ApplicationStatus] ?? currentStatus)
      : "—";
    rows.push([{ text: `Статус: ${statusText}`, callback_data: `sm:${app.id}${ctx}` }]);
  } else {
    rows.push(
      BUTTON_STATUSES.map(({ status, label }) => ({
        text: status === currentStatus ? `✓ ${label}` : label,
        callback_data: `st:${app.id}:${status}${ctx}`,
      })),
    );

    // Отмена случайного нажатия: вернуть заявку в «новые»
    if (currentStatus && currentStatus !== "new") {
      rows.push([
        { text: "Вернуть в новые", callback_data: `st:${app.id}:new${ctx}` },
      ]);
    }
  }

  if (options.card) {
    rows.push([
      {
        text: options.notesCount
          ? `Заметки и фото (${options.notesCount})`
          : "Заметки и фото",
        callback_data: `nt:${app.id}${ctx}`,
      },
    ]);

    if (options.finance) {
      const parts: string[] = [];
      if (options.finance.price) parts.push(formatRub(options.finance.price));
      if (options.finance.expenses) parts.push(`расход ${formatRub(options.finance.expenses)}`);
      rows.push([
        {
          text: parts.length ? `Финансы: ${parts.join(" · ")}` : "Финансы",
          callback_data: `fn:${app.id}${ctx}`,
        },
      ]);
    }

    const actionRow: { text: string; callback_data: string }[] = [];
    if (options.back) {
      actionRow.push({
        text: "К списку",
        callback_data: `ls:${options.back.filter}:${options.back.page}`,
      });
    }
    if (options.canDelete ?? true) {
      actionRow.push({ text: "Удалить", callback_data: `dl:${app.id}${ctx}` });
    }
    if (actionRow.length) rows.push(actionRow);
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
export async function notifyNewApplication(
  app: ApplicationForTelegram,
  options: {
    title?: string;
    statusNote?: string;
    status?: string;
    excludeChatId?: string;
  } = {},
) {
  const owner = process.env.TELEGRAM_CHAT_ID;
  if (!process.env.TELEGRAM_BOT_TOKEN || !owner) return;

  // Владелец из .env + все, кому выдан доступ
  const managers = await prisma.telegramUser
    .findMany({ select: { chatId: true } })
    .catch(() => []);
  const recipients = [
    ...new Set([owner, ...managers.map((m) => m.chatId)]),
  ].filter((id) => id !== options.excludeChatId);

  const text = buildApplicationText(app, {
    title: options.title,
    statusNote: options.statusNote,
  });
  const keyboard = buildKeyboard(app, options.status);
  await Promise.all(recipients.map((id) => sendMessage(id, text, keyboard)));
}

// --- Файлы и реакции -------------------------------------------------------

const FILE_TIMEOUT_MS = 30000;

async function telegramResult<T>(method: string, payload: unknown): Promise<T | null> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return null;

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(TELEGRAM_TIMEOUT_MS),
    });
    const json = await response.json().catch(() => null);
    if (!json?.ok) {
      console.error(`Telegram ${method} failed:`, response.status, JSON.stringify(json));
      return null;
    }
    return json.result as T;
  } catch (error) {
    console.error(`Telegram ${method} error:`, error);
    return null;
  }
}

export type DownloadResult =
  | { ok: true; data: Buffer }
  | { ok: false; reason: "too_large" | "failed" };

// Скачивает файл, который прислали боту (фото или документ-картинка)
export async function downloadTelegramFile(
  fileId: string,
  maxBytes: number,
): Promise<DownloadResult> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const info = await telegramResult<{ file_path?: string; file_size?: number }>(
    "getFile",
    { file_id: fileId },
  );
  if (!token || !info?.file_path) return { ok: false, reason: "failed" };
  if (info.file_size && info.file_size > maxBytes) {
    return { ok: false, reason: "too_large" };
  }

  try {
    const response = await fetch(
      `https://api.telegram.org/file/bot${token}/${info.file_path}`,
      { signal: AbortSignal.timeout(FILE_TIMEOUT_MS) },
    );
    if (!response.ok) return { ok: false, reason: "failed" };

    const data = Buffer.from(await response.arrayBuffer());
    return data.length > maxBytes
      ? { ok: false, reason: "too_large" }
      : { ok: true, data };
  } catch (error) {
    console.error("Telegram file download error:", error);
    return { ok: false, reason: "failed" };
  }
}

export interface AlbumPhoto {
  data: Buffer;
  caption?: string;
}

// Отправляет до 10 фото одним сообщением-альбомом (или одно фото)
export async function sendPhotoAlbum(chatId: string | number, photos: AlbumPhoto[]) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const items = photos.slice(0, 10);
  if (!token || items.length === 0) return false;

  const form = new FormData();
  form.append("chat_id", String(chatId));

  let method = "sendPhoto";
  if (items.length === 1) {
    form.append("photo", new Blob([new Uint8Array(items[0].data)], { type: "image/jpeg" }), "photo.jpg");
    if (items[0].caption) form.append("caption", items[0].caption.slice(0, 1000));
  } else {
    method = "sendMediaGroup";
    form.append(
      "media",
      JSON.stringify(
        items.map((item, index) => ({
          type: "photo",
          media: `attach://p${index}`,
          ...(item.caption ? { caption: item.caption.slice(0, 1000) } : {}),
        })),
      ),
    );
    items.forEach((item, index) => {
      form.append(`p${index}`, new Blob([new Uint8Array(item.data)], { type: "image/jpeg" }), `p${index}.jpg`);
    });
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: "POST",
      body: form,
      signal: AbortSignal.timeout(FILE_TIMEOUT_MS),
    });
    if (!response.ok) {
      console.error(`Telegram ${method} failed:`, response.status, await response.text().catch(() => ""));
    }
    return response.ok;
  } catch (error) {
    console.error(`Telegram ${method} error:`, error);
    return false;
  }
}

// Тихое подтверждение «принято» — реакция на сообщение вместо ответа
// на каждое фото. Возвращает false, если реакцию поставить не удалось.
export async function reactToMessage(chatId: string | number, messageId: number) {
  const ok = await telegramCall("setMessageReaction", {
    chat_id: chatId,
    message_id: messageId,
    reaction: [{ type: "emoji", emoji: "\u{1F44C}" }],
  });
  return ok === true;
}

// Отправляет сохранённое голосовое/аудио обратно в чат.
// ogg (Telegram-голосовые, Opus) уходит как голосовое, остальное — как аудио.
export async function sendAudioFile(
  chatId: string | number,
  file: { data: Buffer; kind: "ogg" | "mp3" | "m4a"; caption?: string },
) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return false;

  const isVoice = file.kind === "ogg";
  const mime = { ogg: "audio/ogg", mp3: "audio/mpeg", m4a: "audio/mp4" }[file.kind];

  const form = new FormData();
  form.append("chat_id", String(chatId));
  form.append(
    isVoice ? "voice" : "audio",
    new Blob([new Uint8Array(file.data)], { type: mime }),
    `${isVoice ? "voice" : "audio"}.${file.kind}`,
  );
  if (file.caption) form.append("caption", file.caption.slice(0, 1000));

  const method = isVoice ? "sendVoice" : "sendAudio";
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: "POST",
      body: form,
      signal: AbortSignal.timeout(FILE_TIMEOUT_MS),
    });
    if (!response.ok) {
      console.error(`Telegram ${method} failed:`, response.status, await response.text().catch(() => ""));
    }
    return response.ok;
  } catch (error) {
    console.error(`Telegram ${method} error:`, error);
    return false;
  }
}
