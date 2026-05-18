import { Router } from "express";
import {
  adminLogin,
  scannerLogin,
  verifyTokenHandler,
  googleAuth,
  getAttendeeProfile,
} from "../controllers/auth.controller.js";
import { loginLimiter } from "../middleware/rateLimiter.js";
import { requireAttendeeToken } from "../middleware/auth.middleware.js";

const router = Router();

router.post("/admin-login",   loginLimiter, adminLogin);
router.post("/scanner-login", loginLimiter, scannerLogin);
router.post("/verify-token",               verifyTokenHandler);
router.post("/google-auth",   loginLimiter, googleAuth);
router.get("/user/profile",   requireAttendeeToken, getAttendeeProfile);
router.get("/user-profile",   requireAttendeeToken, getAttendeeProfile);

export default router;