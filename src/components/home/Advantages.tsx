import { PencilRuler, Hammer, ShieldCheck, Truck } from "lucide-react";
import { Container } from "@/components/layout/Container";

const ITEMS = [
  {
    icon: PencilRuler,
    title: "Индивидуальные размеры",
    description:
      "Изготовим мебель под ваше помещение — с точностью до миллиметра.",
  },
  {
    icon: Hammer,
    title: "Ручная работа",
    description:
      "Каждое изделие проходит через руки опытных мастеров-столяров.",
  },
  {
    icon: ShieldCheck,
    title: "Гарантия качества",
    description:
      "Используем только массив дерева и надёжную фурнитуру. Гарантия — 5 лет.",
  },
  {
    icon: Truck,
    title: "Доставка и установка",
    description:
      "Привезём и соберём мебель у вас дома или в офисе в удобное время.",
  },
];

export const Advantages = () => {
  return (
    <section className="bg-white py-16 lg:py-20">
      <Container>
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="flex flex-col">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-beige text-primary">
                  <Icon size={24} strokeWidth={1.75} />
                </div>
                <h3 className="mt-5 font-montserrat text-base font-semibold text-text">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-text/70">
                  {item.description}
                </p>
              </div>
            );
          })}
        </div>
      </Container>
    </section>
  );
};