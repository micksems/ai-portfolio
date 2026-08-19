import { NextResponse } from "next/server";
import {
  CHALLENGE_COOKIE,
  PASSKEY_COOKIE,
  RECOVERY_COOKIE,
  getRpId,
  getValidPinKey,
  randomChallenge,
  readSignedPayload,
  secureCookieOptions,
  signPayload,
} from "@/lib/job-search-auth";

export async function POST(request) {
  const recoveryPin = request.cookies.get(RECOVERY_COOKIE)?.value;
  const pinKey = getValidPinKey(recoveryPin);
  if (!pinKey) return NextResponse.json({ error: "Use the PIN first" }, { status: 401 });
  const record = readSignedPayload(pinKey, request.cookies.get(PASSKEY_COOKIE)?.value);
  if (!record?.id) return NextResponse.json({ error: "No passkey enrolled" }, { status: 404 });

  const challenge = randomChallenge();
  const response = NextResponse.json({
    challenge,
    rpId: getRpId(request),
    timeout: 60000,
    userVerification: "required",
    allowCredentials: [{ id: record.id, type: "public-key" }],
  });
  response.cookies.set(
    CHALLENGE_COOKIE,
    signPayload(pinKey, { challenge, type: "auth", createdAt: Date.now() }),
    secureCookieOptions(300, "/api/job-search-auth"),
  );
  return response;
}
