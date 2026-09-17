"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "./Input";
import { contactFormSchema, type ContactFormValues } from "@/lib/schemas";

interface ContactFormProps {
  onSuccess?: () => void;
  productName?: string;
}

export const ContactForm = ({ onSuccess, productName }: ContactFormProps) => {
  const [submitted, setSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      name: "",
      phone: "",
      message: productName ? `Интересует изделие: ${productName}` : "",
      consent: false,
    },
  });

  const onSubmit = async (data: ContactFormValues) => {
    // Honeypot: скрытое поле-ловушка для ботов, реальные пользователи его не видят
    if (data.website) {
      setSubmitted(true);
      reset();
      onSuccess?.();
      return;
    }

    const response = await fetch("/api/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: data.name,
        phone: data.phone,
        message: data.message,
        productName,
      }),
    });

    if (!response.ok) {
      alert("Не удалось отправить заявку. Попробуйте ещё раз.");
      return;
    }

    setSubmitted(true);
    reset();
    onSuccess?.();
  };

  if (submitted) {
    return (
      <div className="text-center">
        <h3 className="font-montserrat text-lg font-semibold text-text">
          Заявка отправлена
        </h3>
        <p className="mt-2 text-sm text-text/60">
          Мы свяжемся с вами в течение рабочего дня.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      {/* Honeypot: невидимое для людей поле-ловушка для ботов */}
      <div
        aria-hidden="true"
        className="absolute -left-[9999px] top-auto h-0 w-0 overflow-hidden"
      >
        <label htmlFor="contact-website">Website</label>
        <input
          id="contact-website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          {...register("website")}
        />
      </div>

      <Input
        id="contact-name"
        label="Имя"
        placeholder="Как к вам обращаться"
        error={errors.name?.message}
        {...register("name")}
      />

      <Input
        id="contact-phone"
        label="Телефон"
        type="tel"
        placeholder="+7 (___) ___-__-__"
        error={errors.phone?.message}
        {...register("phone")}
      />

      <div className="w-full">
        <label
          htmlFor="contact-message"
          className="mb-2 block text-sm font-medium text-text"
        >
          Сообщение
        </label>
        <textarea
          id="contact-message"
          rows={4}
          placeholder="Опишите задачу или задайте вопрос"
          className={`w-full resize-none rounded-lg border bg-white px-4 py-3 text-sm text-text outline-none transition placeholder:text-text/40 focus:border-primary ${
            errors.message ? "border-red-500" : "border-border"
          }`}
          {...register("message")}
        />
        {errors.message && (
          <p className="mt-1.5 text-xs text-red-500">
            {errors.message.message}
          </p>
        )}
      </div>

      <div>
        <label className="flex items-start gap-2.5 text-xs text-text/60">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 flex-none accent-primary"
            {...register("consent")}
          />
          <span>
            Я согласен(на) на{" "}
            <Link
              href="/privacy"
              target="_blank"
              className="text-primary underline hover:text-primary-dark"
            >
              обработку персональных данных
            </Link>
          </span>
        </label>
        {errors.consent && (
          <p className="mt-1.5 text-xs text-red-500">
            {errors.consent.message}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-lg bg-primary px-6 py-3.5 font-medium text-white transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "Отправляем…" : "Отправить"}
      </button>
    </form>
  );
};
