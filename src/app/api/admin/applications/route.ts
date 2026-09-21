import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { manualApplicationSchema } from "@/lib/schemas";
import { createManualApplication } from "@/lib/manual-application";

export const runtime = "nodejs";

// POST /api/admin/applications — заявка, добавленная вручную из админки
export async function POST(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  const parsed = manualApplicationSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Некорректные данные" },
      { status: 400 },
    );
  }

  const application = await createManualApplication({
    ...parsed.data,
    createdBy: "админка",
  });

  // Как в GET /api/applications: вместе с товаром (у ручной заявки его нет)
  return NextResponse.json({ ...application, product: null }, { status: 201 });
}
