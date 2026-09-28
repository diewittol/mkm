"use client";

import { useState } from "react";
import { formatRub, parsePrice, remainingToPay } from "@/lib/money";

// Предоплата от клиента: сколько уже внесено и сколько осталось доплатить
// (от итоговой стоимости — с учётом доплат к ней)
export const ApplicationDeposit = ({
  applicationId,
  total,
  deposit,
  onSaved,
}: {
  applicationId: string;
  total: number | null;
  deposit: number | null;
  onSaved: (deposit: number | null) => void;
}) => {
  const [value, setValue] = useState(deposit ? String(deposit) : "");
  const [isSaving, setSaving] = useState(false);

  const handleSave = async () => {
    const trimmed = value.trim();
    const parsed = trimmed ? parsePrice(trimmed) : 0;
    if (parsed === undefined) {
      alert("Введите сумму в рублях, например 50000");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/applications/${applicationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deposit: parsed || null }),
      });
      if (!response.ok) {
        alert("Не удалось сохранить предоплату");
        return;
      }
      const updated = await response.json();
      setValue(updated.deposit ? String(updated.deposit) : "");
      onSaved(updated.deposit ?? null);
    } finally {
      setSaving(false);
    }
  };

  const remainder = remainingToPay(total, deposit ?? 0);

  return (
    <div className="border-t border-border pt-5">
      <p className="text-xs font-medium uppercase tracking-wider text-text/50">Предоплата</p>
      <div className="mt-3 flex gap-2">
        <div className="relative flex-1">
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
            }}
            inputMode="numeric"
            maxLength={16}
            placeholder="Сколько внёс клиент"
            className="w-full rounded-lg border border-border bg-white px-4 py-3 pr-9 text-sm text-text outline-none transition placeholder:text-text/40 focus:border-primary"
          />
          <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-text/40">
            ₽
          </span>
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="rounded-lg bg-primary px-5 py-3 text-sm font-medium text-white transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSaving ? "…" : "Сохранить"}
        </button>
      </div>
      <p className="mt-2 text-xs text-text/40">Пусто — убрать предоплату.</p>

      {(deposit || total !== null) && (
        <div className="mt-3 space-y-1 text-sm">
          <p className="text-text/70">
            Внесено: <span className="font-medium text-text">{formatRub(deposit ?? 0)}</span>
          </p>
          <p className="font-medium">
            {remainder === null ? (
              <span className="text-text/40">Осталось доплатить: стоимость не указана</span>
            ) : remainder > 0 ? (
              <>
                Осталось доплатить: <span className="text-text">{formatRub(remainder)}</span>
              </>
            ) : remainder < 0 ? (
              <span className="text-orange-600">Переплата: {formatRub(-remainder)}</span>
            ) : (
              <span className="text-green-600">Оплачено полностью</span>
            )}
          </p>
        </div>
      )}
    </div>
  );
};
