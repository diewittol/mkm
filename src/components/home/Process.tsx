import { Container } from "@/components/layout/Container";

const STEPS = [
  {
    number: "01",
    title: "Заявка",
    description: "Вы оставляете заявку, мы связываемся и обсуждаем детали.",
  },
  {
    number: "02",
    title: "Консультация",
    description: "Подбираем материалы, размеры и финальную комплектацию.",
  },
  {
    number: "03",
    title: "Производство",
    description: "Изготавливаем изделие в срок от 20 до 30 рабочих дней.",
  },
  {
    number: "04",
    title: "Доставка",
    description: "Привозим, собираем и устанавливаем мебель у вас.",
  },
];

export const Process = () => {
  return (
    <section className="bg-background py-16 lg:py-20">
      <Container>
        <div className="mb-12 max-w-2xl">
          <p className="font-montserrat text-sm font-medium uppercase tracking-widest text-primary">
            Как мы работаем
          </p>
          <h2 className="mt-3 font-montserrat text-3xl font-bold text-text md:text-4xl">
            Прозрачный процесс от заявки до установки
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, index) => (
            <div key={step.number} className="relative">
              <div className="font-montserrat text-5xl font-bold text-primary/30">
                {step.number}
              </div>
              <h3 className="mt-4 font-montserrat text-lg font-semibold text-text">
                {step.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-text/70">
                {step.description}
              </p>

              {/* Тонкая линия-разделитель между шагами (кроме последнего) */}
              {index < STEPS.length - 1 && (
                <div className="absolute -right-4 top-6 hidden h-px w-8 bg-border lg:block" />
              )}
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
};