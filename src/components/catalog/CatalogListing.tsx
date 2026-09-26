import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Container } from "@/components/layout/Container";
import { CategoryFilter } from "@/components/catalog/CategoryFilter";
import { ProductGrid } from "@/components/catalog/ProductGrid";
import { JsonLd } from "@/components/seo/JsonLd";
import { prisma } from "@/lib/prisma";
import { breadcrumbLd, categoryPath, itemListLd } from "@/lib/seo";

// Каталог целиком (/catalog) или одна категория (/catalog/category/<slug>)
export async function CatalogListing({ categorySlug }: { categorySlug?: string }) {
  const [products, categories] = await Promise.all([
    prisma.product.findMany({
      where: {
        isPublished: true,
        ...(categorySlug ? { category: { slug: categorySlug } } : {}),
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

  const current = categorySlug ? categories.find((c) => c.slug === categorySlug) : undefined;

  const crumbs = [
    { name: "Главная", path: "/" },
    { name: "Каталог", path: "/catalog" },
    ...(current ? [{ name: current.name, path: categoryPath(current.slug) }] : []),
  ];

  return (
    <Container className="py-10 lg:py-14">
      <JsonLd data={breadcrumbLd(crumbs)} />
      <JsonLd
        data={itemListLd(products.map((p) => ({ name: p.name, path: `/catalog/${p.slug}` })))}
      />

      {/* Хлебные крошки */}
      <nav className="flex items-center gap-1 text-sm text-text/60">
        <Link href="/" className="transition hover:text-primary">
          Главная
        </Link>
        <ChevronRight size={14} />
        {current ? (
          <>
            <Link href="/catalog" className="transition hover:text-primary">
              Каталог
            </Link>
            <ChevronRight size={14} />
            <span className="text-text">{current.name}</span>
          </>
        ) : (
          <span className="text-text">Каталог</span>
        )}
      </nav>

      {/* Заголовок */}
      <div className="mt-6">
        <h1 className="font-montserrat text-3xl font-bold text-text md:text-4xl">
          {current ? `${current.name} на заказ` : "Каталог мебели на заказ"}
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-text/60 md:text-base">
          {current?.description ??
            "Мебель по индивидуальным размерам. Все изделия изготавливаются на заказ под ваше помещение."}
        </p>
      </div>

      {/* Фильтр категорий */}
      <div className="mt-8">
        <CategoryFilter categories={categories} currentCategory={categorySlug ?? ""} />
      </div>

      {/* Сетка товаров */}
      <div className="mt-8">
        <ProductGrid products={products as never} categoryNameById={categoryNameById} />
      </div>
    </Container>
  );
}
