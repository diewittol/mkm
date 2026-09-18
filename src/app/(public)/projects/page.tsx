import Link from "next/link";
import Image from "next/image";
import { ChevronRight } from "lucide-react";
import { Container } from "@/components/layout/Container";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Реализованные проекты — МКМ",
  description:
    "Портфолио МКМ: мебель на заказ для квартир, домов и офисов. Смотрите реализованные проекты с фото и описанием.",
};

export default async function ProjectsPage() {
  const projects = await prisma.project.findMany({
    where: { isPublished: true },
    include: { images: { orderBy: { order: "asc" }, take: 1 } },
    orderBy: { order: "asc" },
  });

  return (
    <Container className="py-10 lg:py-14">
      {/* Хлебные крошки */}
      <nav className="flex items-center gap-1 text-sm text-text/60">
        <Link href="/" className="transition hover:text-primary">
          Главная
        </Link>
        <ChevronRight size={14} />
        <span className="text-text">Проекты</span>
      </nav>

      {/* Заголовок */}
      <div className="mt-6 max-w-2xl">
        <h1 className="font-montserrat text-3xl font-bold text-text md:text-4xl">
          Реализованные проекты
        </h1>
        <p className="mt-3 text-base text-text/60">
          Более 500 проектов за 10 лет. Здесь — некоторые из них. Похожий
          проект можно адаптировать под ваш интерьер.
        </p>
      </div>

      {/* Сетка проектов */}
      {projects.length === 0 ? (
        <div className="mt-12 rounded-2xl border border-dashed border-border bg-white py-20 text-center">
          <p className="text-sm text-text/60">Пока нет опубликованных проектов</p>
        </div>
      ) : (
        <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/projects/${project.slug}`}
              className="group block"
            >
              <article className="overflow-hidden rounded-2xl border border-border bg-white transition hover:-translate-y-1 hover:shadow-lg">
                <div className="relative aspect-[4/5] overflow-hidden bg-beige">
                  {project.images[0]?.url && (
                    <Image
                      src={project.images[0].url}
                      alt={project.title}
                      fill
                      sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                      className="object-cover transition duration-500 group-hover:scale-105"
                    />
                  )}
                </div>
                <div className="p-5">
                  <h3 className="font-montserrat text-lg font-semibold text-text">
                    {project.title}
                  </h3>
                  {project.location && (
                    <p className="mt-1 text-sm text-text/60">
                      {project.location}
                    </p>
                  )}
                  {project.description && (
                    <p className="mt-3 line-clamp-2 text-sm text-text/70">
                      {project.description}
                    </p>
                  )}
                </div>
              </article>
            </Link>
          ))}
        </div>
      )}
    </Container>
  );
}