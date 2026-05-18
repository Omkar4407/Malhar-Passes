import { signToken, verifyToken } from "../services/jwt.service.js";
import adminSupabase from "../services/supabase.service.js";
import { verifyGoogleCredential } from "../services/google-auth.service.js";
import { upsertGoogleUser, fetchUserProfileForAttendee } from "../services/booking.service.js";

export async function adminLogin(req, res) {
  const { email, password } = req.body;
  if (!password || !email) return res.status(400).json({ error: "Email and password are required." });
  if (password !== process.env.ADMIN_PASSWORD)
    return res.status(401).json({ error: "Incorrect password." });

  // Verify email exists as super_admin in DB BEFORE issuing token
  const { data, error: dbError } = await adminSupabase
    .from("admins")
    .select("id, email, role")
    .eq("email", email.trim().toLowerCase())
    .eq("role", "super_admin")
    .single();

  if (dbError || !data) {
    return res.status(403).json({ error: "Access denied. This email is not authorised as a super admin." });
  }

  return res.json({ success: true, token: signToken({ role: "super_admin" }), admin: data });
}

export async function scannerLogin(req, res) {
  const { email, password } = req.body;
  if (!password || !email) return res.status(400).json({ error: "Email and password are required." });
  if (password !== process.env.SCANNER_PASSWORD)
    return res.status(401).json({ error: "Incorrect password." });

  // Verify email exists as admin in DB BEFORE issuing token
  const { data, error: dbError } = await adminSupabase
    .from("admins")
    .select("id, email, role")
    .eq("email", email.trim().toLowerCase())
    .eq("role", "admin")
    .single();

  if (dbError || !data) {
    return res.status(403).json({ error: "Access denied. Email not found or not authorized." });
  }

  return res.json({ success: true, token: signToken({ role: "scanner" }), admin: data });
}

export async function verifyTokenHandler(req, res) {
  const { token } = req.body;
  if (!token) return res.status(401).json({ valid: false });
  try {
    const payload = verifyToken(token);
    return res.json({ valid: true, payload });
  } catch {
    return res.status(401).json({ valid: false });
  }
}

/** Google Identity Services → verify ID token, upsert user row, JWT without phone until OTP. */
export async function googleAuth(req, res) {
  const { credential } = req.body;
  if (!credential || typeof credential !== "string") {
    return res.status(400).json({ error: "Missing Google credential." });
  }
  try {
    const g = await verifyGoogleCredential(credential);
    await upsertGoogleUser({
      google_sub: g.sub,
      email: g.email,
      full_name: g.full_name,
    });
    const token = signToken({
      role: "user",
      google_sub: g.sub,
      ...(g.email ? { email: g.email } : {}),
    });
    return res.json({
      success: true,
      token,
      needsPhoneVerification: true,
    });
  } catch (err) {
    console.error("google-auth error:", err);
    return res.status(401).json({ error: "Google sign-in failed. Try again." });
  }
}

/** Service-role profile read for attendee (phone and/or Google). */
export async function getAttendeeProfile(req, res) {
  try {
    const user = await fetchUserProfileForAttendee(req.attendee);
    return res.json({ user });
  } catch (err) {
    console.error("getAttendeeProfile error:", err);
    return res.status(500).json({ error: "Failed to load profile." });
  }
}