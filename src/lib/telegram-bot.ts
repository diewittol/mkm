import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { createManualApplication, normalizePhone } from "@/lib/manual-application";
import { APPLICATION_STATUS_LABELS } from "@/types/application";
import {
  answerCallback,
  buildApplicationText,
  buildKeyboard,
  editMessage,
  escapeHtml,
  isButtonStatus,
  sendMessage,
  telegramCall,
  type ApplicationForTelegram,
  type KeyboardBack,
} from "@/lib/telegram";

type ListFilter = "n" | "w" | "a";
export type Role = "owner" | "manager";

const PAGE_SIZE = 10;
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const MSK_OFFSET_MS = 3 * HOUR_MS;
const SEARCH_SCAN_LIMIT = 500;
const INVITE_TTL_MS = DAY_MS;
const INVITE_PREFIX = "inv_";

const FILTERS: Record<ListFilter, { title: string; status?: string }> = {
  n: { title: "Новые заявки", status: "new" },
  w: { title: "Заявки в работе", status: "in_progress" },
  a: { title: "Все заявки" },
};

const isFilter = (value: string | undefined): value is ListFilter =>
  value === "n" || value === "w" || value === "a";

const statusLabel = (status: string) =>
  APPLICATION_STATUS_LABELS[status as keyof typeof APPLICATION_STATUS_LABELS] ??
  status;

// Постоянная клавиатура под полем ввода. Тексты кнопок — это же команды.
const MENU = {
  new: "Новые",
  work: "В работе",
  all: "Все заявки",
  stats: "Сводка",
  search: "Поиск",
  access: "Доступ",
  add: "Добавить заявку",
} as const;

const MENU_KEYS = new Set<string>(Object.values(MENU));

function menuKeyboard(role: Role) {
  const rows = [
    [{ text: MENU.new }, { text: MENU.work }],
    [{ text: MENU.all }, { text: MENU.stats }],
    [{ text: MENU.search }, ...(role === "owner" ? [{ text: MENU.access }] : [])],
    [{ text: MENU.add }],
  ];
  return { keyboard: rows, resize_keyboard: true, is_persistent: true };
}

interface View {
  text: string;
  markup?: unknown;
}

interface TelegramFrom {
  id: number;
  username?: string;
  first_name?: string;
  last_name?: string;
}

// В именах Telegram бывают невидимые символы — из-за них подпись «пустая»
const INVISIBLE_CHARS = /[​-‏⁠﻿­]/g;

const displayName = (from: TelegramFrom) => {
  if (from.username) return `@${from.username}`;
  const name = [from.first_name, from.last_name]
    .filter(Boolean)
    .join(" ")
    .replace(INVISIBLE_CHARS, "")
    .trim();
  return name || `id ${from.id}`;
};

// Владелец задан в .env (TELEGRAM_CHAT_ID), остальные — в таблице TelegramUser
export async function getRole(userId: string): Promise<Role | null> {
  if (userId === process.env.TELEGRAM_CHAT_ID) return "owner";
  const user = await prisma.telegramUser.findUnique({
    where: { chatId: userId },
  });
  return user ? "manager" : null;
}

