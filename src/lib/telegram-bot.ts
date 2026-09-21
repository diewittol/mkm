import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { createManualApplication } from "@/lib/manual-application";
import { parsePhone } from "@/lib/phone";
import { groupNotes } from "@/lib/note-groups";
import { formatRub, parsePrice } from "@/lib/money";
import { monthlyStats, periodStats, type Totals } from "@/lib/order-stats";
import {
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
  generatePassword,
  isValidNewPassword,
  setAdminPassword,
} from "@/lib/admin-password";
import { addApplicationNote, deleteApplicationWithFiles, deleteNoteGroup } from "@/lib/order-notes";
import { MAX_PHOTO_BYTES, readOrderFile, sniffAudio } from "@/lib/order-files";
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
  downloadTelegramFile,
  reactToMessage,
  sendPhotoAlbum,
  sendAudioFile,
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
  money: "Суммы",
} as const;

const MENU_KEYS = new Set<string>(Object.values(MENU));

function menuKeyboard(role: Role) {
  const rows = [
    [{ text: MENU.new }, { text: MENU.work }],
    [{ text: MENU.all }, { text: MENU.stats }],
    [
      { text: MENU.search },
      ...(role === "owner" ? [{ text: MENU.money }, { text: MENU.access }] : []),
    ],
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
    include: {
      product: { select: { name: true } },
      _count: { select: { notes: true } },
    },
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
      price: role === "owner" ? application.price : undefined,
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
      notesCount: application._count.notes,
      price: role === "owner" ? application.price : undefined,
    }),
  };
}

const formatDuration = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

// Лента заметок заявки. Всё, что добавлено за один сеанс (текст, фото, голосовые),
// показывается как одна заметка.
const NOTES_SHOWN = 6;
const NOTE_PREVIEW_CHARS = 300;
const NOTES_DELETE_LIST = 10;

const ctxOf = (back?: KeyboardBack) => (back ? `:${back.filter}:${back.page}` : ":s:0");

interface NoteRow {
  id: string;
  batchId: string | null;
  author: string;
  text: string | null;
  photo: string | null;
  audio: string | null;
  audioSeconds: number | null;
  createdAt: Date;
}

// «Куда дальше»: кнопки под просмотром, после сохранения, после альбома и т.п.
function noteNavRows(id: string, back: KeyboardBack | undefined, withNotes = true) {
  const ctx = ctxOf(back);
  const row: { text: string; callback_data: string }[] = [];
  if (withNotes) row.push({ text: "К заметкам", callback_data: `nt:${id}${ctx}` });
  row.push({ text: "К заказу", callback_data: `op:${id}${ctx}` });

  const rows = [row];
  if (back) {
    rows.push([{ text: "К списку", callback_data: `ls:${back.filter}:${back.page}` }]);
  }
  return rows;
}

// Краткое содержимое заметки: тексты, число фото, голосовые
function summarizeNotes(notes: NoteRow[]) {
  const texts = notes.map((n) => n.text).filter((t): t is string => !!t);
  const photos = notes.filter((n) => n.photo).length;
  const voices = notes.filter((n) => n.audio);
  const marks: string[] = [];
  if (photos > 0) marks.push(`[фото: ${photos}]`);
  for (const voice of voices) {
    marks.push(
      `[голосовое${voice.audioSeconds ? ` ${formatDuration(voice.audioSeconds)}` : ""}]`,
    );
  }
  return { texts, marks };
}

