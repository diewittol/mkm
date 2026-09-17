"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Plus, X } from "lucide-react";
import { Input } from "@/components/ui/Input";
import type { Product } from "@/types/product";
import { ImageUploader } from "./ImageUploader";

const productFormSchema = z.object({
  name: z.string().min(2, "Введите название"),
  categoryId: z.string().min(1, "Выберите категорию"),
  shortDescription: z.string().optional(),
  description: z.string().optional(),
  specifications: z
    .array(
      z.object({
        name: z.string().min(1, "Введите название"),
        value: z.string().min(1, "Введите значение"),
      }),
    )
    .default([]),
  images: z
    .array(
      z.object({
        id: z.string(),
        url: z.string(),
      }),
    )
    .default([]),
  seoTitle: z.string().max(70, "До 70 символов").optional(),
  seoDescription: z.string().max(160, "До 160 символов").optional(),
  slug: z
    .string()
    .regex(/^[a-z0-9-]*$/, "Только латиница, цифры и дефисы")
    .optional(),
  isPublished: z.boolean(),
});

export type ProductFormValues = z.infer<typeof productFormSchema>;

interface CategoryOption {
  id: string;
  slug: string;
  name: string;
}

const TABS = [
  { id: "main", label: "Основное" },
  { id: "specs", label: "Характеристики" },
  { id: "photos", label: "Фотографии" },
  { id: "seo", label: "SEO" },
] as const;

type TabId = (typeof TABS)[number]["id"];

interface ProductFormProps {
  mode: "create" | "edit";
  product?: Product;
  onSubmit: (values: ProductFormValues) => void | Promise<void>;
}

