"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { CategoryForm } from "@/components/admin/CategoryForm";
import type { Category } from "@/types/category";
import type { CategoryFormValues } from "@/lib/schemas";

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Category | null>(null);
  const [isModalOpen, setModalOpen] = useState(false);

  // Загрузка
  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then(setCategories)
      .finally(() => setLoading(false));
  }, []);

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (category: Category) => {
    setEditing(category);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
  };

  const handleSubmit = async (values: CategoryFormValues) => {
    const url = editing
      ? `/api/categories/${editing.id}`
      : "/api/categories";
    const method = editing ? "PATCH" : "POST";

    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      alert(error.error ?? "Не удалось сохранить");
      return;
    }

    const saved: Category = await response.json();

    if (editing) {
      setCategories((prev) =>
        prev.map((c) => (c.id === editing.id ? saved : c)),
      );
    } else {
      setCategories((prev) => [...prev, saved]);
    }
    closeModal();
  };

  const handleDelete = async (category: Category) => {
    if (!confirm(`Удалить категорию «${category.name}»?`)) return;

    const response = await fetch(`/api/categories/${category.id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      alert("Не удалось удалить");
      return;
    }

    setCategories((prev) => prev.filter((c) => c.id !== category.id));
  };

  return (
    <div>
      {/* Заголовок */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-montserrat text-2xl font-bold text-text md:text-3xl">
            Категории
          </h1>
          <p className="mt-1 text-sm text-text/60">
            Категории мебели в вашем каталоге
          </p>
        </div>

        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition hover:bg-primary-dark"
        >
          <Plus size={16} />
          Добавить категорию
        </button>
      </div>

      {/* Таблица */}
      <div className="mt-8 overflow-hidden rounded-2xl border border-border bg-white">
        <div className="overflow-x-auto">
          <table className="table-stack w-full">
            <thead className="border-b border-border bg-background/50">
              <tr className="text-left text-xs font-medium uppercase tracking-wider text-text/50">
                <th className="px-5 py-3">Изображение</th>
                <th className="px-5 py-3">Название</th>
                <th className="px-5 py-3">Slug</th>
                <th className="px-5 py-3">Порядок</th>
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
              ) : categories.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-16 text-center text-sm text-text/60"
                  >
                    Пока нет категорий. Добавьте первую.
                  </td>
                </tr>
              ) : (
                categories.map((category) => (
                  <tr
                    key={category.id}
                    className="border-b border-border last:border-0 hover:bg-background/50"
                  >
                    <td className="px-5 py-3">
                      <div className="relative h-12 w-12 overflow-hidden rounded-lg bg-beige">
                        {category.image && (
                          <Image
                            src={category.image}
                            alt={category.name}
                            fill
                            sizes="48px"
                            className="object-cover"
                          />
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className="font-medium text-text">
                        {category.name}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-sm text-text/70" data-label="Slug">
                      {category.slug}
                    </td>
                    <td className="px-5 py-3 text-sm text-text/70" data-label="Порядок">
                      {category.order}
                    </td>
                    <td className="px-5 py-3" data-actions>
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(category)}
                          aria-label="Редактировать"
                          className="flex h-9 w-9 items-center justify-center rounded-lg text-text/60 transition hover:bg-beige hover:text-primary"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(category)}
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
        Всего: {categories.length}
      </p>

      {/* Модалка */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editing ? "Редактировать категорию" : "Новая категория"}
      >
        <CategoryForm
          category={editing ?? undefined}
          onSubmit={handleSubmit}
          onCancel={closeModal}
        />
      </Modal>
    </div>
  );
}