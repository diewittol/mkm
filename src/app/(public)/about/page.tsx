import Link from "next/link";
import { ChevronRight, Hammer, TreePine, Users, Award } from "lucide-react";
import { Container } from "@/components/layout/Container";

export const metadata = {
  title: "О компании — МКМ",
  description:
    "МКМ — производство мебели из массива дерева на заказ. Более 10 лет опыта, собственный цех, ручная работа.",
};

const VALUES = [
  {
    icon: TreePine,
    title: "Работаем с любыми материалами",
    description:
      "Массив дерева, шпон, ЛДСП, МДФ. Подбираем материал под задачу и бюджет.",
  },
  {
    icon: Hammer,
    title: "Ручная работа",
    description:
      "Каждое изделие собирается вручную мастерами с опытом более 10 лет.",
  },
  {
    icon: Users,
    title: "Индивидуальный подход",
    description:
      "Работаем по вашим размерам, эскизам и пожеланиям. Без шаблонов.",
  },
  {
    icon: Award,
    title: "Гарантия 5 лет",
    description:
      "Уверены в качестве. Если что-то пойдёт не так — починим бесплатно.",
  },
];

const STATS = [
  { value: "10+", label: "лет опыта" },
  { value: "500+", label: "выполненных проектов" },
  { value: "30", label: "дней средний срок" },
  { value: "5", label: "лет гарантии" },
];

export default function AboutPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-beige py-16 lg:py-24">
        <Container>
          <nav className="flex items-center gap-1 text-sm text-text/60">
            <Link href="/" className="transition hover:text-primary">
              Главная
            </Link>
            <ChevronRight size={14} />
            <span className="text-text">О компании</span>
          </nav>

          <h1 className="mt-8 max-w-3xl font-montserrat text-4xl font-bold leading-tight text-text md:text-5xl">
            Мебель на заказ, сделанная руками
          </h1>
          <p className="mt-6 max-w-2xl text-base text-text/70 md:text-lg">
            МКМ — небольшая мастерская в Красноярске. С 2015 года мы делаем
            мебель на заказ для дома и бизнеса. Работаем с деревом, шпоном и
            плитными материалами — подбираем решение под задачу и бюджет.
          </p>
        </Container>
      </section>

      {/* О мастерской */}
      <section className="py-16 lg:py-20">
        <Container>
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-20">
            <div>
              <h2 className="font-montserrat text-3xl font-bold text-text md:text-4xl">
                Наша мастерская
              </h2>
              <div className="mt-6 space-y-4 text-base leading-relaxed text-text/70">
                <p>
                  Мы работаем в собственном цехе площадью 400 м². Здесь есть всё
                  для полного цикла: раскрой, кромкование, покраска, финишная
                  отделка. Не отдаём работу на подряд — делаем сами.
                </p>
                <p>
                  Наша команда — четыре мастера-столяра, дизайнер и технолог.
                  Такой небольшой состав позволяет уделять внимание каждому
                  заказу и не превращать производство в конвейер.
                </p>
                <p>
                  За 10 лет мы выполнили больше 500 проектов — от отдельных
                  предметов мебели до полного оснащения квартир и загородных
                  домов.
                </p>
              </div>
            </div>

            <div className="aspect-[4/3] w-full rounded-2xl bg-beige" />
          </div>
        </Container>
      </section>

      {/* Цифры */}
      <section className="border-y border-border bg-white py-12">
        <Container>
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {STATS.map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="font-montserrat text-4xl font-bold text-primary md:text-5xl">
                  {stat.value}
                </p>
                <p className="mt-2 text-sm text-text/60">{stat.label}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* Принципы */}
      <section className="py-16 lg:py-20">
        <Container>
          <div className="max-w-2xl">
            <p className="font-montserrat text-sm font-medium uppercase tracking-widest text-primary">
              Принципы
            </p>
            <h2 className="mt-3 font-montserrat text-3xl font-bold text-text md:text-4xl">
              Что для нас важно
            </h2>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {VALUES.map((value) => {
              const Icon = value.icon;
              return (
                <div key={value.title}>
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-beige text-primary">
                    <Icon size={24} strokeWidth={1.75} />
                  </div>
                  <h3 className="mt-5 font-montserrat text-base font-semibold text-text">
                    {value.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-text/70">
                    {value.description}
                  </p>
                </div>
              );
            })}
          </div>
        </Container>
      </section>
    </>
  );
}
