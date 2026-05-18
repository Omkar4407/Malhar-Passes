import { handleCors, json } from "../_shared/http.ts";
import { signToken } from "../_shared/jwt.ts";
import { verifyGoogleIdToken } from "../_shared/google-verify.ts";
import { upsertGoogleUser } from "../_shared/attendee-users.ts";

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
    if (!clientId) {
      console.error("google-auth: GOOGLE_CLIENT_ID secret not set");
      return json(req, { error: "Google sign-in is not configured." }, 503);
    }

    const { credential } = await req.json();
    if (!credential || typeof credential !== "string") {
      return json(req, { error: "Missing Google credential." }, 400);
    }

    const g = await verifyGoogleIdToken(credential, clientId);
    await upsertGoogleUser({
      google_sub: g.sub,
      email: g.email,
      full_name: g.full_name,
    });

    const tokenPayload: Record<string, string> = {
      role: "user",
      google_sub: g.sub,
    };
    if (g.email) tokenPayload.email = g.email;

    const token = await signToken(tokenPayload);
    return json(req, {
      success: true,
      token,
      needsPhoneVerification: true,
    });
  } catch (err) {
    console.error("google-auth error:", err);
    return json(req, { error: "Google sign-in failed. Try again." }, 401);
  }
});