function ago(date: Date): string {
  const minutes = Math.floor((Date.now() - date.getTime()) / 60000);
  if (minutes < 1) return "только что";
  if (minutes < 60) return `${minutes} мин назад`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ч назад`;
  return `${Math.floor(hours / 24)} дн назад`;
}

const formatDate = (date: Date) =>
  date.toLocaleString("ru-RU", {
    timeZone: "Europe/Moscow",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

interface ListItem {
  id: string;
  name: string;
  phone: string;
  status: string;
  createdAt: Date;
  handledBy: string | null;
}

// Строка статуса с указанием, кто его выставил: «В работе — @user»
const statusWithWho = (status: string, handledBy: string | null) =>
  handledBy ? `${statusLabel(status)} — ${handledBy}` : statusLabel(status);

function itemButton(item: ListItem, back: string, showStatus: boolean) {
  const parts = [item.name, item.phone];
  if (showStatus) {
    parts.push(statusWithWho(item.status, item.handledBy));
  } else {
    // В списке «Новые/В работе» статус и так известен — показываем, кто взял
    parts.push(item.handledBy ?? ago(item.createdAt));
  }
  return [
    {
      text: parts.join(" · ").slice(0, 100),
      callback_data: `op:${item.id}:${back}`,
    },
  ];
}

async function listView(filter: ListFilter, page: number): Promise<View> {
  const { title, status } = FILTERS[filter];
  const where = status ? { status } : {};

  const total = await prisma.application.count({ where });
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const current = Math.min(Math.max(page, 0), pages - 1);

  const items = await prisma.application.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: current * PAGE_SIZE,
    take: PAGE_SIZE,
  });

  if (total === 0) {
    return { text: `<b>${title}</b>\n\nЗаявок нет.` };
  }

  const header = `<b>${title}</b>: ${total}${pages > 1 ? ` (стр. ${current + 1} из ${pages})` : ""}`;
  const rows = items.map((item) =>
    itemButton(item, `${filter}:${current}`, filter === "a"),
  );

  const nav: { text: string; callback_data: string }[] = [];
  if (current > 0) {
    nav.push({ text: "Назад", callback_data: `ls:${filter}:${current - 1}` });
  }
  if ((current + 1) * PAGE_SIZE < total) {
    nav.push({ text: "Ещё", callback_data: `ls:${filter}:${current + 1}` });
  }
  if (nav.length) rows.push(nav);

  return {
    text: `${header}\n\nВыберите заявку:`,
    markup: { inline_keyboard: rows },
  };
}

async function cardView(
  id: string,
  role: Role,
  back?: KeyboardBack,
  note?: string,
): Promise<View | null> {
  const application = await prisma.application.findUnique({
    where: { id },
    include: { product: { select: { name: true } } },
  });
  if (!application) return null;

  const app: ApplicationForTelegram = {
    id: application.id,
    name: application.name,
    phone: application.phone,
    message: application.message,
    productName: application.product?.name ?? null,
  };

  return {
    text: buildApplicationText(app, {
      title: `Заявка от ${formatDate(application.createdAt)}${
        application.source === "manual" ? " (вручную)" : ""
      }`,
      statusNote:
        note ??
        `Статус: ${statusWithWho(application.status, application.handledBy)}${
          application.handledBy && application.handledAt
            ? ` (${formatDate(application.handledAt)})`
            : ""
        }`,
    }),
    markup: buildKeyboard(app, application.status, {
      card: true,
      back,
      canDelete: role === "owner",
    }),
  };
}

async function statsView(): Promise<View> {
  const now = Date.now();
  const startOfDay =
    Math.floor((now + MSK_OFFSET_MS) / DAY_MS) * DAY_MS - MSK_OFFSET_MS;

  const [total, today, week, fresh, inWork, stale] = await Promise.all([
    prisma.application.count(),
    prisma.application.count({ where: { createdAt: { gte: new Date(startOfDay) } } }),
    prisma.application.count({ where: { createdAt: { gte: new Date(now - 7 * DAY_MS) } } }),
    prisma.application.count({ where: { status: "new" } }),
    prisma.application.count({ where: { status: "in_progress" } }),
    prisma.application.count({
      where: { status: "new", createdAt: { lt: new Date(now - HOUR_MS) } },
    }),
  ]);

  const lines = [
    "<b>Сводка</b>",
    "",
    `Сегодня: ${today}`,
    `За 7 дней: ${week}`,
    `Всего: ${total}`,
    "",
    `Новых: ${fresh}`,
    `В работе: ${inWork}`,
  ];
  if (stale > 0) lines.push("", `<b>Новых дольше часа: ${stale}</b>`);

  return {
    text: lines.join("\n"),
    markup: {
      inline_keyboard: [
        [
          { text: "Новые", callback_data: "ls:n:0" },
          { text: "В работе", callback_data: "ls:w:0" },
        ],
      ],
    },
  };
}

async function searchView(query: string): Promise<View> {
  const q = query.trim().toLowerCase();
  let digits = q.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("8")) digits = digits.slice(1);
  if (digits.length === 11 && digits.startsWith("7")) digits = digits.slice(1);

  const recent = await prisma.application.findMany({
    orderBy: { createdAt: "desc" },
    take: SEARCH_SCAN_LIMIT,
  });

  const found = recent.filter((a) => {
    if (a.name.toLowerCase().includes(q)) return true;
    // Телефоны в базе в разном формате — сравниваем только цифры
    return digits.length >= 4 && a.phone.replace(/\D/g, "").includes(digits);
  });

  if (found.length === 0) {
    return { text: `По запросу «${escapeHtml(query.trim())}» ничего не найдено.` };
  }

  const shown = found.slice(0, PAGE_SIZE);
  return {
    text: `<b>Найдено: ${found.length}</b>${found.length > shown.length ? ` (показаны первые ${shown.length})` : ""}\n\nВыберите заявку:`,
    markup: {
      inline_keyboard: shown.map((item) => itemButton(item, "s:0", true)),
    },
  };
}

// Раздел «Доступ» (только владелец): люди с доступом и приглашение
async function accessView(): Promise<View> {
  const managers = await prisma.telegramUser.findMany({
    orderBy: { createdAt: "asc" },
  });

  const lines = [
    "<b>Доступ к боту</b>",
    "",
    "Владелец: вы",
    managers.length
      ? `Менеджеры (${managers.length}): нажмите на имя, чтобы отозвать доступ.`
      : "Менеджеров пока нет.",
  ];

  const rows = managers.map((m) => [
    {
      text: `Отозвать: ${m.name} (с ${formatDate(m.createdAt).split(",")[0]})`.slice(0, 60),
      callback_data: `rv:${m.id}`,
    },
  ]);
  rows.push([{ text: "Пригласить менеджера", callback_data: "iv" }]);

  return { text: lines.join("\n"), markup: { inline_keyboard: rows } };
}

async function createInviteLink(): Promise<string | null> {
  const username = process.env.TELEGRAM_BOT_USERNAME;
  if (!username) return null;

  // Заодно чистим старые использованные и просроченные приглашения
  await prisma.telegramInvite.deleteMany({
    where: { expiresAt: { lt: new Date(Date.now() - 7 * DAY_MS) } },
  });

  const token = randomBytes(16).toString("hex");
  await prisma.telegramInvite.create({
    data: { token, expiresAt: new Date(Date.now() + INVITE_TTL_MS) },
  });

  return `https://t.me/${username}?start=${INVITE_PREFIX}${token}`;
}

