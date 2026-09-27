"use client";

import { HERO_COLOR_PATTERN, HERO_MAX_OVERLAY, heroOverlayColor, resolveHero } from "@/lib/hero";
import { SingleImageUploader } from "./SingleImageUploader";

export type HeroMode = "default" | "color" | "image";

export interface HeroValues {
  heroMode: HeroMode;
  heroColor: string;
  heroImage: string;
  heroOverlay: number;
  heroTextTheme: string;
}

const MODES: { value: HeroMode; label: string }[] = [
  { value: "default", label: "Стандартный (бежевый)" },
  { value: "color", label: "Свой цвет" },
  { value: "image", label: "Фото" },
];

const THEMES = [
  { value: "auto", label: "Автоматически (по фону)" },
  { value: "dark", label: "Тёмный текст" },
  { value: "light", label: "Светлый текст" },
];

// Настройка фона главного экрана сайта: цвет или фото, с предпросмотром
export const HeroBackgroundSettings = ({
  values,
  onChange,
}: {
  values: HeroValues;
  onChange: (patch: Partial<HeroValues>) => void;
}) => {
  const hero = resolveHero({
    heroImage: values.heroMode === "image" ? values.heroImage : null,
    heroColor: values.heroMode === "color" ? values.heroColor : null,
    heroOverlay: values.heroOverlay,
    heroTextTheme: values.heroTextTheme,
  });
  const isLight = hero.theme === "light";
  const colorValid = HERO_COLOR_PATTERN.test(values.heroColor);

  return (
    <div className="space-y-5 rounded-2xl border border-border bg-white p-6 lg:col-span-2">
      <div>
        <h2 className="font-montserrat text-base font-semibold text-text">Главный экран сайта</h2>
        <p className="mt-1 text-xs text-text/50">
          Фон большого блока в самом верху главной страницы.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {MODES.map((mode) => (
          <button
            key={mode.value}
            type="button"
            onClick={() => onChange({ heroMode: mode.value })}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              values.heroMode === mode.value
                ? "bg-primary text-white"
                : "border border-border bg-white text-text hover:border-primary hover:text-primary"
            }`}
          >
            {mode.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-5">
          {values.heroMode === "color" && (
            <div>
              <label className="mb-2 block text-sm font-medium text-text">Цвет фона</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={colorValid ? values.heroColor : "#e8e1d8"}
                  onChange={(e) => onChange({ heroColor: e.target.value })}
                  aria-label="Выбрать цвет"
                  className="h-11 w-14 cursor-pointer rounded-lg border border-border bg-white p-1"
                />
                <input
                  value={values.heroColor}
                  onChange={(e) => onChange({ heroColor: e.target.value.trim() })}
                  maxLength={7}
                  placeholder="#e8e1d8"
                  className={`w-32 rounded-lg border bg-white px-4 py-2.5 text-sm text-text outline-none transition focus:border-primary ${
                    values.heroColor && !colorValid ? "border-red-500" : "border-border"
                  }`}
                />
              </div>
              {values.heroColor && !colorValid && (
                <p className="mt-1.5 text-xs text-red-500">Формат: #e8e1d8</p>
              )}
            </div>
          )}

          {values.heroMode === "image" && (
            <>
              <div>
                <label className="mb-2 block text-sm font-medium text-text">Фото</label>
                <SingleImageUploader
                  value={values.heroImage || null}
                  onChange={(url) => onChange({ heroImage: url ?? "" })}
                />
                <p className="mt-1.5 text-xs text-text/50">
                  Лучше горизонтальное фото шириной от 1920 пикселей, до 10 МБ.
                </p>
              </div>

              <div>
                <label className="mb-2 flex items-center justify-between text-sm font-medium text-text">
                  <span>{isLight ? "Затемнение фото" : "Осветление фото"}</span>
                  <span className="text-text/50">{values.heroOverlay}%</span>
                </label>
                <input
                  type="range"
                  min={0}
                  max={HERO_MAX_OVERLAY}
                  step={5}
                  value={values.heroOverlay}
                  onChange={(e) => onChange({ heroOverlay: Number(e.target.value) })}
                  className="w-full accent-[var(--color-primary)]"
                />
                <p className="mt-1 text-xs text-text/50">
                  Чем больше, тем лучше читается текст поверх фото.
                </p>
              </div>
            </>
          )}

          <div>
            <label htmlFor="hero-theme" className="mb-2 block text-sm font-medium text-text">
              Цвет текста
            </label>
            <select
              id="hero-theme"
              value={values.heroTextTheme}
              onChange={(e) => onChange({ heroTextTheme: e.target.value })}
              className="w-full rounded-lg border border-border bg-white px-4 py-3 text-sm text-text outline-none transition focus:border-primary"
            >
              {THEMES.map((theme) => (
                <option key={theme.value} value={theme.value}>
                  {theme.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Предпросмотр */}
        <div>
          <p className="mb-2 text-sm font-medium text-text">Как будет выглядеть</p>
          <div
            className="relative flex aspect-[16/9] items-center overflow-hidden rounded-xl border border-border"
            style={{
              backgroundColor: hero.mode === "color" ? (hero.color ?? undefined) : "#e8e1d8",
              backgroundImage:
                hero.mode === "image" && hero.image
                  ? `url(${hero.image})`
                  : hero.mode === "default"
                    ? "linear-gradient(135deg, #e8e1d8, #f6f4f0, #e8e1d8)"
                    : undefined,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            {hero.mode === "image" && hero.image && (
              <div
                className="absolute inset-0"
                style={{ backgroundColor: heroOverlayColor(hero.theme, hero.overlay) }}
              />
            )}
            <div className="relative px-6">
              <p className={`text-[10px] font-medium uppercase tracking-widest ${isLight ? "text-white/80" : "text-primary"}`}>
                Производство мебели
              </p>
              <p className={`mt-1 font-montserrat text-lg font-bold leading-tight ${isLight ? "text-white" : "text-text"}`}>
                Мебель из массива дерева на заказ
              </p>
              <span className="mt-3 inline-block rounded bg-primary px-3 py-1.5 text-[10px] font-medium text-white">
                Смотреть каталог
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
