import { signToken, verifyToken } from "../services/jwt.service.js";
import adminSupabase from "../services/supabase.service.js";

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