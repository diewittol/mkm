"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { Input } from "@/components/ui/Input";
import { projectFormSchema, type ProjectFormValues } from "@/lib/schemas";
import { ImageUploader } from "./ImageUploader";

interface ProjectFromApi {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  location: string | null;
  images: { id: string; url: string }[];
  isPublished: boolean;
  order: number;
}

interface ProjectFormProps {
  project?: ProjectFromApi;
  onSubmit: (values: ProjectFormValues) => void | Promise<void>;
  onCancel: () => void;
}

export const ProjectForm = ({
  project,
  onSubmit,
  onCancel,
}: ProjectFormProps) => {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<
    z.input<typeof projectFormSchema>,
    unknown,
    ProjectFormValues
  >({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      title: "",
      slug: "",
      location: "",
      description: "",
      order: 0,
      isPublished: true,
      images: [],
    },
  });

  const images = watch("images") ?? [];

  useEffect(() => {
    if (project) {
      reset({
        title: project.title,
        slug: project.slug,
        location: project.location ?? "",
        description: project.description ?? "",
        order: project.order,
        isPublished: project.isPublished,
        images: project.images,
      });
    } else {
      reset({
        title: "",
        slug: "",
        location: "",
        description: "",
        order: 0,
        isPublished: true,
        images: [],
      });
    }
  }, [project, reset]);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div>
        <label className="mb-2 block text-sm font-medium text-text">
          Фотографии
        </label>
        <p className="mb-3 text-xs text-text/50">
          Первая фотография будет главной в каталоге проектов.
        </p>
        <ImageUploader
          images={images}
          onChange={(next) => setValue("images", next, { shouldDirty: true })}
        />
      </div>
      <Input
        id="project-title"
        label="Название"
        placeholder="Например: Спальня в скандинавском стиле"
        error={errors.title?.message}
        {...register("title")}
      />

      <div>
        <label
          htmlFor="project-slug"
          className="mb-2 block text-sm font-medium text-text"
        >
          Slug (URL)
        </label>
        <div className="flex items-center gap-2 rounded-lg border border-border bg-white px-4 py-3 text-sm focus-within:border-primary">
          <span className="text-text/40">/projects/</span>
          <input
            id="project-slug"
            placeholder="spalnya-skandi"
            className="flex-1 bg-transparent text-text outline-none placeholder:text-text/40"
            {...register("slug")}
          />
        </div>
        {errors.slug && (
          <p className="mt-1.5 text-xs text-red-500">{errors.slug.message}</p>
        )}
      </div>

      <Input
        id="project-location"
        label="Локация"
        placeholder="Красноярск"
        error={errors.location?.message}
        {...register("location")}
      />

      <div>
        <label
          htmlFor="project-description"
          className="mb-2 block text-sm font-medium text-text"
        >
          Описание
        </label>
        <textarea
          id="project-description"
          rows={3}
          placeholder="Краткое описание проекта"
          className={`w-full resize-none rounded-lg border bg-white px-4 py-3 text-sm text-text outline-none transition placeholder:text-text/40 focus:border-primary ${
            errors.description ? "border-red-500" : "border-border"
          }`}
          {...register("description")}
        />
        {errors.description && (
          <p className="mt-1.5 text-xs text-red-500">
            {errors.description.message}
          </p>
        )}
      </div>

      <Input
        id="project-order"
        type="number"
        label="Порядок"
        placeholder="1"
        error={errors.order?.message}
        {...register("order")}
      />

      <label className="flex cursor-pointer items-center gap-3">
        <input
          type="checkbox"
          className="h-4 w-4 accent-primary"
          {...register("isPublished")}
        />
        <span className="text-sm text-text">Опубликовать</span>
      </label>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-lg bg-primary px-6 py-3 text-sm font-medium text-white transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Сохраняем…" : project ? "Сохранить" : "Создать"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-border bg-white px-6 py-3 text-sm font-medium text-text transition hover:border-primary hover:text-primary"
        >
          Отмена
        </button>
      </div>
    </form>
  );
};