async function notesView(id: string, back?: KeyboardBack): Promise<View | null> {
  const application = await prisma.application.findUnique({
    where: { id },
    select: { name: true, phone: true },
  });
  if (!application) return null;

  const all = await prisma.applicationNote.findMany({
    where: { applicationId: id },
    orderBy: { createdAt: "asc" },
  });
  const groups = groupNotes(all);
  const shown = groups.slice(-NOTES_SHOWN);
  const photos = all.filter((n) => n.photo).length;
  const voices = all.filter((n) => n.audio).length;

  const lines = [
    `<b>Заметки: ${escapeHtml(application.name)}, ${escapeHtml(application.phone)}</b>`,
    "",
  ];

  if (groups.length === 0) {
    lines.push("Пока пусто. Нажмите «Добавить заметку» и присылайте размеры, пожелания, фото и голосовые.");
  } else {
    if (groups.length > shown.length) {
      lines.push(`Показаны последние ${shown.length} из ${groups.length}. Вся лента: в админке.`, "");
    }
    for (const group of shown) {
      const first = group.notes[0];
      const { texts, marks } = summarizeNotes(group.notes);
      const text = texts.join("\n");
      const preview = escapeHtml(
        text.length > NOTE_PREVIEW_CHARS ? `${text.slice(0, NOTE_PREVIEW_CHARS)}…` : text,
      );
      const body = [preview, marks.join(" ")].filter(Boolean).join("\n");
      lines.push(`<i>${formatDate(first.createdAt)} ${escapeHtml(first.author)}</i>\n${body}`, "");
    }
  }

  const ctx = ctxOf(back);
  const rows: { text: string; callback_data: string }[][] = [
    [{ text: "Добавить заметку", callback_data: `na:${id}${ctx}` }],
  ];
  if (photos > 0) {
    rows.push([{ text: `Показать фото (${photos})`, callback_data: `np:${id}${ctx}` }]);
  }
  if (voices > 0) {
    rows.push([{ text: `Прослушать голосовые (${voices})`, callback_data: `nv:${id}${ctx}` }]);
  }
  if (groups.length > 0) {
    rows.push([{ text: "Удалить заметку", callback_data: `nx:${id}${ctx}` }]);
  }
  rows.push(...noteNavRows(id, back, false));

  return { text: lines.join("\n").trim(), markup: { inline_keyboard: rows } };
}

// Записи одной заметки по ключу группы (B<batchId> или N<id записи>)
async function findNoteGroup(key: string | undefined) {
  const value = key?.slice(1);
  if (!key || !value) return [];
  if (key[0] === "B") {
    return prisma.applicationNote.findMany({
      where: { batchId: value },
      orderBy: { createdAt: "asc" },
    });
  }
  if (key[0] === "N") {
    return prisma.applicationNote.findMany({ where: { id: value } });
  }
  return [];
}

