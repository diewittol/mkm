"use client";

import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { Input } from "@/components/ui/Input";
import { HERO_COLOR_PATTERN, HERO_DEFAULT_OVERLAY } from "@/lib/hero";
import {
  HeroBackgroundSettings,
  type HeroMode,
  type HeroValues,
} from "@/components/admin/HeroBackgroundSettings";

interface SettingsForm {
  companyName: string;
  phone: string;
  email: string;
  address: string;
  telegram: string;
  whatsapp: string;
  heroMode: HeroMode;
  heroColor: string;
  heroImage: string;
  heroOverlay: number;
  heroTextTheme: string;
}

// Данные из API -> значения формы
const toForm = (data: Record<string, unknown>): SettingsForm => ({
  companyName: (data.companyName as string) ?? "",
  phone: (data.phone as string) ?? "",
  email: (data.email as string) ?? "",
  address: (data.address as string) ?? "",
  telegram: (data.telegram as string) ?? "",
  whatsapp: (data.whatsapp as string) ?? "",
  heroMode: data.heroImage ? "image" : data.heroColor ? "color" : "default",
  heroColor: (data.heroColor as string) ?? "",
  heroImage: (data.heroImage as string) ?? "",
  heroOverlay: (data.heroOverlay as number) ?? HERO_DEFAULT_OVERLAY,
  heroTextTheme: (data.heroTextTheme as string) ?? "auto",
});

export default function AdminSettingsPage() {
  const [isLoading, setLoading] = useState(true);
  const [savedMessage, setSavedMessage] = useState("");

  const {
    register,
    handleSubmit,
    formState: { isSubmitting, isDirty },
    reset,
    control,
    setValue,
  } = useForm<SettingsForm>({
    defaultValues: {
      companyName: "",
      phone: "",
      email: "",
      address: "",
      telegram: "",
      whatsapp: "",
      heroMode: "default",
      heroColor: "",
      heroImage: "",
      heroOverlay: HERO_DEFAULT_OVERLAY,
      heroTextTheme: "auto",
    },
  });

  const [heroMode, heroColor, heroImage, heroOverlay, heroTextTheme] = useWatch({
    control,
    name: ["heroMode", "heroColor", "heroImage", "heroOverlay", "heroTextTheme"],
  });
  const heroValues: HeroValues = { heroMode, heroColor, heroImage, heroOverlay, heroTextTheme };

  // Загружаем текущие настройки
  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        if (data) reset(toForm(data));
      })
      .finally(() => setLoading(false));
  }, [reset]);

  const onSubmit = async (data: SettingsForm) => {
    if (data.heroMode === "color" && !HERO_COLOR_PATTERN.test(data.heroColor)) {
      alert("Укажите цвет фона в формате #e8e1d8");
      return;
    }
    if (data.heroMode === "image" && !data.heroImage) {
      alert("Загрузите фото для главного экрана или выберите другой вариант фона");
      return;
    }

    const { heroMode: mode, ...fields } = data;
    const response = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...fields,
        heroImage: mode === "image" ? data.heroImage : null,
        heroColor: mode === "color" ? data.heroColor : null,
      }),
    });

    if (!response.ok) {
      alert("Не удалось сохранить настройки");
      return;
    }

    const saved = await response.json();
    reset(toForm(saved));

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
              placeholder="ст. Ханская, ул. Примерная, 123"
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

        <HeroBackgroundSettings
          values={heroValues}
          onChange={(patch) => {
            for (const [key, value] of Object.entries(patch)) {
              setValue(key as keyof SettingsForm, value as never, { shouldDirty: true });
            }
          }}
        />

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