import { ChevronRight, Phone, Mail, MapPin, Send } from "lucide-react";
import Link from "next/link";
import { Container } from "@/components/layout/Container";
import { ContactForm } from "@/components/ui/ContactForm";
import { LocationsMap } from "@/components/contacts/LocationsMap";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";

export const metadata = {
  title: "Контакты — МКМ",
  description:
    "Свяжитесь с нами: телефон, email, адреса магазинов. Оставьте заявку — ответим в течение рабочего дня.",
};

export default async function ContactsPage() {
  const settings = await getSettings();

  // Адреса из админки; если их ещё нет — запасной адрес из настроек (без координат)
  const stored = await prisma.location.findMany({ orderBy: { createdAt: "asc" } });
  const locations =
    stored.length > 0
      ? stored
      : settings?.address
        ? [
            {
              id: "settings",
              title: "Магазин",
              address: settings.address,
              hours: null,
              lat: null,
              lon: null,
            },
          ]
        : [];

  const phoneClean = settings?.phone?.replace(/[^\d+]/g, "") ?? "";
  const whatsappClean = settings?.whatsapp?.replace(/[^\d+]/g, "") ?? "";

  return (
    <Container className="py-10 lg:py-14">
      {/* Хлебные крошки */}
      <nav className="flex items-center gap-1 text-sm text-text/60">
        <Link href="/" className="transition hover:text-primary">
          Главная
        </Link>
        <ChevronRight size={14} />
        <span className="text-text">Контакты</span>
      </nav>

      {/* Заголовок */}
      <div className="mt-6 max-w-2xl">
        <h1 className="font-montserrat text-3xl font-bold text-text md:text-4xl">
          Контакты
        </h1>
        <p className="mt-3 text-base text-text/60">
          Свяжитесь с нами удобным способом или оставьте заявку — ответим в
          течение рабочего дня.
        </p>
      </div>

      <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-[1fr_400px] lg:gap-14">
        {/* Левая колонка: контакты + карта */}
        <div className="space-y-8">
          {/* Контакты */}
          <div className="space-y-6">
            {settings?.phone && (
              <div className="flex gap-4">
                <div className="flex h-11 w-11 flex-none items-center justify-center rounded-lg bg-beige text-primary">
                  <Phone size={20} strokeWidth={1.75} />
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-text/50">
                    Телефон
                  </p>
                  <a
                    href={`tel:${phoneClean}`}
                    className="mt-1 block font-montserrat text-lg font-semibold text-text transition hover:text-primary"
                  >
                    {settings.phone}
                  </a>
                  <p className="mt-1 text-sm text-text/60">
                    Пн–Пт, 9:00–18:00
                  </p>
                </div>
              </div>
            )}

            {settings?.email && (
              <div className="flex gap-4">
                <div className="flex h-11 w-11 flex-none items-center justify-center rounded-lg bg-beige text-primary">
                  <Mail size={20} strokeWidth={1.75} />
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-text/50">
                    Email
                  </p>
                  <a
                    href={`mailto:${settings.email}`}
                    className="mt-1 block font-montserrat text-lg font-semibold text-text transition hover:text-primary"
                  >
                    {settings.email}
                  </a>
                  <p className="mt-1 text-sm text-text/60">
                    Для запросов и коммерческих предложений
                  </p>
                </div>
              </div>
            )}

            {locations.map((location) => (
              <div key={location.id} className="flex gap-4">
                <div className="flex h-11 w-11 flex-none items-center justify-center rounded-lg bg-beige text-primary">
                  <MapPin size={20} strokeWidth={1.75} />
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-text/50">
                    {locations.length > 1 ? location.title : "Адрес магазина"}
                  </p>
                  <p className="mt-1 font-montserrat text-lg font-semibold text-text">
                    {location.address}
                  </p>
                  {location.hours && (
                    <p className="mt-1 text-sm text-text/60">{location.hours}</p>
                  )}
                </div>
              </div>
            ))}

            {settings?.whatsapp && (
              <div className="flex gap-4">
                <div className="flex h-11 w-11 flex-none items-center justify-center rounded-lg bg-beige text-primary">
                  <Send size={20} strokeWidth={1.75} />
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-text/50">
                    WhatsApp / Telegram
                  </p>
                  <a
                    href={`https://wa.me/${whatsappClean}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 block font-montserrat text-lg font-semibold text-text transition hover:text-primary"
                  >
                    Написать в WhatsApp
                  </a>
                  {settings.telegram && (
                    <p className="mt-1 text-sm text-text/60">
                      Telegram: {settings.telegram}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Карта */}
          {locations.length > 0 && <LocationsMap locations={locations} />}
        </div>

        {/* Правая колонка: форма */}
        <div className="rounded-2xl border border-border bg-white p-6 lg:p-8">
          <h2 className="font-montserrat text-xl font-semibold text-text">
            Оставить заявку
          </h2>
          <p className="mt-2 text-sm text-text/60">
            Заполните форму — перезвоним и обсудим детали
          </p>

          <div className="mt-6">
            <ContactForm />
          </div>
        </div>
      </div>
    </Container>
  );
}