import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { Container } from "@/components/layout/Container";
import { prisma } from "@/lib/prisma";

interface ProjectPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: ProjectPageProps) {
  const { slug } = await params;
  const project = await prisma.project.findUnique({ where: { slug } });

  if (!project) {
    return { title: "Проект не найден — МКМ" };
  }

  return {
    title: `${project.title} — МКМ`,
    description:
      project.description ??
      `Реализованный проект: ${project.title}. Мебель на заказ.`,
  };
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { slug } = await params;

  const project = await prisma.project.findUnique({
    where: { slug },
    include: { images: { orderBy: { order: "asc" } } },
  });

  if (!project || !project.isPublished) {
    notFound();
  }

  return (
    <Container className="py-10 lg:py-14">
      {/* Хлебные крошки */}
      <nav className="flex flex-wrap items-center gap-1 text-sm text-text/60">
        <Link href="/" className="transition hover:text-primary">
          Главная
        </Link>
        <ChevronRight size={14} />
        <Link href="/projects" className="transition hover:text-primary">
          Проекты
        </Link>
        <ChevronRight size={14} />
        <span className="text-text">{project.title}</span>
      </nav>

      {/* Заголовок */}
      <div className="mt-8 max-w-3xl">
        <h1 className="font-montserrat text-3xl font-bold text-text md:text-4xl">
          {project.title}
        </h1>
        {project.location && (
          <p className="mt-3 text-base text-text/60">{project.location}</p>
        )}
      </div>

      {/* Главное фото */}
      <div className="relative mt-8 aspect-[16/9] w-full overflow-hidden rounded-2xl bg-beige">
        {project.images[0]?.url && (
          <Image
            src={project.images[0].url}
            alt={project.images[0].alt ?? project.title}
            fill
            priority
            sizes="(min-width: 1024px) 1024px, 100vw"
            className="object-cover"
          />
        )}
      </div>

      {/* Остальные фото */}
      {project.images.length > 1 && (
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {project.images.slice(1).map((img) => (
            <div
              key={img.id}
              className="relative aspect-square overflow-hidden rounded-xl bg-beige"
            >
              <Image
                src={img.url}
                alt={img.alt ?? project.title}
                fill
                sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
                className="object-cover"
              />
            </div>
          ))}
        </div>
      )}

      {/* Описание */}
      {project.description && (
        <div className="mt-10 max-w-3xl">
          <p className="text-base leading-relaxed text-text/80">
            {project.description}
          </p>
        </div>
      )}

      {/* CTA */}
      <div className="mt-14 rounded-2xl bg-beige p-8 lg:p-12">
        <h2 className="font-montserrat text-2xl font-bold text-text">
          Хотите похожий проект?
        </h2>
        <p className="mt-3 max-w-xl text-base text-text/70">
          Расскажите о своей задаче — подберём решение и рассчитаем стоимость.
        </p>
        <Link
          href="/contacts"
          className="mt-6 inline-block rounded-lg bg-primary px-7 py-3.5 font-medium text-white transition hover:bg-primary-dark"
        >
          Связаться с нами
        </Link>
      </div>
    </Container>
  );
}