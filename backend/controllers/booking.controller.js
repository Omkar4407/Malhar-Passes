import {
  checkSlotAvailable,
  createRazorpayOrder,
  verifyRazorpaySignature,
  bookSlot,
  fetchTicketById,
  fetchTicketsByPhone,
} from "../services/booking.service.js";

// ── GET /my-tickets ───────────────────────────────────────────────────────────
// Returns all tickets for the authenticated user. Phone comes from the JWT
// (set by requireUserToken middleware) — never trusted from the request body.
// Uses service-role key on the backend so Supabase RLS on the tickets table
// never blocks the read, regardless of how policies are configured.
export async function getMyTickets(req, res) {
  try {
    const tickets = await fetchTicketsByPhone(req.userPhone);
    return res.json({ tickets });
  } catch (err) {
    console.error("get-my-tickets error:", err);
    return res.status(500).json({ error: "Failed to fetch tickets." });
  }
}

// ── POST /create-order ────────────────────────────────────────────────────────
export async function createOrder(req, res) {
  try {
    const { amount, slot_id, event_id } = req.body;

    if (!amount || !slot_id || !event_id) {
      return res.status(400).json({ error: "amount, slot_id, and event_id are required." });
    }

    const isAvailable = await checkSlotAvailable(slot_id);
    if (!isAvailable) {
      return res.status(409).json({ error: "This slot is sold out." });
    }

    const order = await createRazorpayOrder({
      userPhone: req.userPhone,
      amount,
      slot_id,
      event_id,
    });

    return res.json(order);
  } catch (err) {
    console.error("create-order error:", err);
    return res.status(500).json({ error: "Could not create order. Please try again." });
  }
}

// ── POST /verify-payment ──────────────────────────────────────────────────────
export async function verifyPayment(req, res) {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      name,
      college,
      slot_id,
      event_id,
      photo_url,
    } = req.body;

    if (!verifyRazorpaySignature({ razorpay_order_id, razorpay_payment_id, razorpay_signature })) {
      return res.status(400).json({ success: false, error: "Payment signature mismatch." });
    }

    const trimmedName = name?.trim();
    const trimmedCollege = college?.trim();

    if (!trimmedName || trimmedName.length > 100) {
      return res.status(400).json({ success: false, error: "Invalid name." });
    }
    if (!trimmedCollege || trimmedCollege.length > 150) {
      return res.status(400).json({ success: false, error: "Invalid college name." });
    }

    const result = await bookSlot(slot_id, {
      name: trimmedName,
      college: trimmedCollege,
      phone: req.userPhone, // always from JWT
      event_id,
      photo_url,
      payment_status: "paid",
      razorpay_order_id,
      razorpay_payment_id,
    });

    if (!result.success) {
      return res.status(409).json({ success: false, error: result.error || "Slot is full." });
    }

    const ticket = await fetchTicketById(result.ticket_id);
    return res.json({ success: true, ticket });
  } catch (err) {
    console.error("verify-payment error:", err);
    return res.status(500).json({ error: "Verification failed." });
  }
}

// ── POST /book-free ───────────────────────────────────────────────────────────
export async function bookFree(req, res) {
  try {
    const { name, college, slot_id, event_id, photo_url } = req.body;

    if (!name || !college || !slot_id || !event_id) {
      return res.status(400).json({ error: "Missing required fields." });
    }
    if (name.trim().length > 100) {
      return res.status(400).json({ error: "Name must be 100 characters or fewer." });
    }
    if (college.trim().length > 150) {
      return res.status(400).json({ error: "College name must be 150 characters or fewer." });
    }

    const result = await bookSlot(slot_id, {
      name: name.trim(),
      college: college.trim(),
      phone: req.userPhone, // always from JWT
      event_id,
      photo_url,
      payment_status: "free",
      razorpay_order_id: null,
      razorpay_payment_id: null,
    });

    if (!result.success) {
      return res.status(409).json({ error: result.error || "Slot is full." });
    }

    const ticket = await fetchTicketById(result.ticket_id);
    return res.json({ success: true, ticket });
  } catch (err) {
    console.error("book-free error:", err);
    return res.status(500).json({ error: "Booking failed. Please try again." });
  }
}