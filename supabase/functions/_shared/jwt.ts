// Direct port of services/jwt.service.js
// Uses jose (Deno-compatible JWT library) since jsonwebtoken is Node-only
import { create, verify, getNumericDate } from "https://deno.land/x/djwt@v3.0.2/mod.ts";

const JWT_SECRET = Deno.env.get("JWT_SECRET")!;

// Cache the CryptoKey so we don't re-derive it on every call
let _cryptoKey: CryptoKey | null = null;

async function getCryptoKey(): Promise<CryptoKey> {
  if (_cryptoKey) return _cryptoKey;
  const enc = new TextEncoder();
  _cryptoKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(JWT_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
  return _cryptoKey;
}

export async function signToken(
  payload: Record<string, unknown>,
  expiresInSeconds = 12 * 60 * 60  // 12h default, same as Express backend
): Promise<string> {
  const key = await getCryptoKey();
  return create(
    { alg: "HS256", typ: "JWT" },
    { ...payload, exp: getNumericDate(expiresInSeconds) },
    key
  );
}

export async function verifyTokenPayload(token: string): Promise<Record<string, unknown>> {
  const key = await getCryptoKey();
  return verify(token, key) as Promise<Record<string, unknown>>;
}
