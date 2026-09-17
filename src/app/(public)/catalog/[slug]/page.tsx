import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { Container } from "@/components/layout/Container";
import { ProductActions } from "@/components/product/ProductActions";
import { prisma } from "@/lib/prisma";
import type { Metadata } from "next";

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await prisma.product.findUnique({
    where: { slug },
    include: { category: true, images: true },
  });

  if (!product) {
    return { title: "Изделие не найдено — МКМ" };
  }

  const title = product.seoTitle ?? `${product.name} — МКМ`;
  const description =
    product.seoDescription ??
    product.shortDescription ??
    `${product.name} из категории «${product.category.name}». Мебель на заказ.`;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: product.images?.[0]?.url ? [product.images[0].url] : [],
    },
  };
}



export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;

  const product = await prisma.product.findUnique({
    where: { slug },
    include: {
      category: true,
      images: { orderBy: { order: "asc" } },
      specifications: true,
    },
  });

  if (!product || !product.isPublished) {
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
        <Link href="/catalog" className="transition hover:text-primary">
          Каталог
        </Link>
        <ChevronRight size={14} />
        <Link
          href={`/catalog?category=${product.category.slug}`}
          className="transition hover:text-primary"
        >
          {product.category.name}
        </Link>
        <ChevronRight size={14} />
        <span className="text-text">{product.name}</span>
      </nav>

      {/* Основной блок */}
      <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-14">
        {/* Галерея */}
        <div>
          {/* Главная картинка */}
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-beige">
            {product.images[0]?.url ? (
              <Image
                src={product.images[0].url}
                alt={product.images[0].alt ?? product.name}
                fill
                priority
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="object-cover"
              />
            ) : null}
          </div>

          {/* Миниатюры */}
          {product.images.length > 1 && (
            <div className="mt-4 grid grid-cols-3 gap-3">
              {product.images.slice(1, 4).map((img) => (
                <div
                  key={img.id}
                  className="relative aspect-square overflow-hidden rounded-xl bg-beige"
                >
                  <Image
                    src={img.url}
                    alt={img.alt ?? product.name}
                    fill
                    sizes="(min-width: 1024px) 17vw, 33vw"
                    className="object-cover"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Информация */}
        <div>
          <h1 className="font-montserrat text-3xl font-bold text-text md:text-4xl">
            {product.name}
          </h1>

          {product.shortDescription && (
            <p className="mt-3 text-base text-text/60">
              {product.shortDescription}
            </p>
          )}

          {product.description && (
            <p className="mt-6 text-sm leading-relaxed text-text/70">
              {product.description}
            </p>
          )}

          {product.specifications.length > 0 && (
            <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-border pt-6">
              {product.specifications.map((spec) => (
                <div key={spec.id}>
                  <dt className="text-xs uppercase tracking-wider text-text/50">
                    {spec.name}
                  </dt>
                  <dd className="mt-1 text-sm text-text">{spec.value}</dd>
                </div>
              ))}
            </dl>
          )}

          <div className="mt-8 border-t border-border pt-6">
            <p className="text-sm font-medium text-text">
              Стоимость рассчитывается индивидуально
            </p>
          </div>

          <ProductActions productName={product.name} />
        </div>
      </div>
    </Container>
  );
}
