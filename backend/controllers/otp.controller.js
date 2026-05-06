import { signToken } from "../services/jwt.service.js";
import {
  hashOtp,
  sendSmsOtp,
  storeOtp,
  fetchOtpRecord,
  incrementOtpAttempts,
  deleteOtp,
  MAX_OTP_ATTEMPTS,
} from "../services/otp.service.js";
import { upsertUser } from "../services/booking.service.js";

export async function sendOtp(req, res) {
  const { phone } = req.body;
  if (!phone || !/^[6-9]\d{9}$/.test(phone)) {
    return res.status(400).json({ error: "Invalid phone number." });
  }

  try {
    const otp = Math.floor(100000 + Math.random() * 900000);
    await storeOtp(phone, otp);
    await sendSmsOtp(phone, otp);
    const devPayload = process.env.DEV_MODE === "true" ? { dev_otp: otp } : {};
    return res.json({ success: true, ...devPayload });
  } catch (err) {
    console.error("send-otp error:", err);
    return res.status(500).json({ error: "Failed to send OTP. Please try again." });
  }
}

export async function verifyOtp(req, res) {
  const { phone, otp } = req.body;
  if (!phone || !otp) return res.status(400).json({ error: "Phone and OTP are required." });

  try {
    const record = await fetchOtpRecord(phone);

    if (!record) {
      return res.status(400).json({ error: "No OTP found. Please request a new one." });
    }
    if (new Date(record.expires_at) < new Date()) {
      await deleteOtp(phone);
      return res.status(400).json({ error: "OTP has expired. Please request a new one." });
    }
    if (record.attempts >= MAX_OTP_ATTEMPTS) {
      await deleteOtp(phone);
      return res.status(429).json({ error: "Too many attempts. Please request a new OTP." });
    }

    if (hashOtp(otp) !== record.otp_hash) {
      await incrementOtpAttempts(phone, record.attempts);
      const remaining = MAX_OTP_ATTEMPTS - (record.attempts + 1);
      return res.status(400).json({
        error:
          remaining > 0
            ? `Invalid OTP. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`
            : "Too many attempts. Please request a new OTP.",
      });
    }

    // Correct OTP — clean up, upsert user, issue JWT
    await deleteOtp(phone);
    await upsertUser(phone);
    const token = signToken({ role: "user", phone });
    return res.json({ success: true, token });
  } catch (err) {
    console.error("verify-otp error:", err);
    return res.status(500).json({ error: "Verification failed. Please try again." });
  }
}