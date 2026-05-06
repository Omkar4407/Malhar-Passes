// Handles all /admin/slots routes:
//   GET    → list all slots
//   POST   → create slot
//   PATCH  → update slot  (pass slot_id in body)
//   DELETE → delete slot  (pass slot_id in body)

import { handleCors, json, requireAdminToken } from "../_shared/http.ts";
import adminSupabase from "../_shared/supabase.ts";

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    await requireAdminToken(req);
  } catch (err: unknown) {
    const e = err as { status?: number; message?: string };
    return json(req, { error: e.message }, e.status ?? 401);
  }

  try {
    if (req.method === "GET") {
      const { data, error } = await adminSupabase
        .from("slots")
        .select("id, name, date, time, capacity, booked_count, is_released, event_id")
        .order("id", { ascending: true });
      if (error) throw error;
      return json(req, { slots: data || [] });
    }

    const body = await req.json();

    if (req.method === "POST") {
      const { name, time, capacity, event_id } = body;
      if (!name?.trim() || !event_id) return json(req, { error: "name and event_id required." }, 400);
      if (!capacity || Number(capacity) < 1) return json(req, { error: "Capacity must be at least 1." }, 400);
      const { data, error } = await adminSupabase
        .from("slots")
        .insert([{
          name: name.trim(),
          time: time?.trim() || "",
          capacity: Number(capacity),
          event_id,
          booked_count: 0,
          is_released: false,
        }])
        .select()
        .single();
      if (error) throw error;
      return json(req, { slot: data }, 201);
    }

    if (req.method === "PATCH") {
      const { slot_id, name, time, capacity } = body;
      if (!slot_id) return json(req, { error: "slot_id is required." }, 400);
      const updates: Record<string, unknown> = {};
      if (name) updates.name = name.trim();
      if (time !== undefined) updates.time = time.trim();
      if (capacity) updates.capacity = Number(capacity);
      const { data, error } = await adminSupabase
        .from("slots").update(updates).eq("id", slot_id).select().single();
      if (error) throw error;
      return json(req, { slot: data });
    }

    if (req.method === "DELETE") {
      const { slot_id } = body;
      if (!slot_id) return json(req, { error: "slot_id is required." }, 400);
      const { error } = await adminSupabase.from("slots").delete().eq("id", slot_id);
      if (error) throw error;
      return json(req, { success: true });
    }

    return json(req, { error: "Method not allowed." }, 405);
  } catch (err) {
    console.error("admin-slots error:", err);
    return json(req, { error: "Operation failed." }, 500);
  }
});
