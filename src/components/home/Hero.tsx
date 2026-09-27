import Link from "next/link";
import Image from "next/image";
import { Container } from "@/components/layout/Container";
import { getSettings } from "@/lib/settings";
import { heroOverlayColor, resolveHero } from "@/lib/hero";

export const Hero = async () => {
  const hero = resolveHero(await getSettings());
  const isLight = hero.theme === "light";

  return (
    <section className="relative overflow-hidden bg-beige">
      {/* Фон: фото, цвет или стандартный бежевый градиент (настраивается в админке) */}
      {hero.mode === "image" && hero.image ? (
        <>
          <Image
            src={hero.image}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
          <div
            className="absolute inset-0"
            style={{ backgroundColor: heroOverlayColor(hero.theme, hero.overlay) }}
          />
        </>
      ) : hero.mode === "color" ? (
        <div className="absolute inset-0" style={{ backgroundColor: hero.color ?? undefined }} />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-beige via-background to-beige" />
      )}

      <Container className="relative">
        <div className="flex min-h-[600px] flex-col justify-center py-20 lg:min-h-[720px]">
          <p
            className={`mb-4 font-montserrat text-sm font-medium uppercase tracking-widest ${
              isLight ? "text-white/80" : "text-primary"
            }`}
          >
            Производство мебели
          </p>

          <h1
            className={`max-w-3xl font-montserrat text-4xl font-bold leading-tight md:text-5xl lg:text-6xl ${
              isLight ? "text-white" : "text-text"
            }`}
          >
            Мебель из массива дерева на заказ
          </h1>

          <p className={`mt-6 max-w-xl text-base md:text-lg ${isLight ? "text-white/85" : "text-text/70"}`}>
            Создаём мебель по индивидуальным размерам для дома и бизнеса.
            Точный раскрой на ЧПУ, честные сроки, материалы высшего качества.
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
              className={`rounded-lg border px-7 py-3.5 font-medium transition ${
                isLight
                  ? "border-white/50 text-white hover:border-white hover:bg-white/10"
                  : "border-text/20 text-text hover:border-primary hover:text-primary"
              }`}
            >
              О производстве
            </Link>
          </div>
        </div>
      </Container>
    </section>
  );
};
