import { handleCors, json, requireUserToken, authErrorJson } from "../_shared/http.ts";
import adminSupabase from "../_shared/supabase.ts";
import { validatePhotoUrl } from "../_shared/booking-validation.ts";
import { updateUserCollegeByPhone } from "../_shared/attendee-users.ts";
import { normalizeCollegeDisplayName } from "../_shared/college.ts";

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const { phone } = await requireUserToken(req);
    const { name, college, college_name, slot_id, event_id, photo_url } = await req.json();

    if (!name || !college || !slot_id || !event_id)
      return json(req, { error: "Missing required fields." }, 400);
    if (name.trim().length > 100)
      return json(req, { error: "Name must be 100 characters or fewer." }, 400);
    if (college.trim().length > 450)
      return json(req, { error: "Booking details must be 450 characters or fewer." }, 400);

    const photoError = validatePhotoUrl(photo_url);
    if (photoError) return json(req, { error: photoError }, 400);

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

    const displayCollege = normalizeCollegeDisplayName(college_name);
    if (displayCollege) await updateUserCollegeByPhone(phone, displayCollege);

    const { data: ticket } = await adminSupabase
      .from("tickets")
      .select("*")
      .eq("id", data.ticket_id)
      .single();

    return json(req, { success: true, ticket });
  } catch (err: unknown) {
    const r = authErrorJson(req, err);
    if (r) return r;
    console.error("book-free error:", err);
    return json(req, { error: "Booking failed. Please try again." }, 500);
  }
});
