import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";

// Адрес сайта без слэша на конце (задаётся в .env как SITE_URL)
export const SITE_URL = (process.env.SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
export const SITE_NAME = "МКМ";

export const absoluteUrl = (path = "/") => `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;

// Страница категории каталога (раньше была /catalog?category=…)
export const categoryPath = (slug: string) => `/catalog/category/${slug}`;

// Обрезка описания до длины сниппета по границе слова
export function truncate(text: string, max = 155): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[.,;:—-]+$/, "")}…`;
}

// Картинка по умолчанию для превью ссылок: фото первой категории или изделия
export async function getDefaultImage(): Promise<string | null> {
  const category = await prisma.category.findFirst({
    where: { image: { not: null } },
    orderBy: { order: "asc" },
    select: { image: true },
  });
  if (category?.image) return category.image;

  const image = await prisma.productImage.findFirst({
    orderBy: { order: "asc" },
    select: { url: true },
  });
  return image?.url ?? null;
}

interface PageMetadataInput {
  title: string;
  description: string;
  // Путь страницы без домена: "/catalog", "/catalog/kitchen"
  path: string;
  // undefined — картинка по умолчанию, null — без картинки
  image?: string | null;
  noindex?: boolean;
}

// Заголовок, описание, canonical, Open Graph и Twitter — одним вызовом
export async function buildMetadata({
  title,
  description,
  path,
  image,
  noindex,
}: PageMetadataInput): Promise<Metadata> {
  const picture = image === undefined ? await getDefaultImage() : image;
  const images = picture ? [{ url: picture }] : undefined;

  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      locale: "ru_RU",
      siteName: SITE_NAME,
      title,
      description,
      url: path,
      images,
    },
    twitter: {
      card: images ? "summary_large_image" : "summary",
      title,
      description,
      images: picture ? [picture] : undefined,
    },
    ...(noindex ? { robots: { index: false, follow: false } } : {}),
  };
}

// --- Структурированные данные (schema.org) ----------------------------------

export function breadcrumbLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

const WEEK_DAYS = ["пн", "вт", "ср", "чт", "пт", "сб", "вс"];
const SCHEMA_DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

// «Пн–суб, 9:00–18:00» -> расписание для schema.org; не разобралось — null
export function parseOpeningHours(text: string | null | undefined) {
  if (!text) return null;
  const match = text.match(
    /^\s*([А-Яа-яЁё]{2,})\s*[–—-]\s*([А-Яа-яЁё]{2,})\s*,?\s*(\d{1,2})[:.](\d{2})\s*[–—-]\s*(\d{1,2})[:.](\d{2})/,
  );
  if (!match) return null;

  const from = WEEK_DAYS.indexOf(match[1].slice(0, 2).toLowerCase());
  const to = WEEK_DAYS.indexOf(match[2].slice(0, 2).toLowerCase());
  if (from < 0 || to < from) return null;

  const pad = (hours: string, minutes: string) => `${hours.padStart(2, "0")}:${minutes}`;
  return {
    "@type": "OpeningHoursSpecification",
    dayOfWeek: SCHEMA_DAYS.slice(from, to + 1),
    opens: pad(match[3], match[4]),
    closes: pad(match[5], match[6]),
  };
}

// «ул. Верещагина, 2п, Ханская, Республика Адыгея, 385060 (доп. пометка)»
export function parseAddress(raw: string) {
  const parts = raw
    .replace(/\([^)]*\)/g, "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  const postalCode = parts.find((part) => /^\d{6}$/.test(part));
  const region = parts.find((part) => /республика|край|область/i.test(part));
  const rest = parts.filter((part) => part !== postalCode && part !== region);

  const locality = rest.length >= 2 ? rest[rest.length - 1] : undefined;
  const street = (locality ? rest.slice(0, -1) : rest).join(", ");

  return {
    "@type": "PostalAddress",
    streetAddress: street || undefined,
    addressLocality: locality,
    addressRegion: region,
    postalCode,
    addressCountry: "RU",
  };
}

const digitsOnly = (value: string) => value.replace(/[^\d+]/g, "");

// Организация и сайт для главной и страницы контактов
export async function getBusinessLd() {
  const [settings, location, image] = await Promise.all([
    getSettings(),
    prisma.location.findFirst({ orderBy: { createdAt: "asc" } }),
    getDefaultImage(),
  ]);

  const address = location?.address ?? settings?.address ?? null;
  const hours = parseOpeningHours(location?.hours);

  const sameAs: string[] = [];
  const telegram = settings?.telegram?.trim();
  if (telegram) {
    sameAs.push(
      telegram.startsWith("http") ? telegram : `https://t.me/${telegram.replace(/^@/, "")}`,
    );
  }
  const whatsapp = settings?.whatsapp ? digitsOnly(settings.whatsapp).replace(/^\+/, "") : "";
  if (whatsapp) sameAs.push(`https://wa.me/${whatsapp}`);

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": absoluteUrl("/#website"),
        url: SITE_URL,
        name: SITE_NAME,
        inLanguage: "ru-RU",
      },
      {
        "@type": "FurnitureStore",
        "@id": absoluteUrl("/#business"),
        name: SITE_NAME,
        url: SITE_URL,
        description:
          "Мебель на заказ по индивидуальным размерам: кухни, спальни, детская, прихожие, лестницы. Раскрой на станках с ЧПУ.",
        image: image ? absoluteUrl(image) : undefined,
        telephone: settings?.phone || undefined,
        email: settings?.email || undefined,
        address: address ? parseAddress(address) : undefined,
        geo:
          location?.lat != null && location?.lon != null
            ? { "@type": "GeoCoordinates", latitude: location.lat, longitude: location.lon }
            : undefined,
        openingHoursSpecification: hours ?? undefined,
        areaServed: { "@type": "AdministrativeArea", name: "Республика Адыгея" },
        sameAs: sameAs.length ? sameAs : undefined,
      },
    ],
  };
}

interface ProductLdInput {
  name: string;
  slug: string;
  description: string;
  categoryName: string;
  images: string[];
  specifications: { name: string; value: string }[];
}

export function productLd(product: ProductLdInput) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    url: absoluteUrl(`/catalog/${product.slug}`),
    image: product.images.length ? product.images.map(absoluteUrl) : undefined,
    category: product.categoryName,
    brand: { "@type": "Brand", name: SITE_NAME },
    additionalProperty: product.specifications.length
      ? product.specifications.map((spec) => ({
          "@type": "PropertyValue",
          name: spec.name,
          value: spec.value,
        }))
      : undefined,
  };
}

// Список изделий на странице каталога/категории
export function itemListLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      url: absoluteUrl(item.path),
    })),
  };
}
