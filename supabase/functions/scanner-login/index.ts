// Scanner login via Google OAuth — verifies the Google access token,
// checks that the email is in the admins table with role "admin",
// and returns our own signed JWT.

import { handleCors, json } from "../_shared/http.ts";
import { signToken } from "../_shared/jwt.ts";
import adminSupabase from "../_shared/supabase.ts";

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const { access_token } = await req.json();
    if (!access_token) return json(req, { error: "Missing Google access_token." }, 400);

    // Verify the Google access token
    const googleRes = await fetch(
      `https://www.googleapis.com/oauth2/v3/userinfo`,
      { headers: { Authorization: `Bearer ${access_token}` } }
    );

    if (!googleRes.ok) {
      return json(req, { error: "Invalid Google token." }, 401);
    }

    const googleUser = await googleRes.json();
    const email = (googleUser.email || "").trim().toLowerCase();

    if (!email || !googleUser.email_verified) {
      return json(req, { error: "Google account email not verified." }, 401);
    }

    // Check that email is in admins table with role "admin" (scanner role)
    const { data, error: dbError } = await adminSupabase
      .from("admins")
      .select("id, email, role")
      .eq("email", email)
      .eq("role", "admin")
      .single();

    if (dbError || !data) {
      return json(req, { error: "Access denied. This Google account is not authorised as a scanner." }, 403);
    }

    const token = await signToken({ role: "scanner", email, sub: data.id });
    return json(req, { success: true, token, admin: data });
  } catch (err) {
    console.error("scanner-login error:", err);
    return json(req, { error: "Login failed." }, 500);
  }
});
