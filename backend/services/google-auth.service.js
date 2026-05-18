import { OAuth2Client } from "google-auth-library";

const clientId =
  process.env.GOOGLE_CLIENT_ID ||
  process.env.client_id?.replace(/^"|"$/g, "") ||
  process.env.GOOGLE_OAUTH_CLIENT_ID;
let client;

function getClient() {
  if (!clientId) return null;
  if (!client) client = new OAuth2Client(clientId);
  return client;
}

/** Verify Google Sign-In ID token (credential JWT from GIS). */
export async function verifyGoogleCredential(idToken) {
  const c = getClient();
  if (!c || !clientId) {
    throw new Error("GOOGLE_CLIENT_ID is not configured.");
  }
  const ticket = await c.verifyIdToken({
    idToken,
    audience: clientId,
  });
  const payload = ticket.getPayload();
  if (!payload?.sub) throw new Error("Invalid Google token payload.");
  return {
    sub: payload.sub,
    email: payload.email || null,
    full_name: payload.name || null,
    picture: payload.picture || null,
  };
}
