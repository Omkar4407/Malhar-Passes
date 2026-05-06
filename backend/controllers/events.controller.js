import adminSupabase from "../services/supabase.service.js";

// ── GET /events ───────────────────────────────────────────────────────────────
export async function getEvents(req, res) {
  const { data, error } = await adminSupabase
    .from("events")
    .select("id, name, type, price, created_at")
    .order("created_at", { ascending: true });
  if (error) {
    console.error("getEvents error:", error.message);
    return res.status(500).json({ error: "Failed to fetch events." });
  }
  return res.json({ events: data || [] });
}

// ── GET /events/:id/slots ─────────────────────────────────────────────────────
// Public endpoint — returns ALL slots for the event (released and unreleased).
// The frontend decides how to render based on is_released.
export async function getSlots(req, res) {
  const { id } = req.params;
  const { data, error } = await adminSupabase
    .from("slots")
    .select("id, name, date, time, capacity, booked_count, is_released, event_id")
    .eq("event_id", id)
    .order("id", { ascending: true });
  if (error) {
    console.error("getSlots error:", error.message);
    return res.status(500).json({ error: "Failed to fetch slots." });
  }
  return res.json({ slots: data || [] });
}

// ── GET /admin/events ─────────────────────────────────────────────────────────
export async function adminGetEvents(req, res) {
  const { data, error } = await adminSupabase
    .from("events")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) {
    console.error("adminGetEvents error:", error.message);
    return res.status(500).json({ error: "Failed to fetch events." });
  }
  return res.json({ events: data || [] });
}

// ── GET /admin/slots ──────────────────────────────────────────────────────────
export async function adminGetSlots(req, res) {
  const { data, error } = await adminSupabase
    .from("slots")
    .select("id, name, date, time, capacity, booked_count, is_released, event_id")
    .order("id", { ascending: true });
  if (error) {
    console.error("adminGetSlots error:", error.message);
    return res.status(500).json({ error: "Failed to fetch slots." });
  }
  return res.json({ slots: data || [] });
}

// ── POST /admin/events ────────────────────────────────────────────────────────
export async function createEvent(req, res) {
  const { name, price } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: "Event name is required." });
  const { data, error } = await adminSupabase
    .from("events")
    .insert([{ name: name.trim(), price: Number(price) || 0 }])
    .select()
    .single();
  if (error) return res.status(500).json({ error: "Failed to create event." });
  return res.status(201).json({ event: data });
}

// ── PATCH /admin/events/:id ───────────────────────────────────────────────────
export async function updateEvent(req, res) {
  const { id } = req.params;
  const { name, price } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: "Event name is required." });
  const { data, error } = await adminSupabase
    .from("events")
    .update({ name: name.trim(), price: Number(price) || 0 })
    .eq("id", id)
    .select()
    .single();
  if (error) return res.status(500).json({ error: "Failed to update event." });
  return res.json({ event: data });
}

// ── DELETE /admin/events/:id ──────────────────────────────────────────────────
export async function deleteEvent(req, res) {
  const { id } = req.params;
  await adminSupabase.from("slots").delete().eq("event_id", id);
  const { error } = await adminSupabase.from("events").delete().eq("id", id);
  if (error) return res.status(500).json({ error: "Failed to delete event." });
  return res.json({ success: true });
}

// ── POST /admin/slots ─────────────────────────────────────────────────────────
export async function createSlot(req, res) {
  const { name, time, capacity, event_id } = req.body;
  if (!name?.trim() || !event_id) return res.status(400).json({ error: "name and event_id required." });
  if (!capacity || Number(capacity) < 1) return res.status(400).json({ error: "Capacity must be at least 1." });

  const { data, error } = await adminSupabase
    .from("slots")
    .insert([{
      name: name.trim(),
      time: time?.trim() || "",
      capacity: Number(capacity),
      event_id,
      booked_count: 0,
      is_released: false,   // new slots start locked — admin must explicitly release
    }])
    .select()
    .single();

  if (error) return res.status(500).json({ error: "Failed to create slot." });
  return res.status(201).json({ slot: data });
}

// ── PATCH /admin/slots/:id ────────────────────────────────────────────────────
export async function updateSlot(req, res) {
  const { id } = req.params;
  const { name, time, capacity } = req.body;
  const updates = {};
  if (name)               updates.name     = name.trim();
  if (time !== undefined) updates.time     = time.trim();
  if (capacity)           updates.capacity = Number(capacity);
  const { data, error } = await adminSupabase
    .from("slots").update(updates).eq("id", id).select().single();
  if (error) return res.status(500).json({ error: "Failed to update slot." });
  return res.json({ slot: data });
}

// ── DELETE /admin/slots/:id ───────────────────────────────────────────────────
export async function deleteSlot(req, res) {
  const { id } = req.params;
  const { error } = await adminSupabase.from("slots").delete().eq("id", id);
  if (error) return res.status(500).json({ error: "Failed to delete slot." });
  return res.json({ success: true });
}