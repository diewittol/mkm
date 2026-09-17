import { NextResponse } from "next/server";
import {
  AUTH_COOKIE,
  AUTH_MAX_AGE,
  checkPassword,
  getSessionValue,
} from "@/lib/auth";

export const runtime = "nodejs";

// POST /api/auth/login
export async function POST(request: Request) {
  const body = await request.json();
  const { password } = body;

  if (!password || !checkPassword(password)) {
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