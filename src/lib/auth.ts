import { cookies } from "next/headers";

export const AUTH_COOKIE = "mkm_session";
export const AUTH_MAX_AGE = 60 * 60 * 24 * 7; // 7 дней в секундах

// Значение сессии — это AUTH_SECRET из .env
export function getSessionValue(): string {
  return process.env.AUTH_SECRET ?? "";
}

// Проверка, что cookie валидный
export function isValidSession(value: string | undefined): boolean {
  if (!value) return false;
  const expected = getSessionValue();
  return expected.length > 0 && value === expected;
}

// Проверка пароля
export function checkPassword(password: string): boolean {
  const expected = process.env.ADMIN_PASSWORD ?? "";
  return expected.length > 0 && password === expected;
}

// Проверка авторизации в Route Handler'ах (API не защищены middleware)
export async function isAuthenticated(): Promise<boolean> {
  const store = await cookies();
  return isValidSession(store.get(AUTH_COOKIE)?.value);
}