"use client";

import { useRouter } from "next/navigation";
import {
  ProductForm,
  type ProductFormValues,
} from "@/components/admin/ProductForm";

export default function ProductCreatePage() {
  const router = useRouter();

  const handleSubmit = async (values: ProductFormValues) => {
    const response = await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      alert(error.error ?? "Не удалось сохранить изделие");
      return;
    }

    router.push("/admin/products");
  };

  return <ProductForm mode="create" onSubmit={handleSubmit} />;
}