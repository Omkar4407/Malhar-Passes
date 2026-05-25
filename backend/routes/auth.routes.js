import { Router } from "express";
import { adminLogin, scannerLogin, verifyTokenHandler, supabaseLogin } from "../controllers/auth.controller.js";
import { adminLoginLimiter, scannerLoginLimiter } from "../middleware/rateLimiter.js";
import { blacklistToken } from "../services/tokenBlacklist.service.js";

const router = Router();

router.post("/admin-login",   adminLoginLimiter,   adminLogin);
router.post("/scanner-login", scannerLoginLimiter, scannerLogin);
router.post("/verify-token",                       verifyTokenHandler);
router.post("/auth/supabase",                      supabaseLogin);
router.post("/auth-supabase",                      supabaseLogin);

// ── Bug #2 fix: logout endpoint — invalidates the caller's JWT ────────────────
router.post("/logout", async (req, res) => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) {
    return res.status(400).json({ error: "No token provided." });
  }
  const token = auth.slice(7);
  await blacklistToken(token);
  return res.json({ message: "Logged out successfully." });
});

export default router;