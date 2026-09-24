// Суммы по заявкам за периоды. Периоды считаются по дате заявки, по московскому
// времени; отклонённые заявки в статистику не входят.

const MSK_OFFSET_MS = 3 * 60 * 60 * 1000;

export interface StatRow {
  createdAt: Date;
  status: string;
  price: number | null;
  // Сумма расходов на этот заказ (материалы + готовые), если есть
  expenses?: number;
}

export interface Totals {
  // Заявок всего и сколько из них со стоимостью
  count: number;
  priced: number;
  // Сумма по всем заявкам со стоимостью
  sum: number;
  // Выполненные (статус «Обработана»)
  doneCount: number;
  doneSum: number;
  // Расходы на заказы за период (материалы + готовые, все заказы, не только с ценой)
  expenses: number;
}

const emptyTotals = (): Totals => ({
  count: 0,
  priced: 0,
  sum: 0,
  doneCount: 0,
  doneSum: 0,
  expenses: 0,
});

function add(totals: Totals, row: StatRow) {
  totals.count++;
  if (row.price) {
    totals.priced++;
    totals.sum += row.price;
  }
  if (row.status === "done") {
    totals.doneCount++;
    totals.doneSum += row.price ?? 0;
  }
  totals.expenses += row.expenses ?? 0;
}

// Прибыль: стоимость минус расход. Показывать имеет смысл, только если
// известна хотя бы стоимость или расход — иначе это просто «0 − 0»
export const hasMargin = (totals: Totals) => totals.priced > 0 || totals.expenses > 0;
export const margin = (totals: Totals) => totals.sum - totals.expenses;

// Год/месяц/день по Москве
function mskParts(date: Date) {
  const shifted = new Date(date.getTime() + MSK_OFFSET_MS);
  return { year: shifted.getUTCFullYear(), month: shifted.getUTCMonth(), day: shifted.getUTCDate() };
}

// Начало дня/месяца по Москве (месяц может быть отрицательным или больше 11)
const mskStart = (year: number, month: number, day = 1) =>
  new Date(Date.UTC(year, month, day) - MSK_OFFSET_MS);

const countable = (rows: StatRow[]) => rows.filter((row) => row.status !== "rejected");

export interface PeriodStats {
  today: Totals;
  month: Totals;
  prevMonth: Totals;
  year: Totals;
  all: Totals;
}

export function periodStats(rows: StatRow[], now: Date): PeriodStats {
  const { year, month, day } = mskParts(now);
  const todayStart = mskStart(year, month, day).getTime();
  const monthStart = mskStart(year, month).getTime();
  const prevMonthStart = mskStart(year, month - 1).getTime();
  const yearStart = mskStart(year, 0).getTime();

  const result: PeriodStats = {
    today: emptyTotals(),
    month: emptyTotals(),
    prevMonth: emptyTotals(),
    year: emptyTotals(),
    all: emptyTotals(),
  };

  for (const row of countable(rows)) {
    const time = row.createdAt.getTime();
    add(result.all, row);
    if (time >= yearStart) add(result.year, row);
    if (time >= monthStart) add(result.month, row);
    else if (time >= prevMonthStart) add(result.prevMonth, row);
    if (time >= todayStart) add(result.today, row);
  }
  return result;
}

export interface MonthStats {
  year: number;
  // 0–11
  month: number;
  totals: Totals;
}

// Последние `count` месяцев, начиная с текущего
export function monthlyStats(rows: StatRow[], now: Date, count = 12): MonthStats[] {
  const current = mskParts(now);
  const currentIndex = current.year * 12 + current.month;

  const months: MonthStats[] = Array.from({ length: count }, (_, i) => {
    const index = currentIndex - i;
    return { year: Math.floor(index / 12), month: index % 12, totals: emptyTotals() };
  });

  for (const row of countable(rows)) {
    const { year, month } = mskParts(row.createdAt);
    const offset = currentIndex - (year * 12 + month);
    if (offset >= 0 && offset < count) add(months[offset].totals, row);
  }
  return months;
}

// «сентябрь 2026»
export const formatMonth = (year: number, month: number) =>
  `${new Date(Date.UTC(year, month, 1)).toLocaleString("ru-RU", { month: "long", timeZone: "UTC" })} ${year}`;

// Год и месяц (0–11) сейчас по Москве
export function mskYearMonth(now: Date) {
  const { year, month } = mskParts(now);
  return { year, month };
}

// --- Расходы на заказ --------------------------------------------------------

export type ExpenseKind = "material" | "ready";

export interface ExpenseRow {
  kind: string;
  amount: number;
}

export interface ExpenseTotals {
  material: number;
  ready: number;
  total: number;
}

export function expenseTotals(rows: ExpenseRow[]): ExpenseTotals {
  let material = 0;
  let ready = 0;
  for (const row of rows) {
    if (row.kind === "material") material += row.amount;
    else if (row.kind === "ready") ready += row.amount;
  }
  return { material, ready, total: material + ready };
}
