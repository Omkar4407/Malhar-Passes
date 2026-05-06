// Direct port of services/otp.service.js
import adminSupabase from "./supabase.ts";

export const MAX_OTP_ATTEMPTS = 5;
const OTP_TTL_MS = 5 * 60 * 1000;
const DEV_MODE = Deno.env.get("DEV_MODE") === "true";

// ── Hashing ───────────────────────────────────────────────────────────────────
export async function hashOtp(otp: number | string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(Deno.env.get("OTP_HMAC_SECRET")!),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(String(otp))
  );
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ── SMS delivery ──────────────────────────────────────────────────────────────
export async function sendSmsOtp(phone: string, otp: number): Promise<void> {
  if (DEV_MODE) {
    console.log(`[DEV] OTP for +91 ${phone}: ${otp}`);
    return;
  }
  const resp = await fetch("https://www.fast2sms.com/dev/bulkV2", {
    method: "POST",
    headers: {
      authorization: Deno.env.get("FAST2SMS_API_KEY")!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ route: "otp", variables_values: String(otp), numbers: phone }),
  });
  const result = await resp.json();
  if (!resp.ok || result.return !== true) {
    console.error("Fast2SMS error:", result);
    throw new Error(`Fast2SMS error: ${result.message || resp.status}`);
  }
}

// ── Store / fetch / delete OTP in DB ─────────────────────────────────────────
export async function storeOtp(phone: string, otp: number): Promise<void> {
  const expiresAt = new Date(Date.now() + OTP_TTL_MS).toISOString();
  const { error } = await adminSupabase
    .from("otp_store")
    .upsert([{ phone, otp_hash: await hashOtp(otp), expires_at: expiresAt, attempts: 0 }], {
      onConflict: "phone",
    });
  if (error) throw error;
}

export async function fetchOtpRecord(phone: string) {
  const { data, error } = await adminSupabase
    .from("otp_store")
    .select("otp_hash, expires_at, attempts")
    .eq("phone", phone)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function incrementOtpAttempts(phone: string, currentAttempts: number) {
  await adminSupabase
    .from("otp_store")
    .update({ attempts: currentAttempts + 1 })
    .eq("phone", phone);
}

export async function deleteOtp(phone: string) {
  await adminSupabase.from("otp_store").delete().eq("phone", phone);
}
