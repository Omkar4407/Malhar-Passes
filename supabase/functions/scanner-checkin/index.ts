// Handles:
//   POST /functions/v1/scanner-action  { action: "checkin"|"reject", ticket_id }

import { handleCors, json, requireScannerToken } from "../_shared/http.ts";
import adminSupabase from "../_shared/supabase.ts";

const TICKET_SELECT = `
  id, name, college, phone, photo_url,
  checked_in, checked_in_at, rejected, payment_status,
  slot_id, event_id,
  slots!tickets_slot_id_fkey (
    id, name, date, time,
    events!slots_event_id_fkey ( id, name )
  )
`;

function normaliseTicket(t: Record<string, unknown>) {
  const slot = t.slots as Record<string, unknown> | null ?? null;
  const event = slot?.events as Record<string, unknown> | null ?? null;
  return {
    ...t,
    slots: slot ? { ...slot, events: event } : null,
    _eventName: (event?.name as string) ?? null,
    _slotName: (slot?.name as string) ?? null,
    _eventSlotLabel:
      event?.name && slot?.name ? `${event.name} [${slot.name}]` : event?.name || slot?.name || null,
  };
}

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    await requireScannerToken(req);
  } catch (err: unknown) {
    const e = err as { status?: number; message?: string };
    return json(req, { error: e.message }, e.status ?? 401);
  }

  try {
    const { action, ticket_id } = await req.json();
    if (!ticket_id) return json(req, { error: "Missing ticket ID." }, 400);

    let updatePayload: Record<string, unknown>;
    if (action === "checkin") {
      updatePayload = { checked_in: true, checked_in_at: new Date().toISOString(), rejected: false };
    } else if (action === "reject") {
      updatePayload = { rejected: true };
    } else {
      return json(req, { error: "action must be 'checkin' or 'reject'." }, 400);
    }

    const { data, error } = await adminSupabase
      .from("tickets")
      .update(updatePayload)
      .eq("id", ticket_id)
      .select(TICKET_SELECT)
      .single();

    if (error || !data) return json(req, { error: "Ticket not found." }, 404);
    return json(req, { success: true, ticket: normaliseTicket(data as Record<string, unknown>) });
  } catch (err) {
    console.error("scanner-action error:", err);
    return json(req, { error: "Action failed." }, 500);
  }
});
