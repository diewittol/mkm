import { z } from "zod";
import { PHONE_ERROR, parsePhone } from "@/lib/phone";
import { COORDINATES_ERROR, parseCoordinates } from "@/lib/coordinates";

export const contactFormSchema = z.object({
  name: z
    .string()
    .min(2, "Введите имя (минимум 2 символа)")
    .max(60, "Слишком длинное имя"),
  phone: z
    .string()
    .trim()
    .min(1, "Введите телефон")
    .refine((value) => parsePhone(value) !== null, PHONE_ERROR),
  message: z
    .string()
    .max(500, "Сообщение слишком длинное")
    .optional()
    .or(z.literal("")),
  // Honeypot: скрытое поле-ловушка для ботов, обычные пользователи его не видят и не заполняют
  website: z.string().optional().or(z.literal("")),
  consent: z.boolean().refine((v) => v, {
    message: "Необходимо согласие на обработку персональных данных",
  }),
});

export type ContactFormValues = z.infer<typeof contactFormSchema>;

export const categoryFormSchema = z.object({
  name: z
    .string()
    .min(2, "Введите название")
    .max(60, "Слишком длинное название"),
  slug: z
    .string()
    .min(2, "Введите slug")
    .regex(/^[a-z0-9-]+$/, "Только латиница, цифры и дефисы"),
  order: z.coerce
    .number({ message: "Введите число" })
    .int("Целое число")
    .min(0, "Не может быть отрицательным"),
  description: z
    .string()
    .max(300, "До 300 символов")
    .optional()
    .or(z.literal("")),
  image: z.string().nullable().optional(),
});

export type CategoryFormValues = z.infer<typeof categoryFormSchema>;

export const projectFormSchema = z.object({
  title: z
    .string()
    .min(2, "Введите название")
    .max(80, "Слишком длинное название"),
  slug: z
    .string()
    .min(2, "Введите slug")
    .regex(/^[a-z0-9-]+$/, "Только латиница, цифры и дефисы"),
  location: z.string().max(80).optional().or(z.literal("")),
  description: z.string().max(500).optional().or(z.literal("")),
  order: z.coerce
    .number({ message: "Введите число" })
    .int("Целое число")
    .min(0, "Не может быть отрицательным"),
  isPublished: z.boolean(),
  images: z
    .array(
      z.object({
        id: z.string(),
        url: z.string(),
      }),
    )
    .default([]),
});

export type ProjectFormValues = z.infer<typeof projectFormSchema>;

export const manualApplicationSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Введите имя (минимум 2 символа)")
    .max(60, "Слишком длинное имя"),
  phone: z
    .string()
    .trim()
    .min(1, "Введите телефон")
    .refine((value) => parsePhone(value) !== null, PHONE_ERROR),
  message: z.string().max(500, "Комментарий слишком длинный").optional(),
  status: z.enum(["in_progress", "new"]),
});

export type ManualApplicationValues = z.infer<typeof manualApplicationSchema>;

export const locationFormSchema = z.object({
  title: z
    .string()
    .trim()
    .min(2, "Введите название, например «Магазин на Верещагина»")
    .max(80, "Слишком длинное название"),
  address: z
    .string()
    .trim()
    .min(5, "Введите адрес")
    .max(200, "Слишком длинный адрес"),
  hours: z.string().trim().max(80, "До 80 символов").optional(),
  // «широта, долгота» как в Яндекс/Google Картах; пусто — карта найдёт по адресу
  coordinates: z
    .string()
    .trim()
    .optional()
    .refine(
      (value) => !value || parseCoordinates(value) !== null,
      COORDINATES_ERROR,
    ),
});

export type LocationFormValues = z.infer<typeof locationFormSchema>;
