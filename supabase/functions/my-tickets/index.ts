import { handleCors, json, requireUserToken } from "../_shared/http.ts";
import adminSupabase from "../_shared/supabase.ts";

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const { phone } = await requireUserToken(req);

    const { data, error } = await adminSupabase
      .from("tickets")
      .select(`
        id, name, college, phone, photo_url,
        checked_in, checked_in_at, rejected, payment_status,
        slot_id, event_id,
        slots!tickets_slot_id_fkey (
          id, name, date, time,
          events!slots_event_id_fkey ( id, name )
        )
      `)
      .eq("phone", phone)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return json(req, { tickets: data || [] });
  } catch (err: unknown) {
    const e = err as { status?: number; message?: string };
    if (e.status === 401 || e.status === 403) return json(req, { error: e.message }, e.status);
    console.error("my-tickets error:", err);
    return json(req, { error: "Failed to fetch tickets." }, 500);
  }
});
