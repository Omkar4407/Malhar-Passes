import { handleCors, json, requireUserToken } from "../_shared/http.ts";
import adminSupabase from "../_shared/supabase.ts";

const CF_APP_ID = Deno.env.get("CASHFREE_APP_ID")!;
const CF_SECRET = Deno.env.get("CASHFREE_SECRET_KEY")!;
const CF_ENV = Deno.env.get("CASHFREE_ENV") || "production";
const CF_BASE = CF_ENV === "sandbox"
  ? "https://sandbox.cashfree.com/pg"
  : "https://api.cashfree.com/pg";

// Only allow HTTPS URLs from our own Supabase storage bucket
function sanitizePhotoUrl(url: string | undefined | null, supabaseUrl: string): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return null;
    const supabaseHost = new URL(supabaseUrl).hostname;
    if (!parsed.hostname.endsWith(supabaseHost)) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const { phone, email } = await requireUserToken(req);
    const { order_id, name, college, slot_id, event_id, photo_url } = await req.json();

    if (!order_id) return json(req, { error: "order_id is required." }, 400);

    // Verify payment status with Cashfree server-side
    const resp = await fetch(`${CF_BASE}/orders/${order_id}`, {
      headers: {
        "x-api-version": "2023-08-01",
        "x-client-id": CF_APP_ID,
        "x-client-secret": CF_SECRET,
      },
    });

    const order = await resp.json();

    if (!resp.ok || order.order_status !== "PAID") {
      console.error("Cashfree order not paid:", order);
      return json(req, { success: false, error: "Payment not completed." }, 400);
    }

    // Get payment details from Cashfree
    const paymentsResp = await fetch(`${CF_BASE}/orders/${order_id}/payments`, {
      headers: {
        "x-api-version": "2023-08-01",
        "x-client-id": CF_APP_ID,
        "x-client-secret": CF_SECRET,
      },
    });
    const payments = await paymentsResp.json();
    const payment_id = payments?.[0]?.cf_payment_id?.toString() || order_id;

    const trimmedName = name?.trim();
    const trimmedCollege = college?.trim();

    if (!trimmedName || trimmedName.length > 100)
      return json(req, { success: false, error: "Invalid name." }, 400);
    if (!trimmedCollege || trimmedCollege.length > 150)
      return json(req, { success: false, error: "Invalid college name." }, 400);

    const safePhotoUrl = sanitizePhotoUrl(photo_url, Deno.env.get("SUPABASE_URL") || "");

    // Atomically book via book_slot() RPC
    const { data, error } = await adminSupabase.rpc("book_slot", {
      p_slot_id: slot_id,
      p_ticket_data: {
        name: trimmedName,
        college: trimmedCollege,
        phone: phone || email,
        event_id,
        photo_url: safePhotoUrl,
        payment_status: "paid",
        razorpay_order_id: order_id,
        razorpay_payment_id: payment_id,
      },
    });
    if (error) throw error;
    if (!data.success) return json(req, { success: false, error: data.error || "Slot is full." }, 409);

    const { data: ticket } = await adminSupabase
      .from("tickets")
      .select("*")
      .eq("id", data.ticket_id)
      .single();

    return json(req, { success: true, ticket });
  } catch (err: unknown) {
    const e = err as { status?: number; message?: string };
    if (e.status === 401 || e.status === 403) return json(req, { error: e.message }, e.status);
    console.error("verify-payment error:", err);
    return json(req, { error: "Verification failed." }, 500);
  }
});
