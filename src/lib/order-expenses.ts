import { prisma } from "@/lib/prisma";
import type { ExpenseKind } from "@/lib/order-stats";

export const EXPENSE_KINDS: ExpenseKind[] = ["material", "ready"];

export const isExpenseKind = (value: unknown): value is ExpenseKind =>
  value === "material" || value === "ready";

export const EXPENSE_KIND_LABELS: Record<ExpenseKind, string> = {
  material: "Материалы (в наценку)",
  ready: "Готовые материалы (без наценки)",
};

// Расход на заказ: закупка материала. Добавляется сколько угодно раз,
// суммы по каждому виду складываются.
export async function addExpense(applicationId: string, kind: ExpenseKind, amount: number) {
  return prisma.applicationExpense.create({
    data: { applicationId, kind, amount },
  });
}

export async function deleteExpense(applicationId: string, expenseId: string): Promise<boolean> {
  const result = await prisma.applicationExpense.deleteMany({
    where: { id: expenseId, applicationId },
  });
  return result.count > 0;
}
