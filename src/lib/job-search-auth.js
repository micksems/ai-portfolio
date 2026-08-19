import {
  createHash,
  createHmac,
  createPublicKey,
  pbkdf2Sync,
  randomBytes,
  timingSafeEqual,
  verify as verifySignature,
} from "node:crypto";

export const ACCESS_COOKIE = "misha_job_access";
export const RECOVERY_COOKIE = "misha_job_recovery";
export const PASSKEY_COOKIE = "misha_job_passkey";
export const CHALLENGE_COOKIE = "misha_job_challenge";

export const ACCESS_MAX_AGE = 60 * 60 * 24 * 7;
export const RECOVERY_MAX_AGE = 60 * 60 * 24 * 180;

const PIN_ITERATIONS = 750000;
const PIN_SALT = "AHUf5BgOxGX3vUPAFskn9w";
const PIN_HASH = "YGoPHVm3whuP41JM34vmcIr0Jx4pYV_JwfpoRGAtM9o";

export function toBase64url(value) {
  return Buffer.from(value).toString("base64url");
}

export function fromBase64url(value) {
  return Buffer.from(value, "base64url");
}

export function derivePinKey(pin) {
  return pbkdf2Sync(
    String(pin),
    fromBase64url(PIN_SALT),
    PIN_ITERATIONS,
    32,
    "sha256",
  );
}

export function getValidPinKey(pin) {
  if (!/^\d{4}$/.test(String(pin || ""))) return null;
  const derived = derivePinKey(pin);
  const expected = fromBase64url(PIN_HASH);
  return derived.length === expected.length && timingSafeEqual(derived, expected)
    ? derived
    : null;
}

export function signPayload(pinKey, payload) {
  const encoded = toBase64url(Buffer.from(JSON.stringify(payload)));
  const signature = createHmac("sha256", pinKey).update(encoded).digest("base64url");
  return `${encoded}.${signature}`;
}

export function readSignedPayload(pinKey, value) {
  if (!value || !value.includes(".")) return null;
  const [encoded, signature] = value.split(".");
  if (!encoded || !signature) return null;
  const expected = createHmac("sha256", pinKey).update(encoded).digest();
  const received = fromBase64url(signature);
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) return null;
  try {
    return JSON.parse(fromBase64url(encoded).toString("utf8"));
  } catch {
    return null;
  }
}

export function randomChallenge() {
  return randomBytes(32).toString("base64url");
}

export function getRpId(request) {
  return new URL(request.url).hostname;
}

export function getExpectedOrigin(request) {
  return new URL(request.url).origin;
}

function readLength(buffer, offset, additional) {
  if (additional < 24) return { length: additional, offset };
  if (additional === 24) return { length: buffer[offset], offset: offset + 1 };
  if (additional === 25) return { length: buffer.readUInt16BE(offset), offset: offset + 2 };
  if (additional === 26) return { length: buffer.readUInt32BE(offset), offset: offset + 4 };
  if (additional === 27) {
    const value = Number(buffer.readBigUInt64BE(offset));
    if (!Number.isSafeInteger(value)) throw new Error("CBOR integer too large");
    return { length: value, offset: offset + 8 };
  }
  throw new Error("Unsupported indefinite CBOR length");
}

export function decodeCbor(input, startOffset = 0) {
  const buffer = Buffer.from(input);
  let offset = startOffset;
  const first = buffer[offset++];
  if (first === undefined) throw new Error("Unexpected end of CBOR data");
  const major = first >> 5;
  const additional = first & 31;
  const lengthInfo = readLength(buffer, offset, additional);
  const length = lengthInfo.length;
  offset = lengthInfo.offset;

  if (major === 0) return { value: length, offset };
  if (major === 1) return { value: -1 - length, offset };
  if (major === 2) return { value: buffer.subarray(offset, offset + length), offset: offset + length };
  if (major === 3) return { value: buffer.subarray(offset, offset + length).toString("utf8"), offset: offset + length };
  if (major === 4) {
    const items = [];
    for (let i = 0; i < length; i += 1) {
      const decoded = decodeCbor(buffer, offset);
      items.push(decoded.value);
      offset = decoded.offset;
    }
    return { value: items, offset };
  }
  if (major === 5) {
    const map = new Map();
    for (let i = 0; i < length; i += 1) {
      const key = decodeCbor(buffer, offset);
      offset = key.offset;
      const value = decodeCbor(buffer, offset);
      offset = value.offset;
      map.set(key.value, value.value);
    }
    return { value: map, offset };
  }
  if (major === 6) return decodeCbor(buffer, offset);
  if (major === 7) {
    if (additional === 20) return { value: false, offset: startOffset + 1 };
    if (additional === 21) return { value: true, offset: startOffset + 1 };
    if (additional === 22) return { value: null, offset: startOffset + 1 };
  }
  throw new Error("Unsupported CBOR value");
}

