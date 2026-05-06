import { verifyToken } from "../services/jwt.service.js";

// Verifies Bearer JWT and attaches req.userPhone (from token — never from body).
// Phone embedded in the signed JWT cannot be spoofed by the client.
export function requireUserToken(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing token." });
  }
  try {
    const payload = verifyToken(auth.slice(7));
    if (payload.role !== "user" || !payload.phone) {
      return res.status(403).json({ error: "Invalid token role." });
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