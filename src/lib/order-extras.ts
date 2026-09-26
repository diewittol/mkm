import { prisma } from "@/lib/prisma";

// Доплата к стоимости заказа (непредвиденные расходы и т.п.). Добавляется сколько
// угодно раз; итоговая стоимость = стоимость заказа + сумма доплат.
export async function addExtra(applicationId: string, amount: number, comment: string | null = null) {
  return prisma.applicationExtra.create({
    data: { applicationId, amount, comment },
  });
}

export async function deleteExtra(applicationId: string, extraId: string): Promise<boolean> {
  const result = await prisma.applicationExtra.deleteMany({
    where: { id: extraId, applicationId },
  });
  return result.count > 0;
}

export const sumAmounts = (rows: { amount: number }[]) =>
  rows.reduce((sum, row) => sum + row.amount, 0);
