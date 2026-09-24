"use client";

import { useState } from "react";

const MAX_LENGTH = 40;

// Номер заказа: произвольный текст (например, из 1С или бумажного учёта)
export const ApplicationOrderNumber = ({
  applicationId,
  orderNumber,
  onSaved,
}: {
  applicationId: string;
  orderNumber: string | null;
  onSaved: (orderNumber: string | null) => void;
}) => {
  const [value, setValue] = useState(orderNumber ?? "");
  const [isSaving, setSaving] = useState(false);

  const handleSave = async () => {
    const trimmed = value.trim();
    if (trimmed.length > MAX_LENGTH) {
      alert(`Не длиннее ${MAX_LENGTH} символов`);
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/applications/${applicationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderNumber: trimmed || null }),
      });
      if (!response.ok) {
        alert("Не удалось сохранить номер заказа");
        return;
      }
      const updated = await response.json();
      setValue(updated.orderNumber ?? "");
      onSaved(updated.orderNumber ?? null);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wider text-text/50">Номер заказа</p>
      <div className="mt-1.5 flex gap-2">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave();
          }}
          maxLength={MAX_LENGTH}
          placeholder="Например, 2026-104"
          className="w-full rounded-lg border border-border bg-white px-4 py-2.5 text-sm text-text outline-none transition placeholder:text-text/40 focus:border-primary"
        />
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="flex-none rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSaving ? "…" : "Сохранить"}
        </button>
      </div>
    </div>
  );
};
