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
      event?.name && slot?.name
        ? `${event.name} [${slot.name}]`
        : event?.name || slot?.name || null,
  };
}

// GET /functions/v1/scanner-ticket?id=<ticket_uuid>
Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    await requireScannerToken(req);
  } catch (err: unknown) {
    const e = err as { status?: number; message?: string };
    return json(req, { error: e.message }, e.status ?? 401);
  }

  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return json(req, { error: "Missing ticket ID." }, 400);

  const { data, error } = await adminSupabase
    .from("tickets")
    .select(TICKET_SELECT)
    .eq("id", id)
    .single();

  if (error || !data) return json(req, { error: "Ticket not found." }, 404);
  return json(req, { ticket: normaliseTicket(data as Record<string, unknown>) });
});
