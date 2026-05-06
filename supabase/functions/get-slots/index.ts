import { handleCors, json } from "../_shared/http.ts";
import adminSupabase from "../_shared/supabase.ts";

// GET /functions/v1/get-slots?event_id=<uuid>
// Mirrors GET /events/:id/slots
Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  const url = new URL(req.url);
  const event_id = url.searchParams.get("event_id");

  if (!event_id) return json(req, { error: "event_id is required." }, 400);

  const { data, error } = await adminSupabase
    .from("slots")
    .select("id, name, date, time, capacity, booked_count, is_released, event_id")
    .eq("event_id", event_id)
    .order("id", { ascending: true });

  if (error) {
    console.error("getSlots error:", error.message);
    return json(req, { error: "Failed to fetch slots." }, 500);
  }
  return json(req, { slots: data || [] });
});
