import { handleCors, json, requireUserToken } from "../_shared/http.ts";
import adminSupabase from "../_shared/supabase.ts";

// Only allow HTTPS URLs from the project's own Supabase storage bucket,
// or null/empty.  This prevents SSRF and content-injection via photo_url.
function sanitizePhotoUrl(url: string | undefined | null, supabaseUrl: string): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return null;
    // Must come from our own Supabase storage
    const supabaseHost = new URL(supabaseUrl).hostname;
    if (!parsed.hostname.endsWith(supabaseHost)) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

declare const Deno: {
  serve: (handler: (req: Request) => Promise<Response>) => void;
  env: { get: (key: string) => string | undefined; };
};
Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const { phone, email } = await requireUserToken(req);
    const { name, college, slot_id, event_id, photo_url } = await req.json();

    if (!name || !college || !slot_id || !event_id)
      return json(req, { error: "Missing required fields." }, 400);
    if (name.trim().length > 100)
      return json(req, { error: "Name must be 100 characters or fewer." }, 400);
    if (college.trim().length > 150)
      return json(req, { error: "College name must be 150 characters or fewer." }, 400);

    const safePhotoUrl = sanitizePhotoUrl(photo_url, Deno.env.get("SUPABASE_URL") || "");

    const { data, error } = await adminSupabase.rpc("book_slot", {
      p_slot_id: slot_id,
      p_ticket_data: {
        name: name.trim(),
        college: college.trim(),
        phone: phone || email, // use whichever identifier is available
        event_id,
        photo_url: safePhotoUrl,
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