async function acceptInvite(
  chatId: number,
  from: TelegramFrom,
  token: string,
) {
  // Атомарно «сжигаем» приглашение: сработает только один раз
  const { count } = await prisma.telegramInvite.updateMany({
    where: { token, usedAt: null, expiresAt: { gt: new Date() } },
    data: { usedAt: new Date() },
  });

  if (count !== 1) {
    return sendMessage(chatId, "Приглашение недействительно или уже использовано.");
  }

  const name = displayName(from);
  await prisma.telegramUser.upsert({
    where: { chatId: String(from.id) },
    create: { chatId: String(from.id), name },
    update: { name },
  });

  const owner = process.env.TELEGRAM_CHAT_ID;
  if (owner) {
    await sendMessage(owner, `${escapeHtml(name)} получил(а) доступ к боту заявок.`);
  }

  return sendMessage(
    chatId,
    "Доступ выдан. Теперь сюда будут приходить новые заявки, а кнопки под полем ввода покажут списки, сводку и поиск.",
    menuKeyboard("manager"),
  );
}

const send = (chatId: string | number, view: View) =>
  sendMessage(chatId, view.text, view.markup);

const edit = (chatId: number, messageId: number, view: View) =>
  editMessage(chatId, messageId, view.text, view.markup);

const backFrom = (filter?: string, page?: string): KeyboardBack | undefined =>
  isFilter(filter) ? { filter, page: Number(page) || 0 } : undefined;

// --- Добавление заявки вручную -------------------------------------------

const DRAFT_TTL_MS = 15 * 60 * 1000;

const CANCEL_ROW = [{ text: "Отмена", callback_data: "ad:x" }];

const ADD_HINT = "Пример: /add Иван 89991234567 хочет кухню";

