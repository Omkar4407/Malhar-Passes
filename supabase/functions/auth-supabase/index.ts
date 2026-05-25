import { handleCors, json } from "../_shared/http.ts";
import { signToken } from "../_shared/jwt.ts";
import adminSupabase from "../_shared/supabase.ts";

declare const Deno: {
  serve: (handler: (req: Request) => Promise<Response>) => void;
  env: {
    get: (key: string) => string | undefined;
  };
};

Deno.serve(async (req: Request) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const { access_token } = await req.json();
    if (!access_token) return json(req, { error: "Missing token." }, 400);

    const { data, error } = await adminSupabase.auth.getUser(access_token);
    if (error || !data.user) {
      console.error("Auth error:", error);
      return json(req, { error: "Invalid Supabase token.", details: error }, 401);
    }

    const email = data.user.email || "";
    const name = data.user.user_metadata?.full_name || email.split("@")[0] || "User";

    // Issue standard userToken for frontend
    const token = await signToken({ role: "user", email, name, sub: data.user.id });

    return json(req, { success: true, token, user: { email, name } });
  } catch (err) {
    console.error("Supabase Auth Error:", err);
    return json(req, { error: "Internal Error" }, 500);
  }
});
