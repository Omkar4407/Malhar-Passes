import { handleCors, json } from "../_shared/http.ts";
import { signToken, verifyTokenPayload } from "../_shared/jwt.ts";
import {
  hashOtp,
  fetchOtpRecord,
  incrementOtpAttempts,
  deleteOtp,
  MAX_OTP_ATTEMPTS,
} from "../_shared/otp.ts";
import { linkPhoneAfterOtp, fetchUserProfileForAttendee } from "../_shared/attendee-users.ts";

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const { phone, otp } = await req.json();
    if (!phone || !otp) return json(req, { error: "Phone and OTP are required." }, 400);

    const record = await fetchOtpRecord(phone);

    if (!record) {
      return json(req, { error: "No OTP found. Please request a new one." }, 400);
    }
    if (new Date(record.expires_at) < new Date()) {
      await deleteOtp(phone);
      return json(req, { error: "OTP has expired. Please request a new one." }, 400);
    }
    if (record.attempts >= MAX_OTP_ATTEMPTS) {
      await deleteOtp(phone);
      return json(req, { error: "Too many attempts. Please request a new OTP." }, 429);
    }

    if ((await hashOtp(otp)) !== record.otp_hash) {
      await incrementOtpAttempts(phone, record.attempts);
      const remaining = MAX_OTP_ATTEMPTS - (record.attempts + 1);
      return json(req, {
        error:
          remaining > 0
            ? `Invalid OTP. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`
            : "Too many attempts. Please request a new OTP.",
      }, 400);
    }

    let googleSubFromToken: string | null = null;
    const auth = req.headers.get("authorization") || "";
    if (auth.startsWith("Bearer ")) {
      try {
        const p = await verifyTokenPayload(auth.slice(7));
        if (p.role === "user" && p.google_sub && !p.phone) {
          googleSubFromToken = p.google_sub as string;
        }
      } catch {
        return json(req, { error: "Invalid session. Sign in again." }, 401);
      }
    }

    await deleteOtp(phone);
    await linkPhoneAfterOtp(phone, googleSubFromToken);

    const profile = await fetchUserProfileForAttendee({ phone });
    const tokenPayload: Record<string, string> = { role: "user", phone };
    if (profile?.google_sub) tokenPayload.google_sub = profile.google_sub as string;
    if (profile?.email) tokenPayload.email = profile.email as string;

    const token = await signToken(tokenPayload);
    return json(req, { success: true, token });
  } catch (err) {
    console.error("verify-otp error:", err);
    return json(req, { error: "Verification failed. Please try again." }, 500);
  }
});