// Выбор заметки для удаления
async function deleteListView(id: string, back?: KeyboardBack): Promise<View | null> {
  const all = await prisma.applicationNote.findMany({
    where: { applicationId: id },
    orderBy: { createdAt: "asc" },
  });
  const groups = groupNotes(all).slice(-NOTES_DELETE_LIST).reverse();
  const ctx = ctxOf(back);

  if (groups.length === 0) return notesView(id, back);

  const rows = groups.map((group) => {
    const { texts, marks } = summarizeNotes(group.notes);
    const label = [formatDate(group.notes[0].createdAt), texts[0]?.slice(0, 30), marks.join(" ")]
      .filter(Boolean)
      .join(" · ");
    return [{ text: label.slice(0, 60), callback_data: `nq:${group.key}${ctx}` }];
  });
  rows.push([{ text: "Назад", callback_data: `nt:${id}${ctx}` }]);

  return {
    text: "<b>Какую заметку удалить?</b>\n\nПоказаны последние. Удаляется вся заметка целиком (текст, фото и голосовые).",
    markup: { inline_keyboard: rows },
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

// --- Суммы по заказам (только владелец) -------------------------------------

const monthName = (year: number, month: number) =>
  `${new Date(Date.UTC(year, month, 1)).toLocaleString("ru-RU", { month: "long", timeZone: "UTC" })} ${year}`;

function totalsLines(totals: Totals): string[] {
  if (totals.count === 0) return ["Заявок нет"];

  const lines = [
    `Заявок: ${totals.count}${
      totals.priced < totals.count ? ` (без стоимости: ${totals.count - totals.priced})` : ""
    }`,
  ];
  if (totals.priced > 0) {
    const average = Math.round(totals.sum / totals.priced);
    lines.push(`Сумма: <b>${formatRub(totals.sum)}</b>, средний чек ${formatRub(average)}`);
    lines.push(`Выполнено: ${totals.doneCount} на ${formatRub(totals.doneSum)}`);
  }
  return lines;
}

async function moneyRows() {
  return prisma.application.findMany({
    where: { status: { not: "rejected" } },
    select: { createdAt: true, status: true, price: true },
  });
}

async function moneyView(): Promise<View> {
  const now = new Date();
  const stats = periodStats(await moneyRows(), now);
  const mskNow = new Date(now.getTime() + MSK_OFFSET_MS);
  const currentYear = mskNow.getUTCFullYear();
  const currentMonth = mskNow.getUTCMonth();
  const prev = new Date(Date.UTC(currentYear, currentMonth - 1, 1));

  const block = (title: string, totals: Totals) => [`<b>${title}</b>`, ...totalsLines(totals), ""];

  const lines = [
    "<b>Стоимость заказов</b>",
    "<i>По дате заявки, без отклонённых. «Выполнено»: статус «Обработана».</i>",
    "",
    ...block("Сегодня", stats.today),
    ...block(`Этот месяц (${monthName(currentYear, currentMonth)})`, stats.month),
    ...block(
      `Прошлый месяц (${monthName(prev.getUTCFullYear(), prev.getUTCMonth())})`,
      stats.prevMonth,
    ),
    ...block(`С начала года (${currentYear})`, stats.year),
    ...block("За всё время", stats.all),
  ];

  return {
    text: lines.join("\n").trim(),
    markup: { inline_keyboard: [[{ text: "По месяцам", callback_data: "mm" }]] },
  };
}

async function monthsView(): Promise<View> {
  const months = monthlyStats(await moneyRows(), new Date(), 12).filter(
    (m) => m.totals.count > 0,
  );

  const lines = ["<b>Суммы по месяцам</b>", "<i>Последние 12 месяцев, по дате заявки.</i>", ""];
  if (months.length === 0) {
    lines.push("Заявок нет.");
  }
  for (const { year, month, totals } of months) {
    const sum = totals.priced > 0 ? `${formatRub(totals.sum)}` : "без стоимости";
    const done = totals.priced > 0 ? `, выполнено ${formatRub(totals.doneSum)}` : "";
    lines.push(`<b>${monthName(year, month)}</b>: ${totals.count} заявок, ${sum}${done}`);
  }

  return {
    text: lines.join("\n"),
    markup: { inline_keyboard: [[{ text: "Назад", callback_data: "fm" }]] },
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
  rows.push([{ text: "Пароль админки", callback_data: "pw" }]);

  return { text: lines.join("\n"), markup: { inline_keyboard: rows } };
}

// Раздел «Пароль админки» (только владелец)
const PASSWORD_TTL_MS = 5 * 60 * 1000;
const PRICE_TTL_MS = 10 * 60 * 1000;

async function passwordView(): Promise<View> {
  const credential = await prisma.adminCredential.findUnique({ where: { id: "singleton" } });
  const state = credential
    ? `Пароль задан через бота: ${formatDate(credential.updatedAt)}${
        credential.changedBy ? ` (${escapeHtml(credential.changedBy)})` : ""
      }.`
    : "Сейчас действует пароль из настроек сервера.";

  return {
    text: [
      "<b>Пароль админки</b>",
      "",
      state,
      "Сам пароль бот не хранит и показать его не может. Если забыли: сгенерируйте новый и сохраните в менеджере паролей.",
    ].join("\n"),
    markup: {
      inline_keyboard: [
        [{ text: "Сгенерировать новый", callback_data: "pg" }],
        [{ text: "Задать свой", callback_data: "ps" }],
        [{ text: "Назад", callback_data: "ac" }],
      ],
    },
  };
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
    const phone = parsePhone(raw.slice(0, end));
    if (!phone) return { error: "Это не похоже на номер телефона." };

    return { name, phone, message: message || null };
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
    const phone = parsePhone(text);
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
  messageId: number;
  from: TelegramFrom;
  text?: string;
  caption?: string;
  photoFileId?: string;
  photoSize?: number;
  audioFileId?: string;
  audioSize?: number;
  audioSeconds?: number;
  // Вложение, которое бот пока не принимает (видео, голосовое, не-картинка)
  unsupported?: boolean;
}

// --- Заметки и фото внутри заявки ----------------------------------------

const NOTE_TTL_MS = 30 * 60 * 1000;

// Режим «заметки»: к какой заявке сейчас добавляются текст и фото
async function activeNoteDraft(userId: string) {
  const draft = await prisma.telegramDraft.findUnique({ where: { chatId: userId } });
  const fresh = draft && Date.now() - draft.updatedAt.getTime() < NOTE_TTL_MS;
  return draft && fresh && draft.step === "note" && draft.applicationId ? draft : null;
}

// Тихое подтверждение (реакция); если её поставить нельзя — короткий ответ
async function acknowledge(chatId: number, messageId: number) {
  if (!(await reactToMessage(chatId, messageId))) {
    await sendMessage(chatId, "Добавлено.");
  }
}

async function saveNoteFromChat(
  msg: IncomingMessage,
  userId: string,
  applicationId: string,
  batchId: string | null,
  text: string | undefined,
) {
  const { chatId, from } = msg;

  // Вложение: фото или голосовое — скачиваем у Telegram
  const fileId = msg.photoFileId ?? msg.audioFileId;
  const fileSize = msg.photoFileId ? msg.photoSize : msg.audioSize;
  const isAudio = !msg.photoFileId && !!msg.audioFileId;

  let photo: Buffer | null = null;
  let audio: Buffer | null = null;
  if (fileId) {
    if (fileSize && fileSize > MAX_PHOTO_BYTES) {
      return sendMessage(chatId, "Файл больше 10 МБ. Отправьте поменьше.");
    }
    const downloaded = await downloadTelegramFile(fileId, MAX_PHOTO_BYTES);
    if (!downloaded.ok) {
      return sendMessage(
        chatId,
        downloaded.reason === "too_large"
          ? "Файл больше 10 МБ. Отправьте поменьше."
          : "Не удалось получить файл от Telegram, отправьте ещё раз.",
      );
    }
    if (isAudio) {
      audio = downloaded.data;
    } else {
      photo = downloaded.data;
    }
  }

  try {
    await addApplicationNote({
      applicationId,
      author: displayName(from),
      text,
      photo,
      audio,
      audioSeconds: audio ? (msg.audioSeconds ?? null) : null,
      batchId,
    });
  } catch {
    return sendMessage(
      chatId,
      isAudio
        ? "Не удалось сохранить. Поддерживаются голосовые и аудио OGG, MP3, M4A; проверьте и то, что заявку не удалили."
        : "Не удалось сохранить. Проверьте, что это фото (JPG, PNG, WEBP), и что заявку не удалили.",
    );
  }

  // Продлеваем режим заметок: пока идёт поток фото, он не «протухнет»
  await prisma.telegramDraft.update({
    where: { chatId: userId },
    data: { step: "note" },
  });
  return acknowledge(chatId, msg.messageId);
}

// Обычные сообщения из личного чата: кнопки меню, команды, поиск,
// приглашения, диалог добавления заявки и заметки с фото
export async function handleMessage(msg: IncomingMessage) {
  const { chatId, from } = msg;
  const trimmed = (msg.text ?? "").trim();
  const [head = "", arg] = trimmed.split(/\s+/);
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

  // Вложения: фото (или картинка-файл) идёт в заметки открытой заявки
  if (msg.photoFileId || msg.audioFileId || msg.unsupported) {
    const noteDraft = await activeNoteDraft(userId);
    if (!noteDraft?.applicationId) {
      return sendMessage(
        chatId,
        "Чтобы прикрепить фото или голосовое к заказу, откройте заявку, нажмите «Заметки и фото», затем «Добавить».",
      );
    }
    if (!msg.photoFileId && !msg.audioFileId) {
      return sendMessage(chatId, "Пока принимаю текст, фото и голосовые (видео и прочее — нет).");
    }
    return saveNoteFromChat(
      msg,
      userId,
      noteDraft.applicationId,
      noteDraft.noteBatch,
      msg.caption?.trim(),
    );
  }

  if (!trimmed) return;

  // Ручное добавление заявки: старт, отмена и приём текста
  if (key === MENU.add || command === "/add") {
    const inline = command === "/add" ? trimmed.slice(head.length).trim() : "";
    return inline
      ? processAddText(chatId, userId, inline)
      : startAdd(chatId, userId);
  }

  if (command === "/cancel") {
    await prisma.telegramDraft.deleteMany({ where: { chatId: userId } });
    return sendMessage(chatId, "Отменено.");
  }

  if (MENU_KEYS.has(key) || command) {
    // Любая кнопка меню или команда отменяет незаконченный черновик
    await prisma.telegramDraft.deleteMany({ where: { chatId: userId } });
  } else {
    const draft = await prisma.telegramDraft.findUnique({
      where: { chatId: userId },
    });
    // Владелец вводит стоимость заказа
    if (
      role === "owner" &&
      draft?.step === "price" &&
      draft.applicationId &&
      Date.now() - draft.updatedAt.getTime() < PRICE_TTL_MS
    ) {
      const price = parsePrice(trimmed);
      if (price === undefined) {
        return sendMessage(
          chatId,
          "Не понял сумму. Отправьте число в рублях, например 120000. «0» убирает стоимость, /cancel отменяет.",
        );
      }
      const updated = await prisma.application.updateMany({
        where: { id: draft.applicationId },
        data: { price: price || null },
      });
      await prisma.telegramDraft.deleteMany({ where: { chatId: userId } });
      if (updated.count === 0) return sendMessage(chatId, "Заявка не найдена (возможно, удалена).");

      const view = await cardView(draft.applicationId, role);
      if (view) await send(chatId, view);
      return;
    }

    // Владелец вводит свой пароль админки
    if (
      role === "owner" &&
      draft?.step === "password" &&
      Date.now() - draft.updatedAt.getTime() < PASSWORD_TTL_MS
    ) {
      // Сообщение с паролем не должно оставаться в чате
      await telegramCall("deleteMessage", { chat_id: chatId, message_id: msg.messageId });
      const password = msg.text ?? "";
      if (!isValidNewPassword(password)) {
        return sendMessage(
          chatId,
          `Пароль должен быть от ${MIN_PASSWORD_LENGTH} до ${MAX_PASSWORD_LENGTH} символов. Отправьте другой или /cancel.`,
        );
      }
      await setAdminPassword(password, displayName(from));
      await prisma.telegramDraft.deleteMany({ where: { chatId: userId } });
      return sendMessage(chatId, "Пароль админки изменён. Ваше сообщение с паролем удалено из чата.");
    }

    // Идёт диалог добавления: текст — это ответ на текущий вопрос
    if (
      draft &&
      ["name", "phone", "message"].includes(draft.step) &&
      Date.now() - draft.updatedAt.getTime() < DRAFT_TTL_MS
    ) {
      return handleDraftAnswer(chatId, userId, draft, trimmed);
    }
    // Открыт режим заметок: текст добавляется в ленту заявки
    if (
      draft?.step === "note" &&
      draft.applicationId &&
      Date.now() - draft.updatedAt.getTime() < NOTE_TTL_MS
    ) {
      return saveNoteFromChat(msg, userId, draft.applicationId, draft.noteBatch, trimmed);
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

  if (role === "owner" && (key === MENU.money || key === "/money")) {
    return send(chatId, await moneyView());
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
      await deleteApplicationWithFiles(id);

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

    // nt:<id>:<filter>:<page> — лента заметок заявки
    case "nt": {
      const [id, filter, page] = rest;
      const view = id ? await notesView(id, backFrom(filter, page)) : null;
      if (!view) {
        await answerCallback(query.id, "Заявка не найдена (возможно, удалена)");
        return;
      }
      await edit(chatId, messageId, view);
      break;
    }

    // na:<id>:<filter>:<page> — начать заметку: всё присланное до «Сохранить» станет одной заметкой
    case "na": {
      const [id, filter, page] = rest;
      const application = id
        ? await prisma.application.findUnique({ where: { id }, select: { name: true } })
        : null;
      if (!id || !application) {
        await answerCallback(query.id, "Заявка не найдена (возможно, удалена)");
        return;
      }
      const userId = String(query.from.id);
      const noteBatch = randomBytes(12).toString("hex");
      await prisma.telegramDraft.upsert({
        where: { chatId: userId },
        create: { chatId: userId, step: "note", applicationId: id, noteBatch },
        update: {
          step: "note",
          applicationId: id,
          noteBatch,
          name: null,
          phone: null,
          message: null,
        },
      });
      const ctx = ctxOf(backFrom(filter, page));
      await sendMessage(
        chatId,
        `<b>Новая заметка: ${escapeHtml(application.name)}</b>

Присылайте текст, фото и голосовые. Всё, что пришлёте, соберётся в одну заметку. Фото лучше отправлять «как файл» (скрепка, затем Файл): так они не теряют чёткость.

Когда закончите, нажмите «Сохранить». «Отмена» удалит всё, что вы прислали в эту заметку.`,
        {
          inline_keyboard: [
            [
              { text: "Сохранить", callback_data: `ns:${id}${ctx}` },
              { text: "Отмена", callback_data: `nc:${id}${ctx}` },
            ],
          ],
        },
      );
      break;
    }

    // ns:<id>:<filter>:<page> (и старое nd) — сохранить заметку и выйти из режима заметок
    case "ns":
    case "nd": {
      const [idArg, filter, page] = rest;
      const userId = String(query.from.id);
      const draft = await prisma.telegramDraft.findUnique({ where: { chatId: userId } });
      const noteDraft = draft?.step === "note" ? draft : null;
      const id = idArg || noteDraft?.applicationId || null;

      const saved =
        noteDraft?.noteBatch && noteDraft.applicationId === id
          ? await prisma.applicationNote.findMany({ where: { batchId: noteDraft.noteBatch } })
          : [];
      if (noteDraft) await prisma.telegramDraft.deleteMany({ where: { chatId: userId } });

      let text: string;
      if (saved.length > 0) {
        const { texts, marks } = summarizeNotes(saved);
        text = ["<b>Заметка сохранена</b>", texts.length ? `Текст: ${texts.length}` : "", marks.join(" ")]
          .filter(Boolean)
          .join("\n");
      } else if (noteDraft) {
        text = "Ничего не добавлено. Заметка не создана.";
      } else {
        text = "Заметка уже сохранена (или режим заметок закрыт).";
      }

      const rows = id ? noteNavRows(id, backFrom(filter, page)) : [];
      await editMessage(chatId, messageId, text, { inline_keyboard: rows });
      await answerCallback(query.id, saved.length > 0 ? "Сохранено" : undefined);
      return;
    }

    // nc:<id>:<filter>:<page> — отменить заметку: удалить всё присланное за сеанс
    case "nc": {
      const [id, filter, page] = rest;
      const userId = String(query.from.id);
      const draft = await prisma.telegramDraft.findUnique({ where: { chatId: userId } });

      let removed = false;
      if (draft?.step === "note" && draft.applicationId === id && draft.noteBatch) {
        removed = (await deleteNoteGroup(`B${draft.noteBatch}`)) !== null;
      }
      if (draft?.step === "note") {
        await prisma.telegramDraft.deleteMany({ where: { chatId: userId } });
      }

      const rows = id ? noteNavRows(id, backFrom(filter, page)) : [];
      await editMessage(
        chatId,
        messageId,
        removed ? "Отменено. Присланное в эту заметку удалено." : "Отменено. Ничего не сохранено.",
        { inline_keyboard: rows },
      );
      await answerCallback(query.id);
      return;
    }

    // nx:<id>:<filter>:<page> — выбрать заметку для удаления
    case "nx": {
      const [id, filter, page] = rest;
      const view = id ? await deleteListView(id, backFrom(filter, page)) : null;
      if (!view) {
        await answerCallback(query.id, "Заявка не найдена (возможно, удалена)");
        return;
      }
      await edit(chatId, messageId, view);
      break;
    }

    // nq:<группа>:<filter>:<page> — подтверждение удаления заметки
    case "nq": {
      const [key, filter, page] = rest;
      const notes = await findNoteGroup(key);
      if (notes.length === 0) {
        await answerCallback(query.id, "Заметка уже удалена");
        return;
      }
      const id = notes[0].applicationId;
      const ctx = ctxOf(backFrom(filter, page));
      const { texts, marks } = summarizeNotes(notes);
      const preview = escapeHtml(texts.join("\n").slice(0, NOTE_PREVIEW_CHARS));
      await edit(chatId, messageId, {
        text: [
          "<b>Удалить эту заметку?</b>",
          `<i>${formatDate(notes[0].createdAt)} ${escapeHtml(notes[0].author)}</i>`,
          [preview, marks.join(" ")].filter(Boolean).join("\n"),
          "Вернуть её будет нельзя.",
        ].join("\n\n"),
        markup: {
          inline_keyboard: [
            [
              { text: "Да, удалить", callback_data: `nz:${key}${ctx}` },
              { text: "Отмена", callback_data: `nx:${id}${ctx}` },
            ],
          ],
        },
      });
      break;
    }

    // nz:<группа>:<filter>:<page> — удалить заметку
    case "nz": {
      const [key, filter, page] = rest;
      const id = await deleteNoteGroup(key);
      if (!id) {
        await answerCallback(query.id, "Заметка уже удалена");
        return;
      }
      const view = await notesView(id, backFrom(filter, page));
      if (view) await edit(chatId, messageId, view);
      await answerCallback(query.id, "Заметка удалена");
      return;
    }

    // np:<id>:<filter>:<page> — прислать фото заявки альбомом
    case "np": {
      const [id, filter, page] = rest;
      const notes = id
        ? await prisma.applicationNote.findMany({
            where: { applicationId: id, photo: { not: null } },
            orderBy: { createdAt: "desc" },
            take: 10,
          })
        : [];
      const files = (
        await Promise.all(
          notes.reverse().map(async (note) => {
            const data = note.photo ? await readOrderFile(note.photo) : null;
            return data
              ? {
                  data,
                  caption: [`${formatDate(note.createdAt)} ${note.author}`, note.text]
                    .filter(Boolean)
                    .join(": "),
                }
              : null;
          }),
        )
      ).filter((item): item is { data: Buffer; caption: string } => item !== null);

      if (files.length === 0 || !id) {
        await answerCallback(query.id, "Фото не найдены");
        return;
      }
      await sendPhotoAlbum(chatId, files);
      await sendMessage(chatId, "Что дальше?", {
        inline_keyboard: noteNavRows(id, backFrom(filter, page)),
      });
      break;
    }

    // nv:<id>:<filter>:<page> — прислать голосовые заявки (последние 5)
    case "nv": {
      const [id, filter, page] = rest;
      const voices = id
        ? await prisma.applicationNote.findMany({
            where: { applicationId: id, audio: { not: null } },
            orderBy: { createdAt: "desc" },
            take: 5,
          })
        : [];

      let sent = 0;
      for (const note of voices.reverse()) {
        const data = note.audio ? await readOrderFile(note.audio) : null;
        const kind = data ? sniffAudio(data) : null;
        if (!data || !kind) continue;

        await sendAudioFile(chatId, {
          data,
          kind,
          caption: [`${formatDate(note.createdAt)} ${note.author}`, note.text]
            .filter(Boolean)
            .join(": "),
        });
        sent++;
      }

      if (sent === 0 || !id) {
        await answerCallback(query.id, "Голосовые не найдены");
        return;
      }
      await sendMessage(chatId, "Что дальше?", {
        inline_keyboard: noteNavRows(id, backFrom(filter, page)),
      });
      break;
    }

    // pw — раздел «Пароль админки»
    case "pw": {
      if (await ownerOnly()) return;
      await prisma.telegramDraft.deleteMany({
        where: { chatId: String(query.from.id), step: "password" },
      });
      await edit(chatId, messageId, await passwordView());
      break;
    }

    // pg — подтверждение генерации нового пароля
    case "pg": {
      if (await ownerOnly()) return;
      await editMessage(
        chatId,
        messageId,
        "<b>Сгенерировать новый пароль?</b>\n\nСтарый пароль перестанет работать. Те, кто уже вошёл в админку, останутся в системе.",
        {
          inline_keyboard: [
            [
              { text: "Да, сгенерировать", callback_data: "py" },
              { text: "Отмена", callback_data: "pw" },
            ],
          ],
        },
      );
      break;
    }

    // py — сгенерировать и сохранить новый пароль
    case "py": {
      if (await ownerOnly()) return;
      const password = generatePassword();
      await setAdminPassword(password, who);
      await editMessage(
        chatId,
        messageId,
        `<b>Новый пароль админки</b>\n\n<code>${password}</code>\n\nНажмите на пароль, чтобы скопировать. Сохраните его в менеджере паролей и нажмите «Скрыть», чтобы убрать сообщение из чата.`,
        { inline_keyboard: [[{ text: "Скрыть сообщение", callback_data: "ph" }]] },
      );
      await answerCallback(query.id, "Пароль изменён");
      return;
    }

    // ps — ввести свой пароль следующим сообщением
    case "ps": {
      if (await ownerOnly()) return;
      const userId = String(query.from.id);
      await prisma.telegramDraft.upsert({
        where: { chatId: userId },
        create: { chatId: userId, step: "password" },
        update: {
          step: "password",
          name: null,
          phone: null,
          message: null,
          applicationId: null,
          noteBatch: null,
        },
      });
      await editMessage(
        chatId,
        messageId,
        `<b>Свой пароль</b>\n\nОтправьте новый пароль следующим сообщением (от ${MIN_PASSWORD_LENGTH} до ${MAX_PASSWORD_LENGTH} символов). Я сразу удалю это сообщение из чата.`,
        { inline_keyboard: [[{ text: "Отмена", callback_data: "pw" }]] },
      );
      break;
    }

    // ph — убрать сообщение с паролем из чата
    case "ph": {
      if (await ownerOnly()) return;
      await telegramCall("deleteMessage", { chat_id: chatId, message_id: messageId });
      await answerCallback(query.id, "Сообщение удалено");
      return;
    }

    // fm — суммы по заказам
    case "fm": {
      if (await ownerOnly()) return;
      await edit(chatId, messageId, await moneyView());
      break;
    }

    // mm — суммы по месяцам
    case "mm": {
      if (await ownerOnly()) return;
      await edit(chatId, messageId, await monthsView());
      break;
    }

    // pr:<id>:<filter>:<page> — ввести стоимость заказа следующим сообщением
    case "pr": {
      if (await ownerOnly()) return;
      const [id, filter, page] = rest;
      const application = id
        ? await prisma.application.findUnique({
            where: { id },
            select: { name: true, price: true },
          })
        : null;
      if (!id || !application) {
        await answerCallback(query.id, "Заявка не найдена (возможно, удалена)");
        return;
      }
      const userId = String(query.from.id);
      await prisma.telegramDraft.upsert({
        where: { chatId: userId },
        create: { chatId: userId, step: "price", applicationId: id },
        update: {
          step: "price",
          applicationId: id,
          noteBatch: null,
          name: null,
          phone: null,
          message: null,
        },
      });
      await sendMessage(
        chatId,
        `<b>Стоимость: ${escapeHtml(application.name)}</b>\n\n${
          application.price ? `Сейчас: ${formatRub(application.price)}.\n\n` : ""
        }Отправьте сумму в рублях, например 120000 или 120 000. Чтобы убрать стоимость, отправьте «0».`,
        {
          inline_keyboard: [
            [{ text: "Отмена", callback_data: `px:${id}${ctxOf(backFrom(filter, page))}` }],
          ],
        },
      );
      break;
    }

    // px:<id>:<filter>:<page> — отмена ввода стоимости, назад к карточке
    case "px": {
      if (await ownerOnly()) return;
      const [id, filter, page] = rest;
      await prisma.telegramDraft.deleteMany({
        where: { chatId: String(query.from.id), step: "price" },
      });
      const view = id ? await cardView(id, role, backFrom(filter, page)) : null;
      if (view) await edit(chatId, messageId, view);
      else await editMessage(chatId, messageId, "Отменено.");
      break;
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
