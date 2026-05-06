import crypto from "crypto";
import adminSupabase from "./supabase.service.js";

const OTP_TTL_MS       = 5 * 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;
const DEV_MODE         = process.env.DEV_MODE === "true";

// ── Hashing ───────────────────────────────────────────────────────────────────
export function hashOtp(otp) {
  return crypto
    .createHmac("sha256", process.env.OTP_HMAC_SECRET)
    .update(String(otp))
    .digest("hex");
}

// ── SMS delivery ──────────────────────────────────────────────────────────────
export async function sendSmsOtp(phone, otp) {
  if (DEV_MODE) {
    console.log("\n─────────────────────────────────────");
    console.log(`  [DEV] OTP for +91 ${phone}: ${otp}`);
    console.log("─────────────────────────────────────\n");
    return;
  }

  const resp = await fetch("https://www.fast2sms.com/dev/bulkV2", {
    method: "POST",
    headers: {
      authorization: process.env.FAST2SMS_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      route: "otp",
      variables_values: String(otp),
      numbers: phone,
    }),
  });

  const result = await resp.json();
  if (!resp.ok || result.return !== true) {
    console.error("Fast2SMS error:", result);
    throw new Error(`Fast2SMS error: ${result.message || resp.status}`);
  }
}

// ── Store OTP in DB ───────────────────────────────────────────────────────────
export async function storeOtp(phone, otp) {
  const expiresAt = new Date(Date.now() + OTP_TTL_MS).toISOString();
  const { error } = await adminSupabase
    .from("otp_store")
    .upsert([{ phone, otp_hash: hashOtp(otp), expires_at: expiresAt, attempts: 0 }], {
      onConflict: "phone",
    });
  if (error) throw error;
}

// ── Retrieve and validate OTP record ─────────────────────────────────────────
// Returns: { record } on success, throws on DB error
export async function fetchOtpRecord(phone) {
  const { data, error } = await adminSupabase
    .from("otp_store")
    .select("otp_hash, expires_at, attempts")
    .eq("phone", phone)
    .maybeSingle();
  if (error) throw error;
  return data; // null if not found
}

export async function incrementOtpAttempts(phone, currentAttempts) {
  await adminSupabase
    .from("otp_store")
    .update({ attempts: currentAttempts + 1 })
    .eq("phone", phone);
}

export async function deleteOtp(phone) {
  await adminSupabase.from("otp_store").delete().eq("phone", phone);
}

export { MAX_OTP_ATTEMPTS };