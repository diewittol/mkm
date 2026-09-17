import Link from "next/link";
import { Container } from "@/components/layout/Container";

export const Hero = () => {
  return (
    <section className="relative overflow-hidden bg-beige">
      {/* Фоновая заглушка. Позже заменим на настоящее фото */}
      <div className="absolute inset-0 bg-gradient-to-br from-beige via-background to-beige" />

      <Container className="relative">
        <div className="flex min-h-[600px] flex-col justify-center py-20 lg:min-h-[720px]">
          <p className="mb-4 font-montserrat text-sm font-medium uppercase tracking-widest text-primary">
            Производство мебели
          </p>

          <h1 className="max-w-3xl font-montserrat text-4xl font-bold leading-tight text-text md:text-5xl lg:text-6xl">
            Мебель из массива дерева на заказ
          </h1>

          <p className="mt-6 max-w-xl text-base text-text/70 md:text-lg">
            Создаём мебель по индивидуальным размерам для дома и бизнеса.
            Ручная работа, честные сроки, материалы высшего качества.
          </p>

          <div className="mt-10 flex flex-wrap gap-4">
            <Link
              href="/catalog"
              className="rounded-lg bg-primary px-7 py-3.5 font-medium text-white transition hover:bg-primary-dark"
            >
              Смотреть каталог
            </Link>
            <Link
              href="/about"
              className="rounded-lg border border-text/20 px-7 py-3.5 font-medium text-text transition hover:border-primary hover:text-primary"
            >
              О производстве
            </Link>
          </div>
        </div>
      </Container>
    </section>
  );
};