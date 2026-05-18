import { handleCors, json, requireUserToken, authErrorJson } from "../_shared/http.ts";
import adminSupabase from "../_shared/supabase.ts";

const CF_APP_ID = Deno.env.get("CASHFREE_APP_ID")!;
const CF_SECRET = Deno.env.get("CASHFREE_SECRET_KEY")!;
const CF_ENV = Deno.env.get("CASHFREE_ENV") || "production"; // "sandbox" or "production"
const CF_BASE = CF_ENV === "sandbox"
  ? "https://sandbox.cashfree.com/pg"
  : "https://api.cashfree.com/pg";

async function checkSlotAvailable(slot_id: string): Promise<boolean> {
  const { data } = await adminSupabase
    .from("slots")
    .select("capacity, booked_count, is_released")
    .eq("id", slot_id)
    .single();
  if (!data) return false;
  if (!data.is_released) return false;
  return data.booked_count < data.capacity;
}

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const { phone } = await requireUserToken(req);
    const { amount, slot_id, event_id } = await req.json();

    if (!amount || !slot_id || !event_id) {
      return json(req, { error: "amount, slot_id, and event_id are required." }, 400);
    }

    const isAvailable = await checkSlotAvailable(slot_id);
    if (!isAvailable) {
      return json(req, { error: "This slot is sold out." }, 409);
    }

    // Build unique order_id
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(`${phone}:${slot_id}:${event_id}:${Date.now()}`));
    const order_id = "malhar_" + Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 20);

    const resp = await fetch(`${CF_BASE}/orders`, {
      method: "POST",
      headers: {
        "x-api-version": "2023-08-01",
        "x-client-id": CF_APP_ID,
        "x-client-secret": CF_SECRET,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        order_id,
        order_amount: amount,
        order_currency: "INR",
        customer_details: {
          customer_id: phone,
          customer_phone: phone,
        },
      }),
    });

    const order = await resp.json();
    if (!resp.ok) {
      console.error("Cashfree create order error:", order);
      return json(req, { error: "Could not create order. Please try again." }, 500);
    }

    // Return order_id + payment_session_id (needed by Cashfree JS SDK)
    return json(req, {
      order_id: order.order_id,
      payment_session_id: order.payment_session_id,
    });
  } catch (err: unknown) {
    const r = authErrorJson(req, err);
    if (r) return r;
    console.error("create-order error:", err);
    return json(req, { error: "Could not create order. Please try again." }, 500);
  }
});
