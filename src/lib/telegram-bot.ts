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
  type ApplicationForTelegram,
  type KeyboardBack,
} from "@/lib/telegram";

type ListFilter = "n" | "w" | "a";

const PAGE_SIZE = 10;
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const MSK_OFFSET_MS = 3 * HOUR_MS;
const SEARCH_SCAN_LIMIT = 500;

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
} as const;

const MENU_KEYBOARD = {
  keyboard: [
    [{ text: MENU.new }, { text: MENU.work }],
    [{ text: MENU.all }, { text: MENU.stats }],
    [{ text: MENU.search }],
  ],
  resize_keyboard: true,
  is_persistent: true,
};

interface View {
  text: string;
  markup?: unknown;
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
    markup: buildKeyboard(app, application.status, { card: true, back }),
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

const send = (chatId: string | number, view: View) =>
  sendMessage(chatId, view.text, view.markup);

const edit = (chatId: number, messageId: number, view: View) =>
  editMessage(chatId, messageId, view.text, view.markup);

const backFrom = (filter?: string, page?: string): KeyboardBack | undefined =>
  isFilter(filter) ? { filter, page: Number(page) || 0 } : undefined;

// Обычные сообщения из чата: кнопки меню, команды и поиск
export async function handleMessage(chatId: number, text: string) {
  const trimmed = text.trim();
  const command = trimmed.startsWith("/")
    ? trimmed.split(/[\s@]/)[0].toLowerCase()
    : null;
  const key = command ?? trimmed;

  if (key === "/start" || key === "/menu") {
    return sendMessage(
      chatId,
      "Меню заявок включено. Кнопки под полем ввода: списки заявок, сводка и поиск.",
      MENU_KEYBOARD,
    );
  }

  if (key === MENU.new || key === "/new") return send(chatId, await listView("n", 0));
  if (key === MENU.work || key === "/work") return send(chatId, await listView("w", 0));
  if (key === MENU.all || key === "/all") return send(chatId, await listView("a", 0));
  if (key === MENU.stats || key === "/stats") return send(chatId, await statsView());

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

interface CallbackQuery {
  id: string;
  data: string;
  from: { username?: string; first_name?: string };
  message: { message_id: number; chat: { id: number } };
}

// Нажатия на inline-кнопки
export async function handleCallback(query: CallbackQuery) {
  const [kind, ...rest] = query.data.split(":");
  const chatId = query.message.chat.id;
  const messageId = query.message.message_id;

  const who = query.from.username
    ? `@${query.from.username}`
    : query.from.first_name?.trim() || "менеджер";

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
        const view = await cardView(id, backFrom(filter, page), note);
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
      const view = id ? await cardView(id, backFrom(filter, page)) : null;
      if (!view) {
        await answerCallback(query.id, "Заявка не найдена (возможно, удалена)");
        return;
      }
      await edit(chatId, messageId, view);
      break;
    }

    // dl:<id>:<filter>:<page> — запрос подтверждения удаления
    case "dl": {
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
  }

  await answerCallback(query.id);
}
