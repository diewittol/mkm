import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
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
} as const;

function menuKeyboard(role: Role) {
  const rows = [
    [{ text: MENU.new }, { text: MENU.work }],
    [{ text: MENU.all }, { text: MENU.stats }],
    [{ text: MENU.search }, ...(role === "owner" ? [{ text: MENU.access }] : [])],
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

const displayName = (from: TelegramFrom) =>
  from.username
    ? `@${from.username}`
    : [from.first_name, from.last_name].filter(Boolean).join(" ").trim() ||
      "без имени";

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
}

function itemButton(item: ListItem, back: string, showStatus: boolean) {
  const parts = [item.name, item.phone, ago(item.createdAt)];
  if (showStatus) parts.push(statusLabel(item.status));
  return [
    {
      text: parts.join(" · ").slice(0, 60),
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
      title: `Заявка от ${formatDate(application.createdAt)}`,
      statusNote: note ?? `Статус: ${statusLabel(application.status)}`,
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
      if (!id || !status || !isButtonStatus(status)) break;

      const existing = await prisma.application.findUnique({ where: { id } });
      if (!existing) {
        await answerCallback(query.id, "Заявка не найдена (возможно, удалена)");
        return;
      }
      await prisma.application.update({ where: { id }, data: { status } });

      const note = `${statusLabel(status)} — ${who}`;
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
