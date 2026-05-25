import { verifyToken } from "../services/jwt.service.js";
import { isBlacklisted } from "../services/tokenBlacklist.service.js";

// Helper: extract raw token string from Authorization header.
function extractToken(auth) {
  return auth && auth.startsWith("Bearer ") ? auth.slice(7) : null;
}

// Verifies Bearer JWT and attaches req.userPhone (from token — never from body).
// Phone embedded in the signed JWT cannot be spoofed by the client.
export async function requireUserToken(req, res, next) {
  const auth = req.headers.authorization;
  const token = extractToken(auth);
  if (!token) return res.status(401).json({ error: "Missing token." });

  // Reject blacklisted (logged-out) tokens — Supabase-backed, survives restarts
  if (await isBlacklisted(token)) {
    return res.status(401).json({ error: "Token has been invalidated. Please log in again." });
  }

  try {
    const payload = verifyToken(token);
    if (payload.role !== "user" && payload.role !== "student") {
      return res.status(403).json({ error: "Invalid token role." });
    }
    req.userPhone = payload.phone || payload.email;
    if (!req.userPhone) {
      return res.status(403).json({ error: "Invalid token data." });
    }
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token." });
  }
}

// Verifies Bearer JWT for scanner role.
export async function requireScannerToken(req, res, next) {
  const auth = req.headers.authorization;
  const token = extractToken(auth);
  if (!token) return res.status(401).json({ error: "Missing token." });

  if (await isBlacklisted(token)) {
    return res.status(401).json({ error: "Token has been invalidated. Please log in again." });
  }

  try {
    const payload = verifyToken(token);
    if (payload.role !== "scanner" && payload.role !== "super_admin") {
      return res.status(403).json({ error: "Scanner access required." });
    }
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token." });
  }
}

// Verifies Bearer JWT for super_admin role only.
export async function requireAdminToken(req, res, next) {
  const auth = req.headers.authorization;
  const token = extractToken(auth);
  if (!token) return res.status(401).json({ error: "Missing token." });

  if (await isBlacklisted(token)) {
    return res.status(401).json({ error: "Token has been invalidated. Please log in again." });
  }

  try {
    const payload = verifyToken(token);
    if (payload.role !== "super_admin") {
      return res.status(403).json({ error: "Super admin access required." });
    }
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token." });
  }
}