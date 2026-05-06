import { Router } from "express";
import { sendOtp, verifyOtp } from "../controllers/otp.controller.js";
import { sendOtpLimiter, verifyOtpLimiter } from "../middleware/rateLimiter.js";

const router = Router();

router.post("/send-otp",   sendOtpLimiter,   sendOtp);
router.post("/verify-otp", verifyOtpLimiter, verifyOtp);

export default router;