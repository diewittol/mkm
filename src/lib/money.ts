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
