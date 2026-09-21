"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/Input";
import { locationFormSchema, type LocationFormValues } from "@/lib/schemas";

interface LocationFormProps {
  defaultValues?: LocationFormValues;
  onSubmit: (values: LocationFormValues) => void | Promise<void>;
  onCancel: () => void;
}

const EMPTY: LocationFormValues = {
  title: "",
  address: "",
  hours: "",
  coordinates: "",
};

export const LocationForm = ({
  defaultValues = EMPTY,
  onSubmit,
  onCancel,
}: LocationFormProps) => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LocationFormValues>({
    resolver: zodResolver(locationFormSchema),
    defaultValues,
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <Input
        id="location-title"
        label="Название"
        placeholder="Например: Магазин на Верещагина"
        error={errors.title?.message}
        {...register("title")}
      />

      <Input
        id="location-address"
        label="Адрес"
        placeholder="ул. Верещагина, 2п, ст. Ханская, Республика Адыгея"
        error={errors.address?.message}
        {...register("address")}
      />

      <Input
        id="location-hours"
        label="Часы работы"
        placeholder="Пн–Пт, 9:00–18:00"
        error={errors.hours?.message}
        {...register("hours")}
      />

      <div>
        <Input
          id="location-coordinates"
          label="Координаты"
          placeholder="44.672187, 39.972452"
          error={errors.coordinates?.message}
          {...register("coordinates")}
        />
        <p className="mt-1.5 text-xs text-text/50">
          Широта и долгота: в Яндекс или Google Картах нажмите на точку
          правой кнопкой мыши и скопируйте координаты. Если оставить пустым,
          карта найдёт место по адресу (менее точно).
        </p>
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-lg bg-primary px-6 py-3 text-sm font-medium text-white transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Сохраняем…" : "Сохранить"}
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