function parseClientData(encoded) {
  const raw = fromBase64url(encoded);
  return { raw, data: JSON.parse(raw.toString("utf8")) };
}

function verifyClientData({ encoded, type, challenge, origin }) {
  const client = parseClientData(encoded);
  if (client.data.type !== type) throw new Error("Unexpected WebAuthn ceremony type");
  if (client.data.challenge !== challenge) throw new Error("Challenge mismatch");
  if (client.data.origin !== origin) throw new Error("Origin mismatch");
  return client.raw;
}

function verifyAuthenticatorHeader(authData, rpId) {
  if (authData.length < 37) throw new Error("Authenticator data is too short");
  const expectedRpHash = createHash("sha256").update(rpId).digest();
  const actualRpHash = authData.subarray(0, 32);
  if (!timingSafeEqual(expectedRpHash, actualRpHash)) throw new Error("Relying-party mismatch");
  const flags = authData[32];
  if ((flags & 0x01) === 0) throw new Error("User presence not verified");
  if ((flags & 0x04) === 0) throw new Error("User verification not completed");
  return { flags, counter: authData.readUInt32BE(33) };
}

export function verifyRegistrationCredential({ credential, expectedChallenge, expectedOrigin, rpId }) {
  verifyClientData({
    encoded: credential?.response?.clientDataJSON,
    type: "webauthn.create",
    challenge: expectedChallenge,
    origin: expectedOrigin,
  });

  const attestationBytes = fromBase64url(credential?.response?.attestationObject || "");
  const decoded = decodeCbor(attestationBytes).value;
  if (!(decoded instanceof Map)) throw new Error("Invalid attestation payload");
  const authData = Buffer.from(decoded.get("authData") || []);
  const { flags, counter } = verifyAuthenticatorHeader(authData, rpId);
  if ((flags & 0x40) === 0) throw new Error("Attested credential data missing");

  let offset = 37 + 16;
  const credentialIdLength = authData.readUInt16BE(offset);
  offset += 2;
  const credentialId = authData.subarray(offset, offset + credentialIdLength);
  offset += credentialIdLength;
  const cose = decodeCbor(authData, offset).value;
  if (!(cose instanceof Map)) throw new Error("Invalid credential public key");
  if (cose.get(1) !== 2 || cose.get(3) !== -7 || cose.get(-1) !== 1) {
    throw new Error("Only ES256 platform passkeys are supported");
  }
  const x = Buffer.from(cose.get(-2) || []);
  const y = Buffer.from(cose.get(-3) || []);
  if (x.length !== 32 || y.length !== 32) throw new Error("Invalid P-256 public key");

  const rawId = fromBase64url(credential.rawId || credential.id || "");
  if (rawId.length !== credentialId.length || !timingSafeEqual(rawId, credentialId)) {
    throw new Error("Credential ID mismatch");
  }

  return {
    id: toBase64url(credentialId),
    x: toBase64url(x),
    y: toBase64url(y),
    counter,
  };
}

export function verifyAuthenticationCredential({ credential, record, expectedChallenge, expectedOrigin, rpId }) {
  if (!record?.id || (credential.id !== record.id && credential.rawId !== record.id)) {
    throw new Error("Unknown passkey");
  }

  const clientDataRaw = verifyClientData({
    encoded: credential?.response?.clientDataJSON,
    type: "webauthn.get",
    challenge: expectedChallenge,
    origin: expectedOrigin,
  });
  const authData = fromBase64url(credential?.response?.authenticatorData || "");
  const { counter } = verifyAuthenticatorHeader(authData, rpId);
  const clientHash = createHash("sha256").update(clientDataRaw).digest();
  const signedData = Buffer.concat([authData, clientHash]);
  const signature = fromBase64url(credential?.response?.signature || "");
  const publicKey = createPublicKey({
    key: { kty: "EC", crv: "P-256", x: record.x, y: record.y },
    format: "jwk",
  });
  const valid = verifySignature("sha256", signedData, publicKey, signature);
  if (!valid) throw new Error("Passkey signature verification failed");
  if (record.counter > 0 && counter > 0 && counter <= record.counter) {
    throw new Error("Authenticator counter did not advance");
  }
  return { ...record, counter: Math.max(record.counter || 0, counter || 0) };
}

export function secureCookieOptions(maxAge, path) {
  return {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    path,
    maxAge,
  };
}
