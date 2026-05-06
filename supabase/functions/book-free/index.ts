import { handleCors, json, requireUserToken } from "../_shared/http.ts";
import adminSupabase from "../_shared/supabase.ts";

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const { phone } = await requireUserToken(req);
    const { name, college, slot_id, event_id, photo_url } = await req.json();

    if (!name || !college || !slot_id || !event_id)
      return json(req, { error: "Missing required fields." }, 400);
    if (name.trim().length > 100)
      return json(req, { error: "Name must be 100 characters or fewer." }, 400);
    if (college.trim().length > 150)
      return json(req, { error: "College name must be 150 characters or fewer." }, 400);

    const { data, error } = await adminSupabase.rpc("book_slot", {
      p_slot_id: slot_id,
      p_ticket_data: {
        name: name.trim(),
        college: college.trim(),
        phone, // always from JWT
        event_id,
        photo_url,
        payment_status: "free",
        razorpay_order_id: null,
        razorpay_payment_id: null,
      },
    });
    if (error) throw error;
    if (!data.success) return json(req, { error: data.error || "Slot is full." }, 409);

    const { data: ticket } = await adminSupabase
      .from("tickets")
      .select("*")
      .eq("id", data.ticket_id)
      .single();

    return json(req, { success: true, ticket });
  } catch (err: unknown) {
    const e = err as { status?: number; message?: string };
    if (e.status === 401 || e.status === 403) return json(req, { error: e.message }, e.status);
    console.error("book-free error:", err);
    return json(req, { error: "Booking failed. Please try again." }, 500);
  }
});
