import { handleCors, json, requireAttendeeToken, authErrorJson } from "../_shared/http.ts";
import { fetchUserProfileForAttendee } from "../_shared/attendee-users.ts";

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  if (req.method !== "GET") {
    return json(req, { error: "Method not allowed." }, 405);
  }

  try {
    const attendee = await requireAttendeeToken(req);
    const user = await fetchUserProfileForAttendee({
      phone: attendee.phone,
      google_sub: attendee.google_sub,
    });
    return json(req, { user });
  } catch (err: unknown) {
    const r = authErrorJson(req, err);
    if (r) return r;
    console.error("user-profile error:", err);
    return json(req, { error: "Failed to load profile." }, 500);
  }
});
