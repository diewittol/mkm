import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import type { Product } from "@/types/product";

interface ProductCardProps {
  product: Product;
  categoryName?: string;
}

export const ProductCard = ({ product, categoryName }: ProductCardProps) => {
  return (
    <Link href={`/catalog/${product.slug}`} className="group block h-full">
      <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-white transition hover:-translate-y-1 hover:shadow-lg">
        {/* Изображение */}
        <div className="relative aspect-[4/3] overflow-hidden bg-beige">
          {product.images[0]?.url ? (
            <Image
              src={product.images[0].url}
              alt={product.images[0].alt ?? product.name}
              fill
              sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
              className="object-cover transition duration-500 group-hover:scale-105"
            />
          ) : null}
        </div>

        {/* Контент */}
        <div className="flex flex-1 flex-col p-5">
          {categoryName && (
            <p className="text-xs uppercase tracking-wider text-primary">
              {categoryName}
            </p>
          )}

          <h3 className="mt-2 font-montserrat text-lg font-semibold text-text">
            {product.name}
          </h3>

          {product.shortDescription && (
            <p className="mt-2 text-sm text-text/60">
              {product.shortDescription}
            </p>
          )}

          <div className="mt-auto flex items-center gap-2 pt-5 text-sm font-medium text-primary">
            Подробнее
            <ArrowRight
              size={16}
              className="transition group-hover:translate-x-1"
            />
          </div>
        </div>
      </article>
    </Link>
  );
};
