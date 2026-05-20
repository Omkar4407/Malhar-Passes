import { Router } from "express";
import { adminLogin, scannerLogin, verifyTokenHandler, supabaseLogin } from "../controllers/auth.controller.js";
import { loginLimiter } from "../middleware/rateLimiter.js";

const router = Router();

router.post("/admin-login",   loginLimiter, adminLogin);
router.post("/scanner-login", loginLimiter, scannerLogin);
router.post("/verify-token",               verifyTokenHandler);
router.post("/auth/supabase",              supabaseLogin);

export default router;