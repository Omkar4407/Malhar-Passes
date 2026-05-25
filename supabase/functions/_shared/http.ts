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

export async function requireUserToken(req: Request): Promise<{ phone?: string; email?: string }> {
  const auth = req.headers.get("authorization") || "";
  if (!auth.startsWith("Bearer "))
    throw Object.assign(new Error("Missing token."), { status: 401 });
  const payload = await verifyTokenPayload(auth.slice(7));
  if ((payload.role !== "user" && payload.role !== "student") || (!payload.phone && !payload.email))
    throw Object.assign(new Error("Invalid token role."), { status: 403 });
  return { phone: payload.phone as string | undefined, email: payload.email as string | undefined };
}

export async function requireAdminToken(req: Request): Promise<void> {
  const auth = req.headers.get("authorization") || "";
  if (!auth.startsWith("Bearer "))
    throw Object.assign(new Error("Missing token."), { status: 401 });
  const payload = await verifyTokenPayload(auth.slice(7));
  if (payload.role !== "super_admin")
    throw Object.assign(new Error("Super admin access required."), { status: 403 });
}

export async function requireScannerToken(req: Request): Promise<void> {
  const auth = req.headers.get("authorization") || "";
  if (!auth.startsWith("Bearer "))
    throw Object.assign(new Error("Missing token."), { status: 401 });
  const payload = await verifyTokenPayload(auth.slice(7));
  if (payload.role !== "scanner" && payload.role !== "super_admin")
    throw Object.assign(new Error("Scanner access required."), { status: 403 });
}