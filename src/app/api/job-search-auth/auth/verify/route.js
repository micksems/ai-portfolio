import { NextResponse } from "next/server";
import {
  ACCESS_COOKIE,
  ACCESS_MAX_AGE,
  CHALLENGE_COOKIE,
  PASSKEY_COOKIE,
  RECOVERY_COOKIE,
  RECOVERY_MAX_AGE,
  getExpectedOrigin,
  getRpId,
  getValidPinKey,
  readSignedPayload,
  secureCookieOptions,
  signPayload,
  verifyAuthenticationCredential,
} from "@/lib/job-search-auth";

export async function POST(request) {
  try {
    const recoveryPin = request.cookies.get(RECOVERY_COOKIE)?.value;
    const pinKey = getValidPinKey(recoveryPin);
    if (!pinKey) return NextResponse.json({ error: "Use the PIN first" }, { status: 401 });

    const record = readSignedPayload(pinKey, request.cookies.get(PASSKEY_COOKIE)?.value);
    const challengeState = readSignedPayload(pinKey, request.cookies.get(CHALLENGE_COOKIE)?.value);
    if (!record?.id || !challengeState || challengeState.type !== "auth" || Date.now() - challengeState.createdAt > 300000) {
      return NextResponse.json({ error: "Authentication challenge expired" }, { status: 400 });
    }

    const credential = await request.json();
    const updatedRecord = verifyAuthenticationCredential({
      credential,
      record,
      expectedChallenge: challengeState.challenge,
      expectedOrigin: getExpectedOrigin(request),
      rpId: getRpId(request),
    });

    const response = NextResponse.json({ ok: true });
    response.cookies.set(ACCESS_COOKIE, recoveryPin, secureCookieOptions(ACCESS_MAX_AGE, "/job-search"));
    response.cookies.set(
      PASSKEY_COOKIE,
      signPayload(pinKey, updatedRecord),
      secureCookieOptions(RECOVERY_MAX_AGE, "/api/job-search-auth"),
    );
    response.cookies.set(CHALLENGE_COOKIE, "", secureCookieOptions(0, "/api/job-search-auth"));
    return response;
  } catch (error) {
    return NextResponse.json({ error: error.message || "Face ID authentication failed" }, { status: 400 });
  }
}
