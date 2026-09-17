import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Container } from "@/components/layout/Container";
import { ProductCard } from "@/components/catalog/ProductCard";
import { prisma } from "@/lib/prisma";

export const PopularProducts = async () => {
  const products = await prisma.product.findMany({
    where: { isPublished: true },
    include: {
      category: true,
      images: { orderBy: { order: "asc" } },
      specifications: true,
    },
    orderBy: { createdAt: "desc" },
    take: 4,
  });

  if (products.length === 0) {
    return null;
  }

  return (
    <section className="bg-white py-16 lg:py-20">
      <Container>
        <div className="mb-10 flex items-end justify-between">
          <div>
            <p className="font-montserrat text-sm font-medium uppercase tracking-widest text-primary">
              Каталог
            </p>
            <h2 className="mt-3 font-montserrat text-3xl font-bold text-text md:text-4xl">
              Популярные изделия
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

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product as never}
              categoryName={product.category.name}
            />
          ))}
        </div>
      </Container>
    </section>
  );
};