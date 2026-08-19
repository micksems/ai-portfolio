import { NextResponse } from "next/server";
import {
  CHALLENGE_COOKIE,
  RECOVERY_COOKIE,
  getRpId,
  getValidPinKey,
  randomChallenge,
  secureCookieOptions,
  signPayload,
} from "@/lib/job-search-auth";

export async function POST(request) {
  const recoveryPin = request.cookies.get(RECOVERY_COOKIE)?.value;
  const pinKey = getValidPinKey(recoveryPin);
  if (!pinKey) return NextResponse.json({ error: "PIN session required" }, { status: 401 });

  const challenge = randomChallenge();
  const rpId = getRpId(request);
  const response = NextResponse.json({
    challenge,
    rp: { name: "Career Control Center", id: rpId },
    user: {
      id: randomChallenge(),
      name: "dashboard-owner",
      displayName: "Career Control Center",
    },
    pubKeyCredParams: [{ type: "public-key", alg: -7 }],
    timeout: 60000,
    attestation: "none",
    authenticatorSelection: {
      authenticatorAttachment: "platform",
      residentKey: "required",
      userVerification: "required",
    },
  });
  response.cookies.set(
    CHALLENGE_COOKIE,
    signPayload(pinKey, { challenge, type: "register", createdAt: Date.now() }),
    secureCookieOptions(300, "/api/job-search-auth"),
  );
  return response;
}
