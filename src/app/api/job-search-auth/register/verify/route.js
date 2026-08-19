import { NextResponse } from "next/server";
import {
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
  verifyRegistrationCredential,
} from "@/lib/job-search-auth";

export async function POST(request) {
  try {
    const recoveryPin = request.cookies.get(RECOVERY_COOKIE)?.value;
    const pinKey = getValidPinKey(recoveryPin);
    if (!pinKey) return NextResponse.json({ error: "PIN session required" }, { status: 401 });

    const challengeState = readSignedPayload(pinKey, request.cookies.get(CHALLENGE_COOKIE)?.value);
    if (!challengeState || challengeState.type !== "register" || Date.now() - challengeState.createdAt > 300000) {
      return NextResponse.json({ error: "Registration challenge expired" }, { status: 400 });
    }

    const credential = await request.json();
    const record = verifyRegistrationCredential({
      credential,
      expectedChallenge: challengeState.challenge,
      expectedOrigin: getExpectedOrigin(request),
      rpId: getRpId(request),
    });

    const response = NextResponse.json({ ok: true });
    response.cookies.set(
      PASSKEY_COOKIE,
      signPayload(pinKey, record),
      secureCookieOptions(RECOVERY_MAX_AGE, "/api/job-search-auth"),
    );
    response.cookies.set(CHALLENGE_COOKIE, "", secureCookieOptions(0, "/api/job-search-auth"));
    return response;
  } catch (error) {
    return NextResponse.json({ error: error.message || "Passkey registration failed" }, { status: 400 });
  }
}
