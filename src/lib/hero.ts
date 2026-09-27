// Фон главного экрана: правила выбора цветов. Без зависимостей — используется и
// на сайте, и в предпросмотре в админке.

export interface HeroSettings {
  heroImage?: string | null;
  heroColor?: string | null;
  heroOverlay?: number | null;
  heroTextTheme?: string | null;
}

export type HeroTheme = "dark" | "light";

export const HERO_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;
export const HERO_MAX_OVERLAY = 80;
export const HERO_DEFAULT_OVERLAY = 40;

// Светлый ли цвет (яркость по формуле восприятия)
function isLightColor(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6;
}

export function resolveHero(settings: HeroSettings | null | undefined) {
  const image = settings?.heroImage || null;
  const color = settings?.heroColor && HERO_COLOR_PATTERN.test(settings.heroColor) ? settings.heroColor : null;
  const overlay = Math.min(
    HERO_MAX_OVERLAY,
    Math.max(0, Math.round(settings?.heroOverlay ?? HERO_DEFAULT_OVERLAY)),
  );

  const mode: "image" | "color" | "default" = image ? "image" : color ? "color" : "default";

  // Текст: заданный вручную или по фону (на фото и тёмном цвете — белый)
  let theme: HeroTheme;
  if (settings?.heroTextTheme === "dark" || settings?.heroTextTheme === "light") {
    theme = settings.heroTextTheme;
  } else if (mode === "image") {
    theme = "light";
  } else if (mode === "color" && color) {
    theme = isLightColor(color) ? "dark" : "light";
  } else {
    theme = "dark";
  }

  return { mode, image, color, overlay, theme };
}

// Слой поверх фото: тёмный под светлый текст, светлый под тёмный
export const heroOverlayColor = (theme: HeroTheme, overlay: number) =>
  theme === "light" ? `rgba(0, 0, 0, ${overlay / 100})` : `rgba(255, 255, 255, ${overlay / 100})`;
