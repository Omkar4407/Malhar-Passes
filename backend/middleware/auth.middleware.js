import { verifyToken } from "../services/jwt.service.js";

// Attendee JWT may include phone (OTP verified) and/or google_sub (Google sign-in).
export function requireAttendeeToken(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing token." });
  }
  try {
    const payload = verifyToken(auth.slice(7));
    if (payload.role !== "user") {
      return res.status(403).json({ error: "Invalid token role." });
    }
    if (!payload.phone && !payload.google_sub) {
      return res.status(403).json({ error: "Invalid attendee token." });
    }
    req.attendee = {
      phone: payload.phone || null,
      google_sub: payload.google_sub || null,
      email: payload.email || null,
    };
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token." });
  }
}

// Booking / tickets — requires OTP-verified phone (same as legacy requireUserToken).
export function requireVerifiedPhone(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing token." });
  }
  try {
    const payload = verifyToken(auth.slice(7));
    if (payload.role !== "user" || !payload.phone) {
      return res.status(403).json({
        error: "Verify your phone number before booking.",
        code: "PHONE_REQUIRED",
      });
    }
    req.userPhone = payload.phone;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token." });
  }
}
// Verifies Bearer JWT for scanner role.
export function requireScannerToken(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing token." });
  }
  try {
    const payload = verifyToken(auth.slice(7));
    if (payload.role !== "scanner" && payload.role !== "super_admin") {
      return res.status(403).json({ error: "Scanner access required." });
    }
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token." });
  }
}

// Verifies Bearer JWT for super_admin role only.
export function requireAdminToken(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing token." });
  }
  try {
    const payload = verifyToken(auth.slice(7));
    if (payload.role !== "super_admin") {
      return res.status(403).json({ error: "Super admin access required." });
    }
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token." });
  }
}