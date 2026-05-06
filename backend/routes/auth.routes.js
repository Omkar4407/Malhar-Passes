import { Router } from "express";
import { adminLogin, scannerLogin, verifyTokenHandler } from "../controllers/auth.controller.js";
import { loginLimiter } from "../middleware/rateLimiter.js";

const router = Router();

router.post("/admin-login",   loginLimiter, adminLogin);
router.post("/scanner-login", loginLimiter, scannerLogin);
router.post("/verify-token",               verifyTokenHandler);

export default router;