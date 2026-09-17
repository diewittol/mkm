import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { Container } from "@/components/layout/Container";
import { prisma } from "@/lib/prisma";

export const Categories = async () => {
  const categories = await prisma.category.findMany({
    orderBy: { order: "asc" },
  });

  if (categories.length === 0) {
    return null;
  }

  return (
    <section className="bg-background py-16 lg:py-20">
      <Container>
        {/* Заголовок секции */}
        <div className="mb-10 flex items-end justify-between">
          <div>
            <p className="font-montserrat text-sm font-medium uppercase tracking-widest text-primary">
              Каталог
            </p>
            <h2 className="mt-3 font-montserrat text-3xl font-bold text-text md:text-4xl">
              Категории мебели
            </h2>
          </div>
          <Link
            href="/catalog"
            className="hidden items-center gap-2 text-sm font-medium text-primary transition hover:text-primary-dark md:flex"
          >
            Смотреть все
            <ArrowRight size={16} />
          </Link>
        </div>

        {/* Сетка категорий */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:gap-5 lg:grid-cols-4">
          {categories.map((category) => (
            <Link
              key={category.id}
              href={`/catalog?category=${category.slug}`}
              className="group block"
            >
              <article className="overflow-hidden rounded-2xl border border-border bg-white transition hover:-translate-y-1 hover:shadow-lg">
                <div className="relative aspect-[4/3] overflow-hidden bg-beige">
                  {category.image && (
                    <Image
                      src={category.image}
                      alt={category.name}
                      fill
                      sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
                      className="object-cover transition duration-500 group-hover:scale-105"
                    />
                  )}
                </div>

                <div className="flex items-center justify-between p-4">
                  <h3 className="font-montserrat text-base font-semibold text-text">
                    {category.name}
                  </h3>
                  <ArrowRight
                    size={16}
                    className="text-text/40 transition group-hover:translate-x-1 group-hover:text-primary"
                  />
                </div>
              </article>
            </Link>
          ))}
        </div>
      </Container>
    </section>
  );
};