// Шаги диалога: name -> phone -> message -> confirm
const STEP_PROMPTS = {
  name: {
    text: "<b>Добавление заявки вручную</b>\n\nКак зовут клиента?",
    markup: { inline_keyboard: [CANCEL_ROW] },
  },
  phone: {
    text: "Телефон клиента (10–11 цифр):",
    markup: { inline_keyboard: [CANCEL_ROW] },
  },
  message: {
    text: "Комментарий: что нужно клиенту, откуда о нас узнал. Можно пропустить.",
    markup: {
      inline_keyboard: [
        [{ text: "Пропустить", callback_data: "ad:s" }],
        CANCEL_ROW,
      ],
    },
  },
} as const;

type ParsedManual =
  | { name: string; phone: string; message: string | null }
  | { error: string };

// «Иван 89991234567 хочет кухню» -> имя до телефона, комментарий после
export function parseManualText(text: string): ParsedManual {
  for (const match of text.matchAll(/\+?\d[\d\s().-]{8,}/g)) {
    const raw = match[0];
    const digits = raw.replace(/\D/g, "");
    // Российский номер: 11 цифр (7/8/+7), иначе 10; цифры комментария не берём
    const needed = /^\+?[78]/.test(raw) && digits.length >= 11 ? 11 : 10;
    if (digits.length < needed) continue;

    let seen = 0;
    let end = 0;
    for (let i = 0; i < raw.length; i++) {
      if (/\d/.test(raw[i]) && ++seen === needed) {
        end = i + 1;
        break;
      }
    }

    const start = match.index ?? 0;
    const name = text.slice(0, start).replace(/[\s,;:\-–—]+$/, "").trim();
    const message = text
      .slice(start + end)
      .replace(/^[\s,;:\-–—]+/, "")
      .trim();

    if (name.length < 2) {
      return { error: "Не нашёл имя: напишите его перед телефоном." };
    }
    if (name.length > 60) return { error: "Слишком длинное имя (до 60 символов)." };
    if (message.length > 500) {
      return { error: "Слишком длинный комментарий (до 500 символов)." };
    }
    return {
      name,
      phone: normalizePhone(raw.slice(0, end)),
      message: message || null,
    };
  }
  return { error: "Не нашёл телефон (нужно 10–11 цифр)." };
}

function confirmView(draft: {
  name: string;
  phone: string;
  message: string | null;
}): View {
  const lines = [
    "<b>Добавить заявку?</b>",
    "",
    `Имя: ${escapeHtml(draft.name)}`,
    `Телефон: ${escapeHtml(draft.phone)}`,
  ];
  if (draft.message) lines.push(`Комментарий: ${escapeHtml(draft.message)}`);

  return {
    text: lines.join("\n"),
    markup: {
      inline_keyboard: [
        [
          { text: "Создать: в работе", callback_data: "ad:w" },
          { text: "Создать: новая", callback_data: "ad:n" },
        ],
        CANCEL_ROW,
      ],
    },
  };
}

// Диалог: кнопка «Добавить заявку» -> имя -> телефон -> комментарий -> подтверждение
async function startAdd(chatId: number, userId: string) {
  await prisma.telegramDraft.upsert({
    where: { chatId: userId },
    create: { chatId: userId, step: "name" },
    update: { step: "name", name: null, phone: null, message: null },
  });
  return sendMessage(chatId, STEP_PROMPTS.name.text, STEP_PROMPTS.name.markup);
}

// Быстрый вариант одной строкой: /add Иван 89991234567 хочет кухню
async function processAddText(chatId: number, userId: string, text: string) {
  const parsed = parseManualText(text);
  if ("error" in parsed) {
    return sendMessage(chatId, `${parsed.error}

${ADD_HINT}`);
  }

  await prisma.telegramDraft.upsert({
    where: { chatId: userId },
    create: { chatId: userId, step: "confirm", ...parsed },
    update: { step: "confirm", ...parsed },
  });
  return send(chatId, confirmView(parsed));
}

// Телефон: российский (10–11 цифр) или международный с плюсом
function parsePhoneInput(text: string): string | null {
  const digits = text.replace(/D/g, "");
  const russian = digits.length === 10 || (digits.length === 11 && /^[78]/.test(digits));
  if (russian) return normalizePhone(text);
  if (text.trim().startsWith("+") && digits.length >= 10 && digits.length <= 15) {
    return text.trim();
  }
  return null;
}

interface DraftRow {
  step: string;
  name: string | null;
  phone: string | null;
}

