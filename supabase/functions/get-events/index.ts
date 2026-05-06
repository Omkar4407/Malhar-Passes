import { handleCors, json } from "../_shared/http.ts";
import adminSupabase from "../_shared/supabase.ts";

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  const { data, error } = await adminSupabase
    .from("events")
    .select("id, name, type, price, created_at")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("getEvents error:", error.message);
    return json(req, { error: "Failed to fetch events." }, 500);
  }
  return json(req, { events: data || [] });
});
