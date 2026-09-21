import { prisma } from "@/lib/prisma";
import { notifyNewApplication } from "@/lib/telegram";

// Российские номера приводим к одному виду (+7 (999) 123-45-67), чтобы
// поиск, WhatsApp-ссылки и списки выглядели одинаково. Остальное — как ввели.
export function normalizePhone(input: string): string {
  let digits = input.replace(/\D/g, "");
  if (digits.length === 11 && (digits.startsWith("7") || digits.startsWith("8"))) {
    digits = digits.slice(1);
  }
  if (digits.length === 10) {
    return `+7 (${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 8)}-${digits.slice(8)}`;
  }
  return input.trim();
}

interface ManualApplicationInput {
  name: string;
  phone: string;
  message?: string | null;
  status: "new" | "in_progress";
  // Кто добавил: @username из Telegram или «админка»
  createdBy: string;
  // Чат создателя — ему уведомление не шлём
  excludeChatId?: string;
}

// Заявка, добавленная вручную (сарафанное радио, звонок, визит).
// Остальным сотрудникам уходит уведомление в Telegram.
export async function createManualApplication(input: ManualApplicationInput) {
  const inWork = input.status === "in_progress";

  const application = await prisma.application.create({
    data: {
      name: input.name,
      phone: normalizePhone(input.phone),
      message: input.message || null,
      status: input.status,
      source: "manual",
      handledBy: inWork ? input.createdBy : null,
      handledAt: inWork ? new Date() : null,
    },
  });

  void notifyNewApplication(
    {
      id: application.id,
      name: application.name,
      phone: application.phone,
      message: application.message,
    },
    {
      title: "Заявка добавлена вручную",
      statusNote: inWork
        ? `В работе — ${input.createdBy}`
        : `Добавил(а): ${input.createdBy}`,
      status: input.status,
      excludeChatId: input.excludeChatId,
    },
  );

  return application;
}
