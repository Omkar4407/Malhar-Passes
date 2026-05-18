export function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") || "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Credentials": "true",
  };
}

// Return a preflight response — call this at the top of every function
export function handleCors(req: Request): Response | null {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(req) });
  }
  return null;
}

// Helper: wrap any JSON response with CORS headers
export function json(req: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), "Content-Type": "application/json" },
  });
}

import { verifyTokenPayload } from "./jwt.ts";

export type AttendeeAuth = {
  phone: string | null;
  google_sub: string | null;
  email: string | null;
};

type AuthErr = { status: number; message: string; code?: string };

/** Booking / tickets — JWT must include verified phone. */
export async function requireUserToken(req: Request): Promise<{ phone: string }> {
  const auth = req.headers.get("authorization") || "";
  if (!auth.startsWith("Bearer ")) throw { status: 401, message: "Missing token." } as AuthErr;
  const payload = await verifyTokenPayload(auth.slice(7));
  if (payload.role !== "user") {
    throw { status: 403, message: "Invalid token role." } as AuthErr;
  }
  if (!payload.phone) {
    throw {
      status: 403,
      message: "Verify your phone number before booking.",
      code: "PHONE_REQUIRED",
    } as AuthErr;
  }
  return { phone: payload.phone as string };
}

/** Profile — phone and/or google_sub from JWT. */
export async function requireAttendeeToken(req: Request): Promise<AttendeeAuth> {
  const auth = req.headers.get("authorization") || "";
  if (!auth.startsWith("Bearer ")) throw { status: 401, message: "Missing token." } as AuthErr;
  const payload = await verifyTokenPayload(auth.slice(7));
  if (payload.role !== "user") {
    throw { status: 403, message: "Invalid token role." } as AuthErr;
  }
  const phone = typeof payload.phone === "string" ? payload.phone : null;
  const google_sub = typeof payload.google_sub === "string" ? payload.google_sub : null;
  if (!phone && !google_sub) {
    throw { status: 403, message: "Invalid attendee token." } as AuthErr;
  }
  const email = typeof payload.email === "string" ? payload.email : null;
  return { phone, google_sub, email };
}

export function authErrorJson(req: Request, err: unknown): Response | null {
  const e = err as AuthErr;
  if (e.status !== 401 && e.status !== 403) return null;
  const body: Record<string, string> = { error: e.message || "Unauthorized" };
  if (e.code) body.code = e.code;
  return json(req, body, e.status);
}

export async function requireAdminToken(req: Request): Promise<void> {
  const auth = req.headers.get("authorization") || "";
  if (!auth.startsWith("Bearer ")) throw { status: 401, message: "Missing token." } as AuthErr;
  const payload = await verifyTokenPayload(auth.slice(7));
  if (payload.role !== "super_admin") {
    throw { status: 403, message: "Super admin access required." } as AuthErr;
  }
}

export async function requireScannerToken(req: Request): Promise<void> {
  const auth = req.headers.get("authorization") || "";
  if (!auth.startsWith("Bearer ")) throw { status: 401, message: "Missing token." } as AuthErr;
  const payload = await verifyTokenPayload(auth.slice(7));
  if (payload.role !== "scanner" && payload.role !== "super_admin") {
    throw { status: 403, message: "Scanner access required." } as AuthErr;
  }
}