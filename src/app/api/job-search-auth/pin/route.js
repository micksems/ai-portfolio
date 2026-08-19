import { NextResponse } from "next/server";
import {
  ACCESS_COOKIE,
  ACCESS_MAX_AGE,
  RECOVERY_COOKIE,
  RECOVERY_MAX_AGE,
  getValidPinKey,
  secureCookieOptions,
} from "@/lib/job-search-auth";

export async function POST(request) {
  const { pin } = await request.json().catch(() => ({}));
  if (!getValidPinKey(pin)) {
    return NextResponse.json({ ok: false, error: "Incorrect code" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(ACCESS_COOKIE, String(pin), secureCookieOptions(ACCESS_MAX_AGE, "/job-search"));
  response.cookies.set(RECOVERY_COOKIE, String(pin), secureCookieOptions(RECOVERY_MAX_AGE, "/api/job-search-auth"));
  return response;
}