export const ProductForm = ({ mode, product, onSubmit }: ProductFormProps) => {
  const [activeTab, setActiveTab] = useState<TabId>("main");
  const [categories, setCategories] = useState<CategoryOption[]>([]);

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then(setCategories);
  }, []);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<
    z.input<typeof productFormSchema>,
    unknown,
    ProductFormValues
  >({
    resolver: zodResolver(productFormSchema),
    defaultValues: product
      ? {
          name: product.name,
          categoryId: product.categoryId,
          shortDescription: product.shortDescription ?? "",
          description: product.description ?? "",
          specifications:
            product.specifications.length > 0
              ? product.specifications.map((s) => ({
                  name: s.name,
                  value: s.value,
                }))
              : [{ name: "", value: "" }],
          images: (product.images ?? [])
            .filter((img) => img.url)
            .map((img) => ({ id: img.id, url: img.url })),
          seoTitle: "",
          seoDescription: "",
          slug: product.slug,
          isPublished: product.isPublished,
        }
      : {
          name: "",
          categoryId: "",
          shortDescription: "",
          description: "",
          specifications: [{ name: "", value: "" }],
          images: [],
          seoTitle: "",
          seoDescription: "",
          slug: "",
          isPublished: true,
        },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "specifications",
  });

  const images = watch("images") ?? [];

  return (
    <div>
      {/* Заголовок */}
      <div className="flex items-center gap-4">
        <Link
          href="/admin/products"
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-white text-text/60 transition hover:border-primary hover:text-primary"
          aria-label="Назад к списку"
        >
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="font-montserrat text-2xl font-bold text-text md:text-3xl">
            {mode === "create" ? "Добавить изделие" : "Редактировать изделие"}
          </h1>
          <p className="mt-1 text-sm text-text/60">
            {mode === "create"
              ? "Заполните информацию о новом изделии"
              : `Редактирование: ${product?.name}`}
          </p>
        </div>
      </div>

      {/* Вкладки */}
      <div className="mt-8 border-b border-border">
        <nav className="-mb-px flex gap-6 overflow-x-auto">
          {TABS.map((tab) => {
            const isActive = tab.id === activeTab;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`whitespace-nowrap border-b-2 px-1 pb-3 text-sm font-medium transition ${
                  isActive
                    ? "border-primary text-primary"
                    : "border-transparent text-text/60 hover:text-text"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Форма */}
      <form onSubmit={handleSubmit(onSubmit)} className="mt-8" noValidate>
        {/* Вкладка: Основное */}
        {activeTab === "main" && (
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_320px]">
            <div className="space-y-5 rounded-2xl border border-border bg-white p-6">
              <h2 className="font-montserrat text-base font-semibold text-text">
                Основная информация
              </h2>

              <Input
                id="product-name"
                label="Название"
                placeholder="Например: Кровать «Ривьера»"
                error={errors.name?.message}
                {...register("name")}
              />

              <div>
                <label
                  htmlFor="product-category"
                  className="mb-2 block text-sm font-medium text-text"
                >
                  Категория
                </label>
                <select
                  id="product-category"
                  className={`w-full rounded-lg border bg-white px-4 py-3 text-sm text-text outline-none transition focus:border-primary ${
                    errors.categoryId ? "border-red-500" : "border-border"
                  }`}
                  {...register("categoryId")}
                >
                  <option value="">Выберите категорию</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.slug}>
                      {c.name}
                    </option>
                  ))}
                </select>
                {errors.categoryId && (
                  <p className="mt-1.5 text-xs text-red-500">
                    {errors.categoryId.message}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="product-short"
                  className="mb-2 block text-sm font-medium text-text"
                >
                  Краткое описание
                </label>
                <input
                  id="product-short"
                  placeholder="Например: Массив дуба"
                  className="w-full rounded-lg border border-border bg-white px-4 py-3 text-sm text-text outline-none transition placeholder:text-text/40 focus:border-primary"
                  {...register("shortDescription")}
                />
              </div>

              <div>
                <label
                  htmlFor="product-description"
                  className="mb-2 block text-sm font-medium text-text"
                >
                  Полное описание
                </label>
                <textarea
                  id="product-description"
                  rows={6}
                  placeholder="Расскажите об изделии, материалах, особенностях"
                  className="w-full resize-none rounded-lg border border-border bg-white px-4 py-3 text-sm text-text outline-none transition placeholder:text-text/40 focus:border-primary"
                  {...register("description")}
                />
              </div>

              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-primary"
                  {...register("isPublished")}
                />
                <span className="text-sm text-text">Опубликовать сразу</span>
              </label>
            </div>

            {/* Правая колонка: изображение */}
            <div className="space-y-5 rounded-2xl border border-border bg-white p-6">
              <h2 className="font-montserrat text-base font-semibold text-text">
                Изображение
              </h2>
              <div className="aspect-[4/3] w-full rounded-xl bg-beige" />
              <button
                type="button"
                className="w-full rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-text transition hover:border-primary hover:text-primary"
              >
                Загрузить изображение
              </button>
              <p className="text-xs text-text/50">
                Рекомендуемый размер: 1200×900, до 5 МБ
              </p>
            </div>
          </div>
        )}

        {/* Вкладка: Характеристики */}
        {activeTab === "specs" && (
          <div className="rounded-2xl border border-border bg-white p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-montserrat text-base font-semibold text-text">
                Характеристики
              </h2>
              <button
                type="button"
                onClick={() => append({ name: "", value: "" })}
                className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-text transition hover:border-primary hover:text-primary"
              >
                <Plus size={16} />
                Добавить характеристику
              </button>
            </div>

            <div className="mt-6 space-y-3">
              <div className="hidden grid-cols-[1fr_1fr_40px] gap-3 md:grid">
                <span className="text-xs font-medium uppercase tracking-wider text-text/50">
                  Название
                </span>
                <span className="text-xs font-medium uppercase tracking-wider text-text/50">
                  Значение
                </span>
                <span />
              </div>

              {fields.map((field, index) => (
                <div
                  key={field.id}
                  className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_40px]"
                >
                  <Input
                    placeholder="Например: Материал"
                    error={errors.specifications?.[index]?.name?.message}
                    {...register(`specifications.${index}.name`)}
                  />
                  <Input
                    placeholder="Например: Массив дуба"
                    error={errors.specifications?.[index]?.value?.message}
                    {...register(`specifications.${index}.value`)}
                  />
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    aria-label="Удалить характеристику"
                    disabled={fields.length === 1}
                    className="flex h-12 w-10 items-center justify-center self-start rounded-lg border border-border text-text/60 transition hover:border-red-300 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}

              {fields.length === 0 && (
                <p className="py-6 text-center text-sm text-text/50">
                  Пока нет характеристик. Добавьте первую.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Вкладка: Фотографии */}
        {activeTab === "photos" && (
          <div className="rounded-2xl border border-border bg-white p-6">
            <h2 className="font-montserrat text-base font-semibold text-text">
              Фотографии изделия
            </h2>
            <p className="mt-1 text-sm text-text/60">
              Первая фотография будет главной. Порядок можно менять стрелками.
            </p>

            <div className="mt-6">
              <ImageUploader
                images={images}
                onChange={(next) =>
                  setValue("images", next, { shouldDirty: true })
                }
              />
            </div>
          </div>
        )}

        {/* Вкладка: SEO */}
        {activeTab === "seo" && (
          <div className="rounded-2xl border border-border bg-white p-6">
            <h2 className="font-montserrat text-base font-semibold text-text">
              Поисковая оптимизация
            </h2>
            <p className="mt-1 text-sm text-text/60">
              Как изделие будет выглядеть в поиске и по какой ссылке
              открываться.
            </p>

            <div className="mt-6 space-y-5">
              <div>
                <label
                  htmlFor="product-slug"
                  className="mb-2 block text-sm font-medium text-text"
                >
                  URL (slug)
                </label>
                <div className="flex items-center gap-2 rounded-lg border border-border bg-white px-4 py-3 text-sm focus-within:border-primary">
                  <span className="text-text/40">/catalog/</span>
                  <input
                    id="product-slug"
                    placeholder="krovat-riviera"
                    className="flex-1 bg-transparent text-text outline-none placeholder:text-text/40"
                    {...register("slug")}
                  />
                </div>
                {errors.slug && (
                  <p className="mt-1.5 text-xs text-red-500">
                    {errors.slug.message}
                  </p>
                )}
              </div>

              <Input
                id="product-seo-title"
                label="Meta title"
                placeholder="Кровать «Ривьера» из массива дуба — МКМ"
                error={errors.seoTitle?.message}
                {...register("seoTitle")}
              />

              <div>
                <label
                  htmlFor="product-seo-description"
                  className="mb-2 block text-sm font-medium text-text"
                >
                  Meta description
                </label>
                <textarea
                  id="product-seo-description"
                  rows={3}
                  placeholder="Заказная кровать из массива дуба. Индивидуальные размеры, ручная работа, гарантия 5 лет."
                  className={`w-full resize-none rounded-lg border bg-white px-4 py-3 text-sm text-text outline-none transition placeholder:text-text/40 focus:border-primary ${
                    errors.seoDescription ? "border-red-500" : "border-border"
                  }`}
                  {...register("seoDescription")}
                />
                {errors.seoDescription && (
                  <p className="mt-1.5 text-xs text-red-500">
                    {errors.seoDescription.message}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Кнопки */}
        <div className="mt-8 flex gap-3">
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-lg bg-primary px-6 py-3 font-medium text-white transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Сохраняем…" : "Сохранить"}
          </button>
          <Link
            href="/admin/products"
            className="rounded-lg border border-border bg-white px-6 py-3 font-medium text-text transition hover:border-primary hover:text-primary"
          >
            Отмена
          </Link>
        </div>
      </form>
    </div>
  );
};
