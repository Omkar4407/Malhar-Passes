import { handleCors, json } from "../_shared/http.ts";
import { verifyTokenPayload } from "../_shared/jwt.ts";

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const { token } = await req.json();
    if (!token) return json(req, { valid: false }, 401);
    const payload = await verifyTokenPayload(token);
    return json(req, { valid: true, payload });
  } catch {
    return json(req, { valid: false }, 401);
  }
});
