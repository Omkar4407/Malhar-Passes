import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;

export function signToken(payload, expiresIn = "12h") {
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

export function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET); // throws on invalid/expired
}