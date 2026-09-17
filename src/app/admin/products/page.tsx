"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { Plus, Search, Pencil, Trash2 } from "lucide-react";

interface ProductFromApi {
  id: string;
  name: string;
  slug: string;
  shortDescription?: string | null;
  isPublished: boolean;
  category: { id: string; name: string; slug: string };
  images: { id: string; url: string }[];
}

interface CategoryFromApi {
  id: string;
  name: string;
  slug: string;
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<ProductFromApi[]>([]);
  const [categories, setCategories] = useState<CategoryFromApi[]>([]);
  const [isLoading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");

  // Загружаем товары и категории при старте
  useEffect(() => {
    Promise.all([
      fetch("/api/admin/products").then((r) => r.json()),
      fetch("/api/categories").then((r) => r.json()),
    ])
      .then(([productsData, categoriesData]) => {
        setProducts(productsData);
        setCategories(categoriesData);
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch = product.name
        .toLowerCase()
        .includes(search.toLowerCase());
      const matchesCategory = !category || product.category.slug === category;
      return matchesSearch && matchesCategory;
    });
  }, [products, search, category]);

  const handleDelete = async (product: ProductFromApi) => {
    if (!confirm(`Удалить изделие «${product.name}»?`)) return;

    const response = await fetch(`/api/products/delete/${product.id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      alert("Не удалось удалить");
      return;
    }

    setProducts((prev) => prev.filter((p) => p.id !== product.id));
  };

  return (
    <div>
      {/* Заголовок */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-montserrat text-2xl font-bold text-text md:text-3xl">
            Изделия
          </h1>
          <p className="mt-1 text-sm text-text/60">
            Все изделия вашего каталога
          </p>
        </div>

        <Link
          href="/admin/products/create"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition hover:bg-primary-dark"
        >
          <Plus size={16} />
          Добавить изделие
        </Link>
      </div>

      {/* Фильтры */}
      <div className="mt-8 flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search
            size={18}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-text/40"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск изделий"
            className="w-full rounded-lg border border-border bg-white py-3 pl-11 pr-4 text-sm text-text outline-none transition placeholder:text-text/40 focus:border-primary"
          />
        </div>

        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-lg border border-border bg-white px-4 py-3 text-sm text-text outline-none transition focus:border-primary"
        >
          <option value="">Все категории</option>
          {categories.map((c) => (
            <option key={c.id} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Таблица */}
      <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead className="border-b border-border bg-background/50">
              <tr className="text-left text-xs font-medium uppercase tracking-wider text-text/50">
                <th className="px-5 py-3">Фото</th>
                <th className="px-5 py-3">Название</th>
                <th className="px-5 py-3">Категория</th>
                <th className="px-5 py-3">Статус</th>
                <th className="px-5 py-3 text-right">Действия</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-16 text-center text-sm text-text/60"
                  >
                    Загрузка…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-16 text-center text-sm text-text/60"
                  >
                    Ничего не найдено
                  </td>
                </tr>
              ) : (
                filtered.map((product) => (
                  <tr
                    key={product.id}
                    className="border-b border-border last:border-0 hover:bg-background/50"
                  >
                    <td className="px-5 py-3">
                      <div className="relative h-12 w-12 overflow-hidden rounded-lg bg-beige">
                        {product.images?.[0]?.url && (
                          <Image
                            src={product.images[0].url}
                            alt={product.name}
                            fill
                            sizes="48px"
                            className="object-cover"
                          />
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <Link
                        href={`/admin/products/${product.id}/edit`}
                        className="font-medium text-text transition hover:text-primary"
                      >
                        {product.name}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-sm text-text/70">
                      {product.category.name}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                          product.isPublished
                            ? "bg-green-50 text-green-700"
                            : "bg-yellow-50 text-yellow-700"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            product.isPublished
                              ? "bg-green-500"
                              : "bg-yellow-500"
                          }`}
                        />
                        {product.isPublished ? "Опубликовано" : "Черновик"}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-1">
                        <Link
                          href={`/admin/products/${product.id}/edit`}
                          aria-label="Редактировать"
                          className="flex h-9 w-9 items-center justify-center rounded-lg text-text/60 transition hover:bg-beige hover:text-primary"
                        >
                          <Pencil size={16} />
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleDelete(product)}
                          aria-label="Удалить"
                          className="flex h-9 w-9 items-center justify-center rounded-lg text-text/60 transition hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="mt-4 text-sm text-text/60">
        Найдено: {filtered.length} из {products.length}
      </p>
    </div>
  );
}
