// ── Token Blacklist Service (Supabase-backed) ──────────────────────────────────
// Stores a SHA-256 hash of each logged-out JWT in the `token_blacklist` table.
// Survives server restarts, works across multiple instances.
//
// Required SQL (run once in Supabase SQL editor):
// ─────────────────────────────────────────────
// create table if not exists token_blacklist (
//   id          bigint generated always as identity primary key,
//   token_hash  text        not null unique,
//   expires_at  timestamptz not null
// );
// create index on token_blacklist (token_hash);
// create index on token_blacklist (expires_at);
// ─────────────────────────────────────────────

import jwt      from "jsonwebtoken";
import crypto   from "crypto";
import adminSupabase from "./supabase.service.js";

/** SHA-256 hash of the raw token — we never store the real JWT. */
function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Add a JWT to the blacklist until it naturally expires.
 * @param {string} token - Raw JWT string (no "Bearer " prefix).
 */
export async function blacklistToken(token) {
  try {
    const decoded = jwt.decode(token);
    if (!decoded?.exp) return; // malformed / already expired – skip

    const expiresAt = new Date(decoded.exp * 1000).toISOString();
    const tokenHash = hashToken(token);

    await adminSupabase
      .from("token_blacklist")
      .upsert({ token_hash: tokenHash, expires_at: expiresAt }, { onConflict: "token_hash" });
  } catch (err) {
    console.error("blacklistToken error:", err.message);
  }
}

/**
 * Returns true if the token is on the blacklist and has not yet expired.
 * @param {string} token - Raw JWT string (no "Bearer " prefix).
 */
export async function isBlacklisted(token) {
  try {
    const tokenHash = hashToken(token);
    const { data } = await adminSupabase
      .from("token_blacklist")
      .select("token_hash")
      .eq("token_hash", tokenHash)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();
    return !!data;
  } catch {
    return false; // fail open — don't block requests on DB error
  }
}

// ── Periodic cleanup (every 30 min) ───────────────────────────────────────────
// Deletes fully-expired rows so the table never grows unbounded.
setInterval(async () => {
  try {
    await adminSupabase
      .from("token_blacklist")
      .delete()
      .lt("expires_at", new Date().toISOString());
  } catch { /* ignore */ }
}, 30 * 60 * 1000).unref();
