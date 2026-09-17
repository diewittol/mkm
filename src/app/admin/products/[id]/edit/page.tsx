"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ProductForm,
  type ProductFormValues,
} from "@/components/admin/ProductForm";
import type { Product } from "@/types/product";

interface EditProductPageProps {
  params: Promise<{ id: string }>;
}

export default function ProductEditPage({ params }: EditProductPageProps) {
  const { id } = use(params);
  const router = useRouter();

  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch(`/api/products/${id}`)
      .then(async (r) => {
        if (!r.ok) {
          setNotFound(true);
          return;
        }
        const data = await r.json();
        setProduct(data);
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleSubmit = async (values: ProductFormValues) => {
    const response = await fetch(`/api/products/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      alert(error.error ?? "Не удалось сохранить изменения");
      return;
    }

    router.push("/admin/products");
  };

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-border bg-white p-10 text-center">
        <p className="text-sm text-text/60">Загрузка…</p>
      </div>
    );
  }

  if (notFound || !product) {
    return (
      <div className="rounded-2xl border border-border bg-white p-10 text-center">
        <h1 className="font-montserrat text-xl font-semibold text-text">
          Изделие не найдено
        </h1>
        <p className="mt-2 text-sm text-text/60">
          Возможно, оно было удалено или ссылка некорректна.
        </p>
        <Link
          href="/admin/products"
          className="mt-6 inline-block rounded-lg bg-primary px-6 py-3 text-sm font-medium text-white transition hover:bg-primary-dark"
        >
          Вернуться к списку
        </Link>
      </div>
    );
  }

  return <ProductForm mode="edit" product={product} onSubmit={handleSubmit} />;
}