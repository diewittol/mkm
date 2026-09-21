// Суммы по заявкам за периоды. Периоды считаются по дате заявки, по московскому
// времени; отклонённые заявки в статистику не входят.

const MSK_OFFSET_MS = 3 * 60 * 60 * 1000;

export interface StatRow {
  createdAt: Date;
  status: string;
  price: number | null;
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
}

const emptyTotals = (): Totals => ({ count: 0, priced: 0, sum: 0, doneCount: 0, doneSum: 0 });

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
}

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
