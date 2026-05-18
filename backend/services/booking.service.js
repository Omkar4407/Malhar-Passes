import Razorpay from "razorpay";
import crypto from "crypto";
import adminSupabase from "./supabase.service.js";
import { cacheGet, bust, TTL } from "./cache.service.js";

export const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ── Verify Razorpay webhook signature ─────────────────────────────────────────
export function verifyRazorpaySignature({ razorpay_order_id, razorpay_payment_id, razorpay_signature }) {
  const body = `${razorpay_order_id}|${razorpay_payment_id}`;
  const expected = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest("hex");
  return expected === razorpay_signature;
}

// ── Check slot availability (cached 5s) ───────────────────────────────────────
// Two conditions must both be true for a slot to accept bookings:
//   1. is_released = true  (admin has opened the slot)
//   2. booked_count < capacity  (seats still available)
// This pre-check is informational — the real atomic guard lives inside the
// book_slot() RPC. Caching 5s cuts DB reads during a booking rush.
export async function checkSlotAvailable(slot_id) {
  const slot = await cacheGet(
    `slot:${slot_id}`,
    TTL.SLOT_AVAILABILITY,
    async () => {
      const { data } = await adminSupabase
        .from("slots")
        .select("capacity, booked_count, is_released")
        .eq("id", slot_id)
        .single();
      return data;
    }
  );
  if (!slot) return false;
  if (!slot.is_released) return false;       // slot not released by admin
  return slot.booked_count < slot.capacity;  // still has seats
}

// ── Create Razorpay order with idempotency receipt ────────────────────────────
export async function createRazorpayOrder({ userPhone, amount, slot_id, event_id }) {
  const receipt = crypto
    .createHash("sha256")
    .update(`${userPhone}:${slot_id}:${event_id}`)
    .digest("hex")
    .slice(0, 40);

  return razorpay.orders.create({ amount: amount * 100, currency: "INR", receipt });
}

// ── Atomically create ticket via book_slot() stored function ──────────────────
// After a successful booking, bust the slot cache so the next
// availability check reflects the new booked_count immediately.
export async function bookSlot(slot_id, ticketData) {
  const { data, error } = await adminSupabase.rpc("book_slot", {
    p_slot_id: slot_id,
    p_ticket_data: ticketData,
  });
  if (error) throw error;
  // Always bust slot cache after any booking attempt (success or full)
  bust(`slot:${slot_id}`);
  return data; // { success, ticket_id } or { success: false, error }
}

// ── Fetch full ticket by ID (cached 10s) ──────────────────────────────────────
// Called immediately after booking — caching means rapid re-fetches
// (e.g. user navigates back and forward) don't hit the DB again.
export async function fetchTicketById(ticketId) {
  return cacheGet(
    `ticket:${ticketId}`,
    TTL.TICKET,
    async () => {
      const { data } = await adminSupabase
        .from("tickets")
        .select("*")
        .eq("id", ticketId)
        .single();
      return data;
    }
  );
}

// ── Upsert user record after successful login ─────────────────────────────────
export async function upsertUser(phone) {
  await adminSupabase
    .from("users")
    .upsert([{ phone_number: phone }], { onConflict: "phone_number", ignoreDuplicates: true });
}

/** Create/update attendee row from Google (phone added later via OTP). */
export async function upsertGoogleUser({ google_sub, email, full_name }) {
  const { error } = await adminSupabase.from("users").upsert(
    [
      {
        google_sub,
        email: email ?? null,
        full_name: full_name ?? null,
      },
    ],
    { onConflict: "google_sub" }
  );
  if (error) throw error;
}

/**
 * Link phone after OTP when merging Google-only vs phone-only accounts.
 * If Bearer JWT carries google_sub (no phone yet), merges into one row.
 */
export async function linkPhoneAfterOtp(phone, googleSubFromToken) {
  if (!googleSubFromToken) {
    await upsertUser(phone);
    return;
  }

  const { data: byGoogle, error: eg } = await adminSupabase
    .from("users")
    .select("id")
    .eq("google_sub", googleSubFromToken)
    .maybeSingle();
  if (eg) throw eg;

  const { data: byPhone, error: ep } = await adminSupabase
    .from("users")
    .select("id")
    .eq("phone_number", phone)
    .maybeSingle();
  if (ep) throw ep;

  if (byGoogle && byPhone) {
    if (byGoogle.id === byPhone.id) return;
    // Drop Google-only row first so google_sub is free for the phone row.
    await adminSupabase.from("users").delete().eq("id", byGoogle.id);
    const { error: uErr } = await adminSupabase
      .from("users")
      .update({ google_sub: googleSubFromToken })
      .eq("id", byPhone.id);
    if (uErr) throw uErr;
    return;
  }

  if (byGoogle && !byPhone) {
    const { error } = await adminSupabase
      .from("users")
      .update({ phone_number: phone })
      .eq("google_sub", googleSubFromToken);
    if (error) throw error;
    return;
  }

  await upsertUser(phone);
  const { error: linkErr } = await adminSupabase
    .from("users")
    .update({ google_sub: googleSubFromToken })
    .eq("phone_number", phone);
  if (linkErr) throw linkErr;
}

/** Load profile row for attendee JWT (phone and/or google_sub). */
export async function fetchUserProfileForAttendee({ phone, google_sub }) {
  if (phone) {
    const { data, error } = await adminSupabase
      .from("users")
      .select("*")
      .eq("phone_number", phone)
      .maybeSingle();
    if (error) throw error;
    return data;
  }
  if (google_sub) {
    const { data, error } = await adminSupabase
      .from("users")
      .select("*")
      .eq("google_sub", google_sub)
      .maybeSingle();
    if (error) throw error;
    return data;
  }
  return null;
}

// ── Fetch all tickets for a user (by phone from JWT) ─────────────────────────
// Uses service-role key — bypasses RLS entirely so anon-key policies
// on the tickets table never block this read.
export async function fetchTicketsByPhone(phone) {
  const { data, error } = await adminSupabase
    .from("tickets")
    .select(`
      id,
      name,
      college,
      phone,
      photo_url,
      checked_in,
      checked_in_at,
      rejected,
      payment_status,
      slot_id,
      event_id,
      slots!tickets_slot_id_fkey (
        id, name, date, time,
        events!slots_event_id_fkey ( id, name )
      )
    `)
    .eq("phone", phone)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}