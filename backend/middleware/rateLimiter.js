import { rateLimit, ipKeyGenerator } from "express-rate-limit";

// ── Bug #3 fix: OTP send — max 3 requests per 10 min per phone/IP ─────────────
export const sendOtpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 3,
  // Rate-limit by phone number when available, fall back to IP (IPv6-safe via ipKeyGenerator)
  keyGenerator: (req) => req.body.phone || ipKeyGenerator(req),
  handler: (req, res) =>
    res.status(429).json({ error: "Too many OTP requests. Please wait 10 minutes." }),
  standardHeaders: true,
  legacyHeaders: false,
});

// ── Bug #3 fix: OTP verify — max 5 attempts per 10 min ───────────────────────
export const verifyOtpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  handler: (req, res) =>
    res.status(429).json({ error: "Too many verification attempts. Please wait 10 minutes." }),
  standardHeaders: true,
  legacyHeaders: false,
});


// Admin login — 5 wrong passwords per 15 min (successful logins don't count)
export const adminLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  // Key by email + IP so two different admins on the same machine don't share a bucket
  keyGenerator: (req) => `${(req.body.email || "").toLowerCase().trim()}:${ipKeyGenerator(req)}`,
  skipSuccessfulRequests: true,
  handler: (req, res) =>
    res.status(429).json({ error: "Too many failed login attempts. Please wait 15 minutes." }),
  standardHeaders: true,
  legacyHeaders: false,
});

// Scanner login — same rules as admin
export const scannerLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  keyGenerator: (req) => `${(req.body.email || "").toLowerCase().trim()}:${ipKeyGenerator(req)}`,
  skipSuccessfulRequests: true,
  handler: (req, res) =>
    res.status(429).json({ error: "Too many failed login attempts. Please wait 15 minutes." }),
  standardHeaders: true,
  legacyHeaders: false,
});

// Keep generic loginLimiter as a fallback alias (not currently used directly)
export const loginLimiter = adminLoginLimiter;

export const paymentLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  keyGenerator: (req) => ipKeyGenerator(req),
  handler: (req, res) =>
    res.status(429).json({ error: "Too many payment requests. Please slow down." }),
  standardHeaders: true,
  legacyHeaders: false,
});