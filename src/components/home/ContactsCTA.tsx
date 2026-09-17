import Link from "next/link";
import { Container } from "@/components/layout/Container";

export const ContactsCTA = () => {
  return (
    <section className="bg-background pt-16 lg:pt-20">
      <Container>
        <div className="relative overflow-hidden rounded-3xl bg-primary-dark">
          {/* Фоновая заглушка — позже заменим на фото с листьями */}
          <div className="absolute inset-0 bg-gradient-to-r from-primary-dark via-primary to-primary-dark" />

          <div className="relative px-8 py-14 md:px-14 md:py-20 lg:px-20">
            <div className="max-w-xl">
              <p className="font-montserrat text-sm font-medium uppercase tracking-widest text-white/70">
                Контакты
              </p>
              <h2 className="mt-3 font-montserrat text-3xl font-bold text-white md:text-4xl">
                Есть вопросы? Мы всегда на связи
              </h2>
              <p className="mt-4 text-base text-white/80 md:text-lg">
                Оставьте заявку — свяжемся в течение рабочего дня, обсудим
                детали и рассчитаем стоимость.
              </p>

              <Link
                href="/contacts"
                className="mt-8 inline-block rounded-lg bg-white px-7 py-3.5 font-medium text-primary-dark transition hover:bg-beige"
              >
                Связаться с нами
              </Link>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
};