// Ответ на очередной вопрос диалога
async function handleDraftAnswer(
  chatId: number,
  userId: string,
  draft: DraftRow,
  text: string,
) {
  if (draft.step === "name") {
    if (text.length < 2 || text.length > 60) {
      return sendMessage(chatId, "Имя должно быть от 2 до 60 символов. Напишите ещё раз:");
    }
    await prisma.telegramDraft.update({
      where: { chatId: userId },
      data: { step: "phone", name: text },
    });
    return sendMessage(chatId, STEP_PROMPTS.phone.text, STEP_PROMPTS.phone.markup);
  }

  if (draft.step === "phone") {
    const phone = parsePhoneInput(text);
    if (!phone) {
      return sendMessage(
        chatId,
        "Не похоже на телефон: нужно 10–11 цифр, например 89991234567. Напишите ещё раз:",
      );
    }
    await prisma.telegramDraft.update({
      where: { chatId: userId },
      data: { step: "message", phone },
    });
    return sendMessage(chatId, STEP_PROMPTS.message.text, STEP_PROMPTS.message.markup);
  }

  // step === "message"
  if (text.length > 500) {
    return sendMessage(chatId, "Слишком длинный комментарий (до 500 символов). Сократите:");
  }
  const updated = await prisma.telegramDraft.update({
    where: { chatId: userId },
    data: { step: "confirm", message: text },
  });
  return send(
    chatId,
    confirmView({
      name: updated.name ?? draft.name ?? "",
      phone: updated.phone ?? draft.phone ?? "",
      message: text,
    }),
  );
}

export interface IncomingMessage {
  chatId: number;
  from: TelegramFrom;
  text: string;
}

// Обычные сообщения из личного чата: кнопки меню, команды, поиск, приглашения
export async function handleMessage({ chatId, from, text }: IncomingMessage) {
  const trimmed = text.trim();
  const [head, arg] = trimmed.split(/\s+/);
  const command = head.startsWith("/") ? head.split("@")[0].toLowerCase() : null;

  const role = await getRole(String(from.id));

  if (!role) {
    if (command === "/start" && arg?.startsWith(INVITE_PREFIX)) {
      return acceptInvite(chatId, from, arg.slice(INVITE_PREFIX.length));
    }
    return sendMessage(chatId, "Доступ к боту только по приглашению.");
  }

  const key = command ?? trimmed;
  const userId = String(from.id);

  // Ручное добавление заявки: старт, отмена и приём текста
  if (key === MENU.add || command === "/add") {
    const inline = command === "/add" ? trimmed.slice(head.length).trim() : "";
    return inline
      ? processAddText(chatId, userId, inline)
      : startAdd(chatId, userId);
  }

  if (command === "/cancel") {
    await prisma.telegramDraft.deleteMany({ where: { chatId: userId } });
    return sendMessage(chatId, "Добавление заявки отменено.");
  }

  if (MENU_KEYS.has(key) || command) {
    // Любая кнопка меню или команда отменяет незаконченный черновик
    await prisma.telegramDraft.deleteMany({ where: { chatId: userId } });
  } else {
    const draft = await prisma.telegramDraft.findUnique({
      where: { chatId: userId },
    });
    // Идёт диалог добавления: текст — это ответ на текущий вопрос
    if (
      draft &&
      ["name", "phone", "message"].includes(draft.step) &&
      Date.now() - draft.updatedAt.getTime() < DRAFT_TTL_MS
    ) {
      return handleDraftAnswer(chatId, userId, draft, trimmed);
    }
  }

  if (command === "/start" || command === "/menu") {
    return sendMessage(
      chatId,
      "Меню заявок включено. Кнопки под полем ввода: списки заявок, сводка и поиск.",
      menuKeyboard(role),
    );
  }

  if (key === MENU.new || key === "/new") return send(chatId, await listView("n", 0));
  if (key === MENU.work || key === "/work") return send(chatId, await listView("w", 0));
  if (key === MENU.all || key === "/all") return send(chatId, await listView("a", 0));
  if (key === MENU.stats || key === "/stats") return send(chatId, await statsView());

  if (role === "owner" && (key === MENU.access || key === "/access")) {
    return send(chatId, await accessView());
  }

  if (key === MENU.search || key === "/search") {
    return sendMessage(
      chatId,
      "Напишите телефон (или его часть, от 4 цифр) либо имя клиента, и я найду заявки.",
    );
  }

  if (command) {
    return sendMessage(chatId, "Не знаю такую команду. Нажмите /start, чтобы включить меню.");
  }

  // Любой другой текст — поисковый запрос
  return send(chatId, await searchView(trimmed));
}

