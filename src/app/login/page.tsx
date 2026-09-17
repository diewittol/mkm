"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Lock } from "lucide-react";
import { Input } from "@/components/ui/Input";

const loginSchema = z.object({
  password: z.string().min(1, "Введите пароль"),
});

type LoginValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { password: "" },
  });

  const onSubmit = async (data: LoginValues) => {
    setError("");

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(body.error ?? "Неверный пароль");
      return;
    }

    router.push("/admin");
    router.refresh();
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="font-montserrat text-3xl font-bold text-text">МКМ</h1>
          <p className="mt-2 text-sm text-text/60">Панель управления</p>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-5 rounded-2xl border border-border bg-white p-8"
          noValidate
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-beige text-primary">
            <Lock size={22} strokeWidth={1.75} />
          </div>

          <div>
            <h2 className="font-montserrat text-xl font-semibold text-text">
              Вход в админку
            </h2>
            <p className="mt-1 text-sm text-text/60">
              Введите пароль администратора
            </p>
          </div>

          <Input
            id="login-password"
            type="password"
            label="Пароль"
            placeholder="••••••••"
            error={errors.password?.message}
            autoFocus
            {...register("password")}
          />

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-primary px-6 py-3 font-medium text-white transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Проверяем…" : "Войти"}
          </button>

          <p className="text-center text-xs text-text/50">
            Доступ только для администратора сайта
          </p>
        </form>
      </div>
    </div>
  );
}