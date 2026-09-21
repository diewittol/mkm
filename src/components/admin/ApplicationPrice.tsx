"use client";

import { useState } from "react";
import { formatRub, parsePrice } from "@/lib/money";

// Стоимость заказа: вписывает админ, клиенту не показывается
export const ApplicationPrice = ({
  applicationId,
  price,
  onSaved,
}: {
  applicationId: string;
  price: number | null;
  onSaved: (price: number | null) => void;
}) => {
  const [value, setValue] = useState(price ? String(price) : "");
  const [isSaving, setSaving] = useState(false);

  const handleSave = async () => {
    const trimmed = value.trim();
    const parsed = trimmed ? parsePrice(trimmed) : 0;
    if (parsed === undefined) {
      alert("Введите сумму в рублях, например 120000");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/applications/${applicationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ price: parsed || null }),
      });
      if (!response.ok) {
        alert("Не удалось сохранить стоимость");
        return;
      }
      const updated = await response.json();
      setValue(updated.price ? String(updated.price) : "");
      onSaved(updated.price ?? null);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="border-t border-border pt-5">
      <p className="text-xs font-medium uppercase tracking-wider text-text/50">
        Стоимость заказа
      </p>
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
            placeholder="Например, 120000"
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
      <p className="mt-2 text-xs text-text/40">
        {price ? `Сейчас: ${formatRub(price)}. ` : ""}Пусто — убрать стоимость. Клиенту не показывается.
      </p>
    </div>
  );
};
