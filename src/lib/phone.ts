// Единые правила для телефонов: проверка + приведение к виду +7 (999) 123-45-67.
// Модуль без зависимостей — работает и в браузере (формы), и на сервере.

// Возвращает номер в нормальном виде или null, если это не похоже на телефон.
export function parsePhone(input: string): string | null {
  const raw = input.trim();
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;

  // Российский номер: 8/7 + 10 цифр, либо просто 10 цифр (9991234567)
  let national: string | null = null;
  if (digits.length === 11 && (digits[0] === "7" || digits[0] === "8")) {
    national = digits.slice(1);
  } else if (digits.length === 10) {
    national = digits;
  }

  if (national) {
    // Коды в России начинаются на 3, 4, 8 или 9 (мобильные — на 9)
    if (!/^[3489]\d{9}$/.test(national)) return null;
    // 9999999999, 0000000000 и т.п. — не номер
    if (/^(\d)\1{9}$/.test(national)) return null;
    return `+7 (${national.slice(0, 3)}) ${national.slice(3, 6)}-${national.slice(6, 8)}-${national.slice(8)}`;
  }

  // Иностранный номер принимаем только с явным «+» (не +7)
  if (raw.startsWith("+") && !raw.startsWith("+7") && digits.length >= 8 && digits.length <= 15) {
    return `+${digits}`;
  }

  return null;
}

export const PHONE_ERROR =
  "Введите корректный номер, например +7 (999) 123-45-67";
