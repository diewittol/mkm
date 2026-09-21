"use client";

import { useMemo, useState } from "react";
import { formatRub } from "@/lib/money";
import {
  formatMonth,
  monthlyStats,
  mskYearMonth,
  periodStats,
  type StatRow,
  type Totals,
} from "@/lib/order-stats";

interface StatApplication {
  createdAt: string;
  status: string;
  price: number | null;
}

const PeriodCard = ({ title, totals }: { title: string; totals: Totals }) => {
  const average = totals.priced > 0 ? Math.round(totals.sum / totals.priced) : 0;

  return (
    <div className="rounded-2xl border border-border bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-text/50">{title}</p>
      <p className="mt-2 font-montserrat text-xl font-bold text-text">
        {totals.priced > 0 ? formatRub(totals.sum) : "—"}
      </p>
      <div className="mt-2 space-y-0.5 text-xs text-text/60">
        <p>
          Заявок: {totals.count}
          {totals.priced < totals.count && ` (без стоимости: ${totals.count - totals.priced})`}
        </p>
        {totals.priced > 0 && (
          <>
            <p>
              Выполнено: {totals.doneCount} на {formatRub(totals.doneSum)}
            </p>
            <p>Средний чек: {formatRub(average)}</p>
          </>
        )}
      </div>
    </div>
  );
};

// Сводка по стоимости заказов: считается по загруженному списку заявок,
// поэтому обновляется сразу после смены цены или статуса
export const MoneyStats = ({ applications }: { applications: StatApplication[] }) => {
  const [now] = useState(() => new Date());
  const [showMonths, setShowMonths] = useState(false);

  const rows = useMemo<StatRow[]>(
    () =>
      applications.map((a) => ({
        createdAt: new Date(a.createdAt),
        status: a.status,
        price: a.price,
      })),
    [applications],
  );

  const periods = useMemo(() => periodStats(rows, now), [rows, now]);
  const months = useMemo(
    () => monthlyStats(rows, now, 12).filter((m) => m.totals.count > 0),
    [rows, now],
  );

  const { year, month } = mskYearMonth(now);
  const prev = new Date(Date.UTC(year, month - 1, 1));

  return (
    <section className="mt-8">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="font-montserrat text-lg font-bold text-text">Стоимость заказов</h2>
          <p className="mt-1 text-xs text-text/50">
            По дате заявки, без отклонённых. «Выполнено» — статус «Обработана».
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowMonths((v) => !v)}
          className="rounded-lg border border-border bg-white px-4 py-2 text-sm font-medium text-text transition hover:border-primary hover:text-primary"
        >
          {showMonths ? "Скрыть по месяцам" : "По месяцам"}
        </button>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
        <PeriodCard title="Сегодня" totals={periods.today} />
        <PeriodCard title={`Этот месяц`} totals={periods.month} />
        <PeriodCard
          title={`Прошлый (${formatMonth(prev.getUTCFullYear(), prev.getUTCMonth())})`}
          totals={periods.prevMonth}
        />
        <PeriodCard title={`С начала ${year} года`} totals={periods.year} />
        <PeriodCard title="За всё время" totals={periods.all} />
      </div>

      {showMonths && (
        <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-white">
          <div className="overflow-x-auto">
            <table className="table-stack w-full">
              <thead className="border-b border-border bg-background/50">
                <tr className="text-left text-xs font-medium uppercase tracking-wider text-text/50">
                  <th className="px-5 py-3">Месяц</th>
                  <th className="px-5 py-3">Заявок</th>
                  <th className="px-5 py-3">Сумма</th>
                  <th className="px-5 py-3">Выполнено</th>
                </tr>
              </thead>
              <tbody>
                {months.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-8 text-center text-sm text-text/60">
                      Заявок нет
                    </td>
                  </tr>
                ) : (
                  months.map(({ year: y, month: m, totals }) => (
                    <tr key={`${y}-${m}`} className="border-b border-border last:border-0">
                      <td className="px-5 py-3 text-sm font-medium capitalize text-text">
                        {formatMonth(y, m)}
                      </td>
                      <td className="px-5 py-3 text-sm text-text/70" data-label="Заявок">
                        {totals.count}
                        {totals.priced < totals.count && (
                          <span className="text-text/40"> (без цены: {totals.count - totals.priced})</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-sm text-text" data-label="Сумма">
                        {totals.priced > 0 ? formatRub(totals.sum) : "—"}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-sm text-text/70" data-label="Выполнено">
                        {totals.priced > 0
                          ? `${totals.doneCount} на ${formatRub(totals.doneSum)}`
                          : "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <p className="border-t border-border px-5 py-2 text-xs text-text/40">
            Последние 12 месяцев.
          </p>
        </div>
      )}
    </section>
  );
};
