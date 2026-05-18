import { createRemoteJWKSet, jwtVerify } from "https://deno.land/x/jose@v5.9.6/index.ts";

const JWKS = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));

export type GoogleIdPayload = {
  sub: string;
  email: string | null;
  full_name: string | null;
  picture: string | null;
};

/** Verify Google Sign-In credential (ID token JWT). */
export async function verifyGoogleIdToken(
  idToken: string,
  clientId: string,
): Promise<GoogleIdPayload> {
  const { payload } = await jwtVerify(idToken, JWKS, {
    issuer: ["https://accounts.google.com", "accounts.google.com"],
    audience: clientId,
  });
  const sub = typeof payload.sub === "string" ? payload.sub : "";
  if (!sub) throw new Error("Invalid Google token: missing sub.");
  return {
    sub,
    email: typeof payload.email === "string" ? payload.email : null,
    full_name: typeof payload.name === "string" ? payload.name : null,
    picture: typeof payload.picture === "string" ? payload.picture : null,
  };
}
