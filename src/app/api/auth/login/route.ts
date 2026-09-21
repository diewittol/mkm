import { NextResponse } from "next/server";
import { AUTH_COOKIE, AUTH_MAX_AGE, getSessionValue } from "@/lib/auth";
import { verifyAdminPassword } from "@/lib/admin-password";

export const runtime = "nodejs";

// POST /api/auth/login
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const password = body?.password;

  if (typeof password !== "string" || !password || !(await verifyAdminPassword(password))) {
    return NextResponse.json(
      { error: "Неверный пароль" },
      { status: 401 },
    );
  }

  const response = NextResponse.json({ success: true });

  response.cookies.set(AUTH_COOKIE, getSessionValue(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: AUTH_MAX_AGE,
    path: "/",
  });

  return response;
}