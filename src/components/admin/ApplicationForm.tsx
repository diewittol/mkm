"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/Input";
import {
  manualApplicationSchema,
  type ManualApplicationValues,
} from "@/lib/schemas";

interface ApplicationFormProps {
  onSubmit: (values: ManualApplicationValues) => void | Promise<void>;
  onCancel: () => void;
}

export const ApplicationForm = ({ onSubmit, onCancel }: ApplicationFormProps) => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ManualApplicationValues>({
    resolver: zodResolver(manualApplicationSchema),
    defaultValues: { name: "", phone: "", message: "", status: "in_progress" },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <Input
        id="application-name"
        label="Имя клиента"
        placeholder="Как зовут"
        error={errors.name?.message}
        {...register("name")}
      />

      <Input
        id="application-phone"
        label="Телефон"
        type="tel"
        placeholder="+7 (___) ___-__-__"
        error={errors.phone?.message}
        {...register("phone")}
      />

      <div>
        <label
          htmlFor="application-message"
          className="mb-2 block text-sm font-medium text-text"
        >
          Комментарий
        </label>
        <textarea
          id="application-message"
          rows={3}
          placeholder="Что нужно клиенту, откуда узнал о нас"
          className={`w-full resize-none rounded-lg border bg-white px-4 py-3 text-sm text-text outline-none transition placeholder:text-text/40 focus:border-primary ${
            errors.message ? "border-red-500" : "border-border"
          }`}
          {...register("message")}
        />
        {errors.message && (
          <p className="mt-1.5 text-xs text-red-500">{errors.message.message}</p>
        )}
      </div>

      <div>
        <label
          htmlFor="application-status"
          className="mb-2 block text-sm font-medium text-text"
        >
          Статус
        </label>
        <select
          id="application-status"
          className="w-full rounded-lg border border-border bg-white px-4 py-3 text-sm text-text outline-none transition focus:border-primary"
          {...register("status")}
        >
          <option value="in_progress">В работе (клиент уже у нас)</option>
          <option value="new">Новая</option>
        </select>
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-lg bg-primary px-6 py-3 text-sm font-medium text-white transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Сохраняем…" : "Добавить"}
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
