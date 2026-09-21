import { prisma } from "@/lib/prisma";
import { parsePhone } from "@/lib/phone";
import { notifyNewApplication } from "@/lib/telegram";

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
      phone: parsePhone(input.phone) ?? input.phone.trim(),
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
