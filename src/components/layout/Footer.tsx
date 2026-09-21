import Link from "next/link";
import { Container } from "./Container";
import { getSettings } from "@/lib/settings";
import { prisma } from "@/lib/prisma";

const NAVIGATION = [
  { href: "/", label: "Главная" },
  { href: "/catalog", label: "Каталог" },
  { href: "/about", label: "О компании" },
  { href: "/projects", label: "Проекты" },
  { href: "/contacts", label: "Контакты" },
];

export const Footer = async () => {
  const [settings, categories, locations] = await Promise.all([
    getSettings(),
    prisma.category.findMany({
      orderBy: { order: "asc" },
      take: 5,
    }),
    prisma.location.findMany({ orderBy: { createdAt: "asc" } }),
  ]);

  // Адреса из админки; если их ещё нет — адрес из настроек
  const addresses = locations.length
    ? locations.map((l) => ({ id: l.id, text: l.address }))
    : settings?.address
      ? [{ id: "settings", text: settings.address }]
      : [];

  return (
    <footer className="border-t border-border bg-background">
      <Container className="py-16">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-4">
          {/* О компании */}
          <div>
            <Link
              href="/"
              className="font-montserrat text-2xl font-bold text-text"
            >
              МКМ
            </Link>
            <p className="mt-4 max-w-xs text-sm text-text/70">
              Мебель на заказ для дома и бизнеса. Индивидуальные размеры,
              точный раскрой на ЧПУ, честные сроки.
            </p>
          </div>

          {/* Навигация */}
          <div>
            <h3 className="font-montserrat text-sm font-semibold uppercase tracking-wider text-text">
              Навигация
            </h3>
            <ul className="mt-4 space-y-2">
              {NAVIGATION.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-sm text-text/70 transition hover:text-primary"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Каталог */}
          <div>
            <h3 className="font-montserrat text-sm font-semibold uppercase tracking-wider text-text">
              Каталог
            </h3>
            <ul className="mt-4 space-y-2">
              {categories.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/catalog?category=${c.slug}`}
                    className="text-sm text-text/70 transition hover:text-primary"
                  >
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Контакты */}
          <div>
            <h3 className="font-montserrat text-sm font-semibold uppercase tracking-wider text-text">
              Контакты
            </h3>
            <ul className="mt-4 space-y-2">
              {settings?.phone && (
                <li>
                  <a
                    href={`tel:${settings.phone.replace(/[^\d+]/g, "")}`}
                    className="text-sm text-text/70 transition hover:text-primary"
                  >
                    {settings.phone}
                  </a>
                </li>
              )}
              {settings?.email && (
                <li>
                  <a
                    href={`mailto:${settings.email}`}
                    className="text-sm text-text/70 transition hover:text-primary"
                  >
                    {settings.email}
                  </a>
                </li>
              )}
              {addresses.map((a) => (
                <li key={a.id} className="text-sm text-text/70">
                  {a.text}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Нижняя строка */}
        <div className="mt-12 flex flex-col items-start justify-between gap-4 border-t border-border pt-6 md:flex-row md:items-center">
          <p className="text-xs text-text/60">
            © {new Date().getFullYear()} {settings?.companyName ?? "МКМ"}
          </p>
          <Link
            href="/privacy"
            className="text-xs text-text/60 transition hover:text-primary"
          >
            Политика конфиденциальности
          </Link>
        </div>
      </Container>
    </footer>
  );
};