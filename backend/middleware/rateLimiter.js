import { rateLimit, ipKeyGenerator } from "express-rate-limit";

export const sendOtpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  // Rate-limit by phone number when available, fall back to IP (IPv6-safe via ipKeyGenerator)
  keyGenerator: (req) => req.body.phone || ipKeyGenerator(req),
  handler: (req, res) =>
    res.status(429).json({ error: "Too many OTP requests. Please wait 10 minutes." }),
  standardHeaders: true,
  legacyHeaders: false,
});

export const verifyOtpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  handler: (req, res) =>
    res.status(429).json({ error: "Too many verification attempts. Please wait 15 minutes." }),
  standardHeaders: true,
  legacyHeaders: false,
});

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  handler: (req, res) =>
    res.status(429).json({ error: "Too many login attempts. Please wait 15 minutes." }),
  standardHeaders: true,
  legacyHeaders: false,
});

export const paymentLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  keyGenerator: (req) => ipKeyGenerator(req),
  handler: (req, res) =>
    res.status(429).json({ error: "Too many payment requests. Please slow down." }),
  standardHeaders: true,
  legacyHeaders: false,
});