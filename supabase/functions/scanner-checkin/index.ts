// Handles:
//   POST /functions/v1/scanner-checkin  { action: "checkin"|"reject", ticket_id }
//
// FIXED: Added payment_status guard — only "paid" or "free" tickets can be checked in.
// Tickets with payment_status = "pending" or null are rejected.

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

    // Fetch ticket first to validate payment status before check-in
    const { data: existing, error: fetchError } = await adminSupabase
      .from("tickets")
      .select("id, payment_status, checked_in, rejected")
      .eq("id", ticket_id)
      .single();

    if (fetchError || !existing) return json(req, { error: "Ticket not found." }, 404);

    if (action === "checkin") {
      // SECURITY: Block check-in if payment is not confirmed
      const paymentStatus = existing.payment_status as string | null;
      if (paymentStatus !== "paid" && paymentStatus !== "free") {
        return json(req, {
          error: `Cannot check in: payment status is "${paymentStatus ?? "unknown"}". Only paid or free tickets can be checked in.`,
          payment_status: paymentStatus,
        }, 422);
      }

      if (existing.checked_in) {
        return json(req, { error: "Ticket already checked in." }, 409);
      }
    }

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
