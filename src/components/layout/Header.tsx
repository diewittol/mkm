import Link from "next/link";
import { Container } from "./Container";
import { getSettings } from "@/lib/settings";

const NAV_ITEMS = [
  { href: "/", label: "Главная" },
  { href: "/catalog", label: "Каталог" },
  { href: "/about", label: "О компании" },
  { href: "/projects", label: "Проекты" },
  { href: "/contacts", label: "Контакты" },
];

export const Header = async () => {
  const settings = await getSettings();

  return (
    <header className="w-full bg-background">
      <Container>
        <div className="flex h-20 items-center justify-between">
          {/* Логотип */}
          <Link
            href="/"
            className="font-montserrat text-2xl font-bold text-text"
          >
            МКМ
          </Link>

          {/* Навигация (desktop) */}
          <nav className="hidden items-center gap-8 lg:flex">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm font-medium text-text transition hover:text-primary"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Телефон + кнопка */}
          <div className="flex items-center gap-5">
            {settings?.phone && (
              <a
                href={`tel:${settings.phone.replace(/[^\d+]/g, "")}`}
                className="hidden text-sm font-medium text-text transition hover:text-primary md:block"
              >
                {settings.phone}
              </a>
            )}
            <Link
              href="/contacts"
              className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white transition hover:bg-primary-dark"
            >
              Связаться с нами
            </Link>
          </div>
        </div>
      </Container>
    </header>
  );
};