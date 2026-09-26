// Стоимость заказа: целые рубли. Без зависимостей: работает и в браузере, и на сервере.

export const MAX_PRICE = 999_999_999;

export const formatRub = (amount: number) => `${amount.toLocaleString("ru-RU")} ₽`;

// «120000», «120 000», «120 000 ₽», «120000 руб», «120000,00» -> 120000.
// Возвращает undefined, если это не сумма. 0 допустим (значит «убрать стоимость»).
export function parsePrice(input: string): number | undefined {
  const cleaned = input
    .replace(/[\s ]/g, "")
    .replace(/(₽|руб\.?|р\.?)$/i, "")
    .replace(/[.,]0{1,2}$/, "");

  if (!/^\d{1,9}$/.test(cleaned)) return undefined;
  const value = Number(cleaned);
  return value <= MAX_PRICE ? value : undefined;
}

export const MAX_COMMENT_LENGTH = 200;

// Комментарий к расходу или доплате: обрезаем пробелы и лишнюю длину; пусто -> null
export const cleanComment = (value: unknown): string | null =>
  typeof value === "string" ? value.trim().slice(0, MAX_COMMENT_LENGTH) || null : null;

// «15000», «15 000 плитка», «15000 р. крепёж» -> { amount, comment }.
// Сумма должна быть больше 0. Тысячи можно отделять пробелом (группы по 3 цифры).
export function parseAmountWithComment(
  input: string,
): { amount: number; comment: string | null } | undefined {
  const match = input
    .trim()
    .match(/^(\d{1,3}(?:[\s ]\d{3})+|\d+)(?:[.,]0{1,2})?\s*(?:₽|руб\.?|р\.?)?(?:\s+([\s\S]*))?$/i);
  if (!match) return undefined;

  const amount = Number(match[1].replace(/[\s ]/g, ""));
  if (!amount || amount > MAX_PRICE) return undefined;
  return { amount, comment: cleanComment(match[2]) };
}

// Итоговая стоимость заказа: базовая цена плюс доплаты. null — стоимость не задана.
export const totalPrice = (price: number | null, extras: number): number | null =>
  (price ?? 0) + extras || null;
