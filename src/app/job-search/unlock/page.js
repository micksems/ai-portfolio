"use client";

import { useEffect, useRef, useState } from "react";

function bytesFromBase64url(value) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((value.length + 3) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function base64urlFromBuffer(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function readJson(response) {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || "Something went wrong");
  return body;
}

async function createPasskey() {
  if (!window.PublicKeyCredential || !navigator.credentials) {
    throw new Error("Passkeys are not supported in this browser.");
  }
  const options = await readJson(
    await fetch("/api/job-search-auth/register/options", { method: "POST" }),
  );
  options.challenge = bytesFromBase64url(options.challenge);
  options.user.id = bytesFromBase64url(options.user.id);
  const credential = await navigator.credentials.create({ publicKey: options });
  if (!credential) throw new Error("Face ID setup was cancelled.");
  const payload = {
    id: credential.id,
    rawId: base64urlFromBuffer(credential.rawId),
    type: credential.type,
    response: {
      clientDataJSON: base64urlFromBuffer(credential.response.clientDataJSON),
      attestationObject: base64urlFromBuffer(credential.response.attestationObject),
    },
  };
  await readJson(
    await fetch("/api/job-search-auth/register/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  );
}

async function authenticatePasskey() {
  if (!window.PublicKeyCredential || !navigator.credentials) {
    throw new Error("Passkeys are not supported in this browser.");
  }
  const options = await readJson(
    await fetch("/api/job-search-auth/auth/options", { method: "POST" }),
  );
  options.challenge = bytesFromBase64url(options.challenge);
  options.allowCredentials = options.allowCredentials.map((item) => ({
    ...item,
    id: bytesFromBase64url(item.id),
  }));
  const credential = await navigator.credentials.get({ publicKey: options });
  if (!credential) throw new Error("Face ID was cancelled.");
  const payload = {
    id: credential.id,
    rawId: base64urlFromBuffer(credential.rawId),
    type: credential.type,
    response: {
      clientDataJSON: base64urlFromBuffer(credential.response.clientDataJSON),
      authenticatorData: base64urlFromBuffer(credential.response.authenticatorData),
      signature: base64urlFromBuffer(credential.response.signature),
      userHandle: credential.response.userHandle
        ? base64urlFromBuffer(credential.response.userHandle)
        : null,
    },
  };
  await readJson(
    await fetch("/api/job-search-auth/auth/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  );
}

export default function UnlockPage() {
  const [pin, setPin] = useState("");
  const [hasPasskey, setHasPasskey] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [pinUnlocked, setPinUnlocked] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    fetch("/api/job-search-auth/status", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => {
        setHasPasskey(Boolean(data.hasPasskey));
        setShowPin(!data.hasPasskey);
      })
      .catch(() => setShowPin(true));
  }, []);

  useEffect(() => {
    if (showPin) inputRef.current?.focus();
  }, [showPin]);

  async function unlockWithFaceId() {
    setBusy(true);
    setMessage("");
    try {
      await authenticatePasskey();
      window.location.replace("/job-search");
    } catch (error) {
      setMessage(error.name === "NotAllowedError" ? "Face ID was cancelled." : error.message);
    } finally {
      setBusy(false);
    }
  }

  async function setupFaceId() {
    setBusy(true);
    setMessage("");
    try {
      await createPasskey();
      window.location.replace("/job-search");
    } catch (error) {
      setMessage(
        error.name === "NotAllowedError"
          ? "Face ID setup was cancelled. Your PIN unlock is still active."
          : error.message,
      );
      setPinUnlocked(true);
    } finally {
      setBusy(false);
    }
  }

  async function submitPin(event) {
    event.preventDefault();
    if (pin.length !== 4) return;
    setBusy(true);
    setMessage("");
    try {
      await readJson(
        await fetch("/api/job-search-auth/pin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pin }),
        }),
      );
      setPinUnlocked(true);
      if (window.PublicKeyCredential) {
        await setupFaceId();
      } else {
        window.location.replace("/job-search");
      }
    } catch (error) {
      setMessage(error.message);
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#050505] px-5 text-white">
      <div className="pointer-events-none fixed inset-x-0 top-0 h-[520px] bg-[radial-gradient(circle_at_50%_-10%,rgba(255,255,255,0.14),transparent_58%)]" />
      <div className="relative mx-auto flex min-h-screen max-w-md items-center justify-center py-12">
        <section className="w-full rounded-[34px] border border-white/10 bg-white/[0.035] p-6 shadow-2xl shadow-black/40 backdrop-blur-2xl sm:p-8">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.055] text-2xl">
            ◉
          </div>
          <div className="mt-6 text-center">
            <p className="text-[11px] uppercase tracking-[0.28em] text-white/30">Private dashboard</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-[-0.045em]">Career Control Center</h1>
            <p className="mt-3 text-sm leading-6 text-white/44">
              Unlock your job-search dashboard with Face ID or your fallback code.
            </p>
          </div>

          {hasPasskey && !showPin ? (
            <div className="mt-8 space-y-3">
              <button
                type="button"
                onClick={unlockWithFaceId}
                disabled={busy}
                className="flex h-14 w-full items-center justify-center rounded-2xl bg-white text-sm font-semibold text-black transition hover:bg-white/90 disabled:opacity-55"
              >
                {busy ? "Authenticating…" : "Unlock with Face ID"}
              </button>
              <button
                type="button"
                onClick={() => setShowPin(true)}
                disabled={busy}
                className="h-12 w-full rounded-2xl border border-white/10 bg-white/[0.025] text-sm text-white/58 transition hover:border-white/20 hover:text-white"
              >
                Use 4-digit code instead
              </button>
            </div>
          ) : (
            <form onSubmit={submitPin} className="mt-8">
              <label className="block text-center text-[11px] uppercase tracking-[0.24em] text-white/30">
                4-digit code
              </label>
              <input
                ref={inputRef}
                value={pin}
                onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 4))}
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="one-time-code"
                type="password"
                aria-label="4-digit access code"
                className="mt-4 h-16 w-full rounded-2xl border border-white/12 bg-black/35 px-5 text-center text-3xl tracking-[0.55em] text-white outline-none transition placeholder:text-white/15 focus:border-white/30"
                placeholder="••••"
              />
              <button
                type="submit"
                disabled={busy || pin.length !== 4}
                className="mt-4 h-14 w-full rounded-2xl bg-white text-sm font-semibold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-45"
              >
                {busy ? "Unlocking…" : "Unlock"}
              </button>
              {hasPasskey ? (
                <button
                  type="button"
                  onClick={() => {
                    setShowPin(false);
                    setMessage("");
                  }}
                  className="mt-3 h-10 w-full text-xs text-white/42 transition hover:text-white"
                >
                  Back to Face ID
                </button>
              ) : null}
            </form>
          )}

          {pinUnlocked && message ? (
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={setupFaceId}
                disabled={busy}
                className="h-11 rounded-xl border border-white/12 bg-white/[0.04] text-xs font-medium text-white/75"
              >
                Try Face ID again
              </button>
              <button
                type="button"
                onClick={() => window.location.replace("/job-search")}
                className="h-11 rounded-xl border border-white/8 bg-black/20 text-xs text-white/50"
              >
                Continue with PIN
              </button>
            </div>
          ) : null}

          {message ? (
            <p className="mt-5 rounded-2xl border border-amber-300/12 bg-amber-300/[0.06] px-4 py-3 text-center text-xs leading-5 text-amber-100/80">
              {message}
            </p>
          ) : null}

          <p className="mt-7 text-center text-[11px] leading-5 text-white/25">
            Face ID stays on your device. The dashboard only receives a passkey proof from the browser.
          </p>
        </section>
      </div>
    </main>
  );
}
