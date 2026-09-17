import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Container } from "@/components/layout/Container";
import { CategoryFilter } from "@/components/catalog/CategoryFilter";
import { ProductGrid } from "@/components/catalog/ProductGrid";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

interface CatalogPageProps {
  searchParams: Promise<{ category?: string }>;
}

export async function generateMetadata({
  searchParams,
}: CatalogPageProps): Promise<Metadata> {
  const { category } = await searchParams;

  if (!category) {
    return {
      title: "Каталог мебели — МКМ",
      description:
        "Мебель из массива дерева по индивидуальным размерам. Все изделия изготавливаются на заказ под ваше помещение.",
    };
  }

  const categoryRecord = await prisma.category.findUnique({
    where: { slug: category },
  });

  const name = categoryRecord?.name ?? "Каталог";

  return {
    title: `${name} — Каталог — МКМ`,
    description:
      categoryRecord?.description ??
      `${name}: мебель из массива дерева на заказ.`,
  };
}

export default async function CatalogPage({ searchParams }: CatalogPageProps) {
  const { category } = await searchParams;

  const [products, categories] = await Promise.all([
    prisma.product.findMany({
      where: {
        isPublished: true,
        ...(category ? { category: { slug: category } } : {}),
      },
      include: {
        category: true,
        images: { orderBy: { order: "asc" } },
        specifications: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.category.findMany({ orderBy: { order: "asc" } }),
  ]);

  const categoryNameById = Object.fromEntries(
    products.map((p) => [p.categoryId, p.category.name]),
  );

  const currentCategoryName = category
    ? categories.find((c) => c.slug === category)?.name
    : undefined;

  return (
    <Container className="py-10 lg:py-14">
      {/* Хлебные крошки */}
      <nav className="flex items-center gap-1 text-sm text-text/60">
        <Link href="/" className="transition hover:text-primary">
          Главная
        </Link>
        <ChevronRight size={14} />
        <Link href="/catalog" className="transition hover:text-primary">
          Каталог
        </Link>
        {currentCategoryName && (
          <>
            <ChevronRight size={14} />
            <span className="text-text">{currentCategoryName}</span>
          </>
        )}
      </nav>

      {/* Заголовок */}
      <div className="mt-6">
        <h1 className="font-montserrat text-3xl font-bold text-text md:text-4xl">
          Каталог мебели
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-text/60 md:text-base">
          Мебель из массива дерева по индивидуальным размерам. Все изделия
          изготавливаются на заказ под ваше помещение.
        </p>
      </div>

      {/* Фильтр категорий */}
      <div className="mt-8">
        <CategoryFilter
          categories={categories}
          currentCategory={category ?? ""}
        />
      </div>

      {/* Сетка товаров */}
      <div className="mt-8">
        <ProductGrid
          products={products as never}
          categoryNameById={categoryNameById}
        />
      </div>
    </Container>
  );
}