"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Input } from "@/components/ui/Input";

interface SettingsForm {
  companyName: string;
  phone: string;
  email: string;
  address: string;
  telegram: string;
  whatsapp: string;
}

export default function AdminSettingsPage() {
  const [isLoading, setLoading] = useState(true);
  const [savedMessage, setSavedMessage] = useState("");

  const {
    register,
    handleSubmit,
    formState: { isSubmitting, isDirty },
    reset,
  } = useForm<SettingsForm>({
    defaultValues: {
      companyName: "",
      phone: "",
      email: "",
      address: "",
      telegram: "",
      whatsapp: "",
    },
  });

  // Загружаем текущие настройки
  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        if (data) {
          reset({
            companyName: data.companyName ?? "",
            phone: data.phone ?? "",
            email: data.email ?? "",
            address: data.address ?? "",
            telegram: data.telegram ?? "",
            whatsapp: data.whatsapp ?? "",
          });
        }
      })
      .finally(() => setLoading(false));
  }, [reset]);

  const onSubmit = async (data: SettingsForm) => {
    const response = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      alert("Не удалось сохранить настройки");
      return;
    }

    const saved = await response.json();
    reset({
      companyName: saved.companyName ?? "",
      phone: saved.phone ?? "",
      email: saved.email ?? "",
      address: saved.address ?? "",
      telegram: saved.telegram ?? "",
      whatsapp: saved.whatsapp ?? "",
    });

    // Показываем «Сохранено» на 2 секунды
    setSavedMessage("Изменения сохранены");
    setTimeout(() => setSavedMessage(""), 2000);
  };

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-border bg-white p-10 text-center">
        <p className="text-sm text-text/60">Загрузка…</p>
      </div>
    );
  }

  return (
    <div>
      <div>
        <h1 className="font-montserrat text-2xl font-bold text-text md:text-3xl">
          Настройки
        </h1>
        <p className="mt-1 text-sm text-text/60">
          Контактные данные и информация о компании
        </p>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_320px]"
        noValidate
      >
        <div className="space-y-5 rounded-2xl border border-border bg-white p-6">
          <h2 className="font-montserrat text-base font-semibold text-text">
            Основное
          </h2>

          <Input
            id="settings-company"
            label="Название компании"
            placeholder="МКМ"
            {...register("companyName")}
          />

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Input
              id="settings-phone"
              label="Телефон"
              type="tel"
              placeholder="+7 (___) ___-__-__"
              {...register("phone")}
            />
            <Input
              id="settings-email"
              label="Email"
              type="email"
              placeholder="info@mkm.ru"
              {...register("email")}
            />
          </div>

          <div>
            <Input
              id="settings-address"
              label="Основной адрес (для политики конфиденциальности)"
              placeholder="г. Красноярск, ул. Примерная, 123"
              {...register("address")}
            />
            <p className="mt-1.5 text-xs text-text/50">
              Адреса магазинов для страницы контактов, подвала и карты
              добавляются в разделе «Адреса».
            </p>
          </div>

          <h2 className="pt-2 font-montserrat text-base font-semibold text-text">
            Мессенджеры
          </h2>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Input
              id="settings-telegram"
              label="Telegram"
              placeholder="@mkm_furniture"
              {...register("telegram")}
            />
            <Input
              id="settings-whatsapp"
              label="WhatsApp"
              type="tel"
              placeholder="+79991234567"
              {...register("whatsapp")}
            />
          </div>
        </div>

        {/* Правая колонка — логотип */}
        <div className="space-y-5 rounded-2xl border border-border bg-white p-6">
          <h2 className="font-montserrat text-base font-semibold text-text">
            Логотип
          </h2>
          <div className="flex aspect-square items-center justify-center rounded-xl bg-beige">
            <span className="font-montserrat text-4xl font-bold text-primary">
              МКМ
            </span>
          </div>
          <button
            type="button"
            className="w-full rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-text transition hover:border-primary hover:text-primary"
          >
            Загрузить новый
          </button>
          <p className="text-xs text-text/50">
            PNG или SVG, до 1 МБ. Рекомендуем 512×512.
          </p>
        </div>

        <div className="flex items-center gap-3 lg:col-span-2">
          <button
            type="submit"
            disabled={isSubmitting || !isDirty}
            className="rounded-lg bg-primary px-6 py-3 font-medium text-white transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Сохраняем…" : "Сохранить изменения"}
          </button>
          <button
            type="button"
            onClick={() => reset()}
            disabled={!isDirty}
            className="rounded-lg border border-border bg-white px-6 py-3 font-medium text-text transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
          >
            Сбросить
          </button>
          {savedMessage && (
            <span className="text-sm font-medium text-green-600">
              {savedMessage}
            </span>
          )}
        </div>
      </form>
    </div>
  );
}