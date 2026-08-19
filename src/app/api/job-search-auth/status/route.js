import { NextResponse } from "next/server";
import {
  PASSKEY_COOKIE,
  RECOVERY_COOKIE,
  getValidPinKey,
  readSignedPayload,
} from "@/lib/job-search-auth";

export async function GET(request) {
  const recoveryPin = request.cookies.get(RECOVERY_COOKIE)?.value;
  const pinKey = getValidPinKey(recoveryPin);
  if (!pinKey) return NextResponse.json({ hasPasskey: false });
  const record = readSignedPayload(pinKey, request.cookies.get(PASSKEY_COOKIE)?.value);
  return NextResponse.json({ hasPasskey: Boolean(record?.id) });
}
