"use client";

import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { formatRub, parsePrice } from "@/lib/money";
import { expenseTotals, type ExpenseKind } from "@/lib/order-stats";
import { EXPENSE_KIND_LABELS } from "@/lib/order-expenses";

interface ExpenseFromApi {
  id: string;
  kind: string;
  amount: number;
  createdAt: string;
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" });

const KindRow = ({
  kind,
  onAdd,
}: {
  kind: ExpenseKind;
  onAdd: (amount: number) => Promise<void>;
}) => {
  const [value, setValue] = useState("");
  const [isSaving, setSaving] = useState(false);

  const handleAdd = async () => {
    const parsed = parsePrice(value.trim());
    if (!parsed) {
      alert("Введите сумму больше 0, например 15000");
      return;
    }
    setSaving(true);
    try {
      await onAdd(parsed);
      setValue("");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <p className="text-sm text-text">{EXPENSE_KIND_LABELS[kind]}</p>
      <div className="mt-1.5 flex gap-2">
        <div className="relative flex-1">
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAdd();
            }}
            inputMode="numeric"
            maxLength={16}
            placeholder="Сумма, например 15000"
            className="w-full rounded-lg border border-border bg-white px-4 py-2.5 pr-9 text-sm text-text outline-none transition placeholder:text-text/40 focus:border-primary"
          />
          <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-text/40">
            ₽
          </span>
        </div>
        <button
          type="button"
          onClick={handleAdd}
          disabled={isSaving}
          className="rounded-lg border border-border bg-white px-4 py-2.5 text-sm font-medium text-text transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSaving ? "…" : "Добавить"}
        </button>
      </div>
    </div>
  );
};

// Расходы на заказ: закупка материалов (в наценку) и готовых деталей (без
// наценки). Добавлять можно сколько угодно раз, суммы складываются.
export const ApplicationExpenses = ({
  applicationId,
  price,
}: {
  applicationId: string;
  price: number | null;
}) => {
  const [expenses, setExpenses] = useState<ExpenseFromApi[]>([]);
  const [isLoading, setLoading] = useState(true);

  const base = `/api/applications/${applicationId}/expenses`;

  useEffect(() => {
    fetch(base)
      .then((r) => r.json())
      .then((data: ExpenseFromApi[]) => setExpenses(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, [base]);

  const handleAdd = async (kind: ExpenseKind, amount: number) => {
    const response = await fetch(base, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, amount }),
    });
    if (!response.ok) {
      alert("Не удалось сохранить расход");
      return;
    }
    const created: ExpenseFromApi = await response.json();
    setExpenses((prev) => [...prev, created]);
  };

  const handleDelete = async (expense: ExpenseFromApi) => {
    if (!confirm("Удалить этот расход?")) return;

    const response = await fetch(`${base}/${expense.id}`, { method: "DELETE" });
    if (!response.ok) {
      alert("Не удалось удалить");
      return;
    }
    setExpenses((prev) => prev.filter((e) => e.id !== expense.id));
  };

  const totals = expenseTotals(expenses);
  const remainder = price !== null ? price - totals.total : null;

  return (
    <div className="border-t border-border pt-5">
      <p className="text-xs font-medium uppercase tracking-wider text-text/50">Расходы</p>

      {isLoading ? (
        <p className="mt-3 text-sm text-text/50">Загрузка…</p>
      ) : (
        <>
          <div className="mt-3 space-y-4">
            <KindRow kind="material" onAdd={(amount) => handleAdd("material", amount)} />
            <KindRow kind="ready" onAdd={(amount) => handleAdd("ready", amount)} />
          </div>

          {expenses.length > 0 && (
            <div className="mt-4 space-y-1">
              {[...expenses].reverse().map((expense) => (
                <div
                  key={expense.id}
                  className="flex items-center justify-between gap-2 rounded-lg bg-background/50 px-3 py-1.5 text-sm"
                >
                  <span className="text-text/70">
                    {formatDate(expense.createdAt)} · {EXPENSE_KIND_LABELS[expense.kind as ExpenseKind]}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-text">{formatRub(expense.amount)}</span>
                    <button
                      type="button"
                      onClick={() => handleDelete(expense)}
                      aria-label="Удалить расход"
                      className="flex h-6 w-6 items-center justify-center rounded text-text/40 transition hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 space-y-1 border-t border-border pt-3 text-sm">
            <p className="text-text/70">
              Материалы: <span className="font-medium text-text">{formatRub(totals.material)}</span>
            </p>
            <p className="text-text/70">
              Готовые: <span className="font-medium text-text">{formatRub(totals.ready)}</span>
            </p>
            <p className="text-text/70">
              Расход всего: <span className="font-medium text-text">{formatRub(totals.total)}</span>
            </p>
            <p className="font-medium">
              Заказ − расход:{" "}
              {remainder === null ? (
                <span className="text-text/40">стоимость не указана</span>
              ) : (
                <span className={remainder < 0 ? "text-red-600" : "text-text"}>
                  {formatRub(remainder)}
                </span>
              )}
            </p>
          </div>
        </>
      )}
    </div>
  );
};