export interface IncomingCallback {
  id: string;
  data: string;
  from: TelegramFrom;
  message: { message_id: number; chat: { id: number } };
}

// Нажатия на inline-кнопки
export async function handleCallback(query: IncomingCallback) {
  const role = await getRole(String(query.from.id));
  if (!role) {
    await answerCallback(query.id, "Нет доступа");
    return;
  }

  const [kind, ...rest] = query.data.split(":");
  const chatId = query.message.chat.id;
  const messageId = query.message.message_id;
  const who = displayName(query.from);

  const ownerOnly = async () => {
    if (role === "owner") return false;
    await answerCallback(query.id, "Это действие доступно только владельцу");
    return true;
  };

  switch (kind) {
    // st:<id>:<status>[:<filter>:<page>] — смена статуса
    case "st": {
      const [id, status, filter, page] = rest;
      const isReset = status === "new";
      if (!id || !status || !(isReset || isButtonStatus(status))) break;

      const existing = await prisma.application.findUnique({ where: { id } });
      if (!existing) {
        await answerCallback(query.id, "Заявка не найдена (возможно, удалена)");
        return;
      }
      // «Вернуть в новые» снимает и отметку, кто взял заявку
      await prisma.application.update({
        where: { id },
        data: isReset
          ? { status, handledBy: null, handledAt: null }
          : { status, handledBy: who, handledAt: new Date() },
      });

      const note = isReset
        ? `Возвращена в новые — ${who}`
        : `${statusLabel(status)} — ${who}`;
      if (filter !== undefined) {
        // Карточка из списка/поиска
        const view = await cardView(id, role, backFrom(filter, page), note);
        if (view) await edit(chatId, messageId, view);
      } else {
        // Исходное уведомление о заявке
        const application = await prisma.application.findUnique({
          where: { id },
          include: { product: { select: { name: true } } },
        });
        if (application) {
          const app: ApplicationForTelegram = {
            id: application.id,
            name: application.name,
            phone: application.phone,
            message: application.message,
            productName: application.product?.name ?? null,
          };
          await editMessage(
            chatId,
            messageId,
            buildApplicationText(app, { statusNote: note }),
            buildKeyboard(app, status),
          );
        }
      }
      await answerCallback(query.id, `Статус: ${statusLabel(status)}`);
      return;
    }

    // ls:<filter>:<page> — список
    case "ls": {
      const [filter, page] = rest;
      if (isFilter(filter)) {
        await edit(chatId, messageId, await listView(filter, Number(page) || 0));
      }
      break;
    }

    // op:<id>:<filter>:<page> — открыть карточку
    case "op": {
      const [id, filter, page] = rest;
      const view = id ? await cardView(id, role, backFrom(filter, page)) : null;
      if (!view) {
        await answerCallback(query.id, "Заявка не найдена (возможно, удалена)");
        return;
      }
      await edit(chatId, messageId, view);
      break;
    }

    // dl:<id>:<filter>:<page> — запрос подтверждения удаления
    case "dl": {
      if (await ownerOnly()) return;
      const [id, filter, page] = rest;
      const application = id
        ? await prisma.application.findUnique({ where: { id } })
        : null;
      if (!id || !application) {
        await answerCallback(query.id, "Заявка не найдена (возможно, удалена)");
        return;
      }
      const ctx = `${filter ?? "s"}:${page ?? "0"}`;
      await editMessage(
        chatId,
        messageId,
        `<b>Удалить заявку?</b>\n\n${escapeHtml(application.name)}, ${escapeHtml(application.phone)}\n\nЭто действие необратимо.`,
        {
          inline_keyboard: [
            [
              { text: "Да, удалить", callback_data: `dy:${id}:${ctx}` },
              { text: "Отмена", callback_data: `op:${id}:${ctx}` },
            ],
          ],
        },
      );
      break;
    }

    // dy:<id>:<filter>:<page> — удаление подтверждено
    case "dy": {
      if (await ownerOnly()) return;
      const [id, filter, page] = rest;
      if (!id) break;
      await prisma.application.deleteMany({ where: { id } });

      if (isFilter(filter)) {
        await edit(chatId, messageId, await listView(filter, Number(page) || 0));
      } else {
        await editMessage(chatId, messageId, "Заявка удалена.");
      }
      await answerCallback(query.id, "Заявка удалена");
      return;
    }

    // ad:<w|n|x> — подтверждение (или отмена) ручной заявки из черновика
    case "ad": {
      const [action] = rest;
      const userId = String(query.from.id);
      const draft = await prisma.telegramDraft.findUnique({
        where: { chatId: userId },
      });

      if (action === "x") {
        await prisma.telegramDraft.deleteMany({ where: { chatId: userId } });
        await editMessage(chatId, messageId, "Добавление заявки отменено.");
        break;
      }

      const fresh = draft && Date.now() - draft.updatedAt.getTime() < DRAFT_TTL_MS;

      // «Пропустить» комментарий -> сразу к подтверждению
      if (action === "s" && draft && fresh && draft.step === "message" && draft.name && draft.phone) {
        await prisma.telegramDraft.update({
          where: { chatId: userId },
          data: { step: "confirm", message: null },
        });
        await edit(
          chatId,
          messageId,
          confirmView({ name: draft.name, phone: draft.phone, message: null }),
        );
        break;
      }

      if (!draft || !fresh || draft.step !== "confirm" || !draft.name || !draft.phone) {
        await editMessage(
          chatId,
          messageId,
          "Черновик устарел. Нажмите «Добавить заявку» и отправьте данные ещё раз.",
        );
        await answerCallback(query.id, "Черновик устарел");
        return;
      }

      const application = await createManualApplication({
        name: draft.name,
        phone: draft.phone,
        message: draft.message,
        status: action === "w" ? "in_progress" : "new",
        createdBy: who,
        excludeChatId: userId,
      });
      await prisma.telegramDraft.deleteMany({ where: { chatId: userId } });

      const view = await cardView(application.id, role);
      if (view) await edit(chatId, messageId, view);
      await answerCallback(query.id, "Заявка создана");
      return;
    }

    // ac — раздел «Доступ»
    case "ac": {
      if (await ownerOnly()) return;
      await edit(chatId, messageId, await accessView());
      break;
    }

    // iv — новое приглашение
    case "iv": {
      if (await ownerOnly()) return;
      const link = await createInviteLink();
      if (!link) {
        await answerCallback(query.id, "Не задан TELEGRAM_BOT_USERNAME в .env");
        return;
      }
      await sendMessage(
        chatId,
        `<b>Приглашение для менеджера</b>\n\nОтправьте эту ссылку человеку:\n${link}\n\nОна действует 24 часа и срабатывает один раз.`,
      );
      break;
    }

    // rv:<userId> — запрос подтверждения отзыва доступа
    case "rv": {
      if (await ownerOnly()) return;
      const [userId] = rest;
      const user = userId
        ? await prisma.telegramUser.findUnique({ where: { id: userId } })
        : null;
      if (!user) {
        await answerCallback(query.id, "Пользователь не найден");
        return;
      }
      await editMessage(
        chatId,
        messageId,
        `<b>Отозвать доступ?</b>\n\n${escapeHtml(user.name)} перестанет получать заявки и пользоваться ботом.`,
        {
          inline_keyboard: [
            [
              { text: "Да, отозвать", callback_data: `ry:${user.id}` },
              { text: "Отмена", callback_data: "ac" },
            ],
          ],
        },
      );
      break;
    }

    // ry:<userId> — отзыв подтверждён
    case "ry": {
      if (await ownerOnly()) return;
      const [userId] = rest;
      const user = userId
        ? await prisma.telegramUser.findUnique({ where: { id: userId } })
        : null;
      if (user) {
        await prisma.telegramUser.delete({ where: { id: user.id } });
        await telegramCall("sendMessage", {
          chat_id: user.chatId,
          text: "Доступ к боту заявок отозван.",
          reply_markup: { remove_keyboard: true },
        });
      }
      await edit(chatId, messageId, await accessView());
      await answerCallback(query.id, "Доступ отозван");
      return;
    }
  }

  await answerCallback(query.id);
}
