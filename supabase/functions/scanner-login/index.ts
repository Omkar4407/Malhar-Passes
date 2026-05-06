import { handleCors, json } from "../_shared/http.ts";
import { signToken } from "../_shared/jwt.ts";
import adminSupabase from "../_shared/supabase.ts";

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const { email, password } = await req.json();
    if (!password || !email) return json(req, { error: "Email and password are required." }, 400);
    if (password !== Deno.env.get("SCANNER_PASSWORD"))
      return json(req, { error: "Incorrect password." }, 401);

    const { data, error: dbError } = await adminSupabase
      .from("admins")
      .select("id, email, role")
      .eq("email", email.trim().toLowerCase())
      .eq("role", "admin")
      .single();

    if (dbError || !data) {
      return json(req, { error: "Access denied. Email not found or not authorized." }, 403);
    }

    const token = await signToken({ role: "scanner" });
    return json(req, { success: true, token, admin: data });
  } catch (err) {
    console.error("scanner-login error:", err);
    return json(req, { error: "Login failed." }, 500);
  }
});
