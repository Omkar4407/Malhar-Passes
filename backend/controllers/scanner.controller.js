import adminSupabase from "../services/supabase.service.js";

// Supabase PostgREST nested select:
// tickets.slot_id -> slots.id (FK: tickets_slot_id_fkey)
// slots.event_id  -> events.id (FK: slots_event_id_fkey)
// We use explicit FK hints to avoid ambiguity.
const TICKET_SELECT = `
  id, name, college, phone, photo_url,
  checked_in, checked_in_at, rejected, payment_status,
  slot_id, event_id,
  slots!tickets_slot_id_fkey (
    id, name, date, time,
    events!slots_event_id_fkey ( id, name )
  )
`;

// ── GET /scanner/ticket/:id ───────────────────────────────────────────────────
export async function getTicket(req, res) {
  const { id } = req.params;
  if (!id) return res.status(400).json({ error: "Missing ticket ID." });

  const { data, error } = await adminSupabase
    .from("tickets")
    .select(TICKET_SELECT)
    .eq("id", id)
    .single();

  if (error) {
    console.error("getTicket error:", error.message);
    return res.status(404).json({ error: "Ticket not found." });
  }
  if (!data) return res.status(404).json({ error: "Ticket not found." });

  // Flatten for convenience so frontend always gets a clean shape
  return res.json({ ticket: normaliseTicket(data) });
}

// ── POST /scanner/checkin/:id ─────────────────────────────────────────────────
export async function checkIn(req, res) {
  const { id } = req.params;
  if (!id) return res.status(400).json({ error: "Missing ticket ID." });

  const { data, error } = await adminSupabase
    .from("tickets")
    .update({ checked_in: true, checked_in_at: new Date().toISOString(), rejected: false })
    .eq("id", id)
    .select(TICKET_SELECT)
    .single();

  if (error || !data) return res.status(404).json({ error: "Ticket not found." });
  return res.json({ success: true, ticket: normaliseTicket(data) });
}

// ── POST /scanner/reject/:id ──────────────────────────────────────────────────
export async function rejectTicket(req, res) {
  const { id } = req.params;
  if (!id) return res.status(400).json({ error: "Missing ticket ID." });

  const { data, error } = await adminSupabase
    .from("tickets")
    .update({ rejected: true })
    .eq("id", id)
    .select(TICKET_SELECT)
    .single();

  if (error || !data) return res.status(404).json({ error: "Ticket not found." });
  return res.json({ success: true, ticket: normaliseTicket(data) });
}

// ── POST /admin/toggle-release-slot ──────────────────────────────────────────
// Simple boolean toggle: is_released=true opens booking, false locks it.
export async function toggleReleaseSlot(req, res) {
  const { slot_id, is_released } = req.body;

  if (!slot_id || typeof is_released !== "boolean")
    return res.status(400).json({ error: "slot_id and is_released (boolean) are required." });

  const { data, error } = await adminSupabase
    .from("slots")
    .update({ is_released })
    .eq("id", slot_id)
    .select()
    .single();

  if (error) {
    console.error("toggleReleaseSlot error:", error.message);
    return res.status(500).json({ error: "Failed to update slot." });
  }
  return res.json({ success: true, slot: data });
}

// ── Helpers ───────────────────────────────────────────────────────────────────
// Normalise the nested Supabase shape into a flat, predictable object
// so the frontend never has to worry about null joins.
function normaliseTicket(t) {
  const slot      = t.slots ?? null;
  const event     = slot?.events ?? null;
  const slotName  = slot?.name  ?? null;
  const eventName = event?.name ?? null;

  return {
    ...t,
    slots: slot
      ? {
          ...slot,
          name:   slotName,
          events: event ? { ...event, name: eventName } : null,
        }
      : null,
    // Convenience flat fields for the scanner UI
    _eventName: eventName,
    _slotName:  slotName,
    _eventSlotLabel:
      eventName && slotName
        ? `${eventName} [${slotName}]`
        : eventName || slotName || null,
  };
}