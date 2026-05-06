// Handles all /admin/events routes:
//   GET    → list all events (admin full select)
//   POST   → create event
//   PATCH  → update event  (pass event_id in body)
//   DELETE → delete event  (pass event_id in body)

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
        .from("events")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return json(req, { events: data || [] });
    }

    const body = await req.json();

    if (req.method === "POST") {
      const { name, price } = body;
      if (!name?.trim()) return json(req, { error: "Event name is required." }, 400);
      const { data, error } = await adminSupabase
        .from("events")
        .insert([{ name: name.trim(), price: Number(price) || 0 }])
        .select()
        .single();
      if (error) throw error;
      return json(req, { event: data }, 201);
    }

    if (req.method === "PATCH") {
      const { event_id, name, price } = body;
      if (!event_id) return json(req, { error: "event_id is required." }, 400);
      if (!name?.trim()) return json(req, { error: "Event name is required." }, 400);
      const { data, error } = await adminSupabase
        .from("events")
        .update({ name: name.trim(), price: Number(price) || 0 })
        .eq("id", event_id)
        .select()
        .single();
      if (error) throw error;
      return json(req, { event: data });
    }

    if (req.method === "DELETE") {
      const { event_id } = body;
      if (!event_id) return json(req, { error: "event_id is required." }, 400);
      await adminSupabase.from("slots").delete().eq("event_id", event_id);
      const { error } = await adminSupabase.from("events").delete().eq("id", event_id);
      if (error) throw error;
      return json(req, { success: true });
    }

    return json(req, { error: "Method not allowed." }, 405);
  } catch (err) {
    console.error("admin-events error:", err);
    return json(req, { error: "Operation failed." }, 500);
  }
});
