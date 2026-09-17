import { cache } from "react";
import { prisma } from "./prisma";

// React cache — в рамках одного рендера страницы
// функция вызовется только один раз, даже если её дёргают Header + Footer + страница
export const getSettings = cache(async () => {
  return prisma.settings.findUnique({
    where: { id: "singleton" },
  });
});