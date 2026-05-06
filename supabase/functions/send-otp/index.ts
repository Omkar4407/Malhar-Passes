import { handleCors, json } from "../_shared/http.ts";
import { storeOtp, sendSmsOtp } from "../_shared/otp.ts";

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const { phone } = await req.json();
    if (!phone || !/^[6-9]\d{9}$/.test(phone)) {
      return json(req, { error: "Invalid phone number." }, 400);
    }

    const otp = Math.floor(100000 + Math.random() * 900000);
    await storeOtp(phone, otp);
    await sendSmsOtp(phone, otp);

    const devPayload = Deno.env.get("DEV_MODE") === "true" ? { dev_otp: otp } : {};
    return json(req, { success: true, ...devPayload });
  } catch (err) {
    console.error("send-otp error:", err);
    return json(req, { error: "Failed to send OTP. Please try again." }, 500);
  }
});
