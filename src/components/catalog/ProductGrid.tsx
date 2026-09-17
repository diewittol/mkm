import { PackageSearch } from "lucide-react";
import { ProductCard } from "./ProductCard";
import type { Product } from "@/types/product";

interface ProductGridProps {
  products: Product[];
  categoryNameById?: Record<string, string>;
}

export const ProductGrid = ({
  products,
  categoryNameById,
}: ProductGridProps) => {
  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-white py-20">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-beige text-primary">
          <PackageSearch size={26} strokeWidth={1.75} />
        </div>
        <h3 className="mt-5 font-montserrat text-lg font-semibold text-text">
          Ничего не найдено
        </h3>
        <p className="mt-2 max-w-sm text-center text-sm text-text/60">
          Попробуйте выбрать другую категорию или вернуться ко всему каталогу.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          categoryName={
            categoryNameById ? categoryNameById[product.categoryId] : undefined
          }
        />
      ))}
    </div>
  );
};