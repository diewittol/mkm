import { z } from "zod";

export const contactFormSchema = z.object({
  name: z
    .string()
    .min(2, "Введите имя (минимум 2 символа)")
    .max(60, "Слишком длинное имя"),
  phone: z
    .string()
    .min(10, "Введите телефон")
    .regex(
      /^[\d\s()+-]+$/,
      "Телефон может содержать только цифры, пробелы и символы + ( ) -",
    ),
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
  imageUrl: z.string().nullable().optional(),
});

export type ProjectFormValues = z.infer<typeof projectFormSchema>;
