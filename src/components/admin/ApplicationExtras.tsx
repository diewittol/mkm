"use client";

import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { MAX_COMMENT_LENGTH, formatRub, parsePrice, totalPrice } from "@/lib/money";

interface ExtraFromApi {
  id: string;
  amount: number;
  comment: string | null;
  createdAt: string;
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" });

// Доплаты к стоимости заказа (непредвиденные расходы и т.п.): добавляются сколько
// угодно раз и складываются со стоимостью заказа
export const ApplicationExtras = ({
  applicationId,
  price,
  onTotalChange,
}: {
  applicationId: string;
  price: number | null;
  onTotalChange: (extraTotal: number) => void;
}) => {
  const [extras, setExtras] = useState<ExtraFromApi[]>([]);
  const [isLoading, setLoading] = useState(true);
  const [value, setValue] = useState("");
  const [comment, setComment] = useState("");
  const [isSaving, setSaving] = useState(false);

  const base = `/api/applications/${applicationId}/extras`;

  useEffect(() => {
    fetch(base)
      .then((r) => r.json())
      .then((data: ExtraFromApi[]) => setExtras(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, [base]);

  const update = (next: ExtraFromApi[]) => {
    setExtras(next);
    onTotalChange(next.reduce((sum, e) => sum + e.amount, 0));
  };

  const handleAdd = async () => {
    const parsed = parsePrice(value.trim());
    if (!parsed) {
      alert("Введите сумму больше 0, например 5000");
      return;
    }
    setSaving(true);
    try {
      const response = await fetch(base, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: parsed, comment: comment.trim() }),
      });
      if (!response.ok) {
        alert("Не удалось сохранить доплату");
        return;
      }
      const created: ExtraFromApi = await response.json();
      update([...extras, created]);
      setValue("");
      setComment("");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (extra: ExtraFromApi) => {
    if (!confirm("Удалить эту доплату?")) return;

    const response = await fetch(`${base}/${extra.id}`, { method: "DELETE" });
    if (!response.ok) {
      alert("Не удалось удалить");
      return;
    }
    update(extras.filter((e) => e.id !== extra.id));
  };

  const extraTotal = extras.reduce((sum, e) => sum + e.amount, 0);
  const total = totalPrice(price, extraTotal);

  return (
    <div className="border-t border-border pt-5">
      <p className="text-xs font-medium uppercase tracking-wider text-text/50">
        Доплаты к стоимости
      </p>

      {isLoading ? (
        <p className="mt-3 text-sm text-text/50">Загрузка…</p>
      ) : (
        <>
          <div className="mt-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAdd();
                  }}
                  inputMode="numeric"
                  maxLength={16}
                  placeholder="Сумма, например 5000"
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
            <input
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAdd();
              }}
              maxLength={MAX_COMMENT_LENGTH}
              placeholder="Комментарий (необязательно): за что доплата"
              className="mt-2 w-full rounded-lg border border-border bg-white px-4 py-2 text-sm text-text outline-none transition placeholder:text-text/40 focus:border-primary"
            />
          </div>

          {extras.length > 0 && (
            <div className="mt-4 space-y-1">
              {[...extras].reverse().map((extra) => (
                <div
                  key={extra.id}
                  className="flex items-center justify-between gap-2 rounded-lg bg-background/50 px-3 py-1.5 text-sm"
                >
                  <span className="min-w-0 text-text/70">
                    {formatDate(extra.createdAt)}
                    {extra.comment && (
                      <span className="block break-words text-xs text-text/50">{extra.comment}</span>
                    )}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-text">+ {formatRub(extra.amount)}</span>
                    <button
                      type="button"
                      onClick={() => handleDelete(extra)}
                      aria-label="Удалить доплату"
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
              Стоимость заказа:{" "}
              <span className="font-medium text-text">{price ? formatRub(price) : "не указана"}</span>
            </p>
            <p className="text-text/70">
              Доплаты: <span className="font-medium text-text">{formatRub(extraTotal)}</span>
            </p>
            <p className="font-medium">
              Итого: <span className="text-text">{total ? formatRub(total) : "—"}</span>
            </p>
          </div>
        </>
      )}
    </div>
  );
};
