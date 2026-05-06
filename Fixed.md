# Malhar Ticketing — Complete Fix Guide
## All issues + exact steps to resolve them

---

## BEFORE ANYTHING ELSE — Rotate Compromised Secrets

Your `.env` files are committed to Git history. Even after you fix `.gitignore`,
the old secrets remain in every previous commit and are visible to anyone with
repo access.

**Do this right now, before any code changes:**

1. Go to [dashboard.razorpay.com](https://dashboard.razorpay.com) → Settings → API Keys → Regenerate
2. Go to [supabase.com](https://supabase.com) → Your Project → Settings → API → Service Role Key → Regenerate
3. Generate a new JWT secret: `openssl rand -hex 32`
4. Generate a new OTP HMAC secret: `openssl rand -hex 32`
5. Change `ADMIN_PASSWORD` and `SCANNER_PASSWORD` to strong random values

Add to `.gitignore` (both in `backend/` and `frontend/`):
```
.env
*.env.local
```

---

## Issue 1 — OTP never sent via SMS (Auth completely broken in production)

**Problem:** `server.js` only does `console.log("OTP:", otp)`. Users never
receive an SMS. In Login.jsx, OTP was generated in the browser and stored in
`sessionStorage` — never went to the backend at all.

**Files changed:** `backend/server.js`, `frontend/src/pages/Login.jsx`

**Steps:**
1. Sign up at [msg91.com](https://msg91.com) (or Twilio / Fast2SMS)
2. Create an OTP template — example: `Your Malhar OTP is ##OTP##. Valid for 5 minutes.`
3. Get your `AUTH_KEY` and `TEMPLATE_ID` from MSG91 dashboard
4. Add to `backend/.env`:
   ```
   MSG91_AUTH_KEY=your_key_here
   MSG91_TEMPLATE_ID=your_template_id_here
   OTP_HMAC_SECRET=run_openssl_rand_hex_32
   ```
5. Replace `backend/server.js` with the fixed version provided
6. Replace `frontend/src/pages/Login.jsx` with the fixed version provided
7. Run the SQL in `sql/schema_fixes.sql` → Fix 1 (creates `otp_store` table)

**Result:** OTPs stored as HMAC-SHA256 hash in Supabase, delivered via SMS.

---

## Issue 2 — OTP store in-memory (crashes wipe pending OTPs)

**Problem:** `const otpStore = {}` is process memory. Server restart = all
users mid-login get "No OTP found" error. Can't scale to multiple instances.

**Fixed in:** Same files as Issue 1 above (the fixed server.js uses Supabase)

---

## Issue 3 — Phone identity spoofable via localStorage

**Problem:** `Booking.jsx` reads `localStorage.getItem("userPhone")` and sends
it to the backend. Anyone can open DevTools → Application → localStorage →
change `userPhone` to any number → book under someone else's identity.

**Files changed:** `backend/server.js`, `frontend/src/pages/Login.jsx`,
`frontend/src/pages/Booking.jsx`

**How it's fixed:**
- After OTP verification, backend issues a JWT containing `{ role: "user", phone }`
- Frontend stores this JWT in `localStorage.userToken`
- All booking requests send `Authorization: Bearer <token>` header
- Backend's `requireUserToken` middleware extracts phone from the verified JWT
- Phone is never read from `req.body` for any trusted operation

---

## Issue 4 — Race condition: free ticket oversell

**Problem:** `Booking.jsx` `handleBooking()`:
1. Pre-check `SELECT id FROM tickets WHERE phone=X AND slot_id=Y`
2. Upload photo (200–2000ms gap — race window is wide open)
3. `INSERT INTO tickets` — no lock held
4. `UPDATE slots SET booked_count = booked_count + 1` — separate operation

At 450 concurrent clicks, multiple users pass step 1 simultaneously and all
succeed at step 3. The slot can be overbooked by dozens of tickets.

**Files changed:** `backend/server.js` (new `/book-free` endpoint),
`frontend/src/pages/Booking.jsx`, `sql/schema_fixes.sql` (Fix 7)

**How it's fixed:**
- New `/book-free` backend endpoint calls `book_slot()` DB function via RPC
- `book_slot()` uses `SELECT ... FOR UPDATE` — acquires a row lock on the slot
- Only one transaction can hold the lock; concurrent requests wait, then re-check
- The check + insert + increment happen as one atomic DB operation
- Frontend sends booking to `/book-free` instead of direct Supabase insert

---

## Issue 5 — Race condition: paid ticket oversell

**Problem:** `/verify-payment` in the old `server.js` did:
```js
await adminSupabase.from("tickets").insert([{ ... }]).select().single();
```
No lock. Two users who both completed Razorpay payment for the last ticket
both get valid booking confirmations.

**Files changed:** `backend/server.js`

**How it's fixed:**
- `/verify-payment` now calls `book_slot()` RPC after signature verification
- Same row-lock protection as free tickets
- If slot is full after payment, returns 409 with a clear "contact support" message
  (user should be refunded via Razorpay dashboard in this rare edge case)

---

## Issue 6 — Photo upload inside the booking hot path

**Problem:** Every booking attempt uploaded a photo BEFORE creating the ticket.
At 450 concurrent bookings: 450 simultaneous file uploads (up to 5MB each)
→ Supabase Storage saturated → every booking takes 2–10 seconds → latency
blows past the 150ms target by 10–60x.

**Files changed:** `frontend/src/pages/Booking.jsx`

**How it's fixed:**
- Photo upload is now an explicit separate step with its own "Upload Photo" button
- User selects photo → clicks Upload → photo uploads → gets a green "Photo uploaded" badge
- Only THEN does the "Book" / "Pay" button become active
- The actual booking request is now just a ~20ms DB write
- If slot is sold out, user finds out quickly without having wasted upload bandwidth

---

## Issue 7 — Razorpay key secret in frontend .env

**Problem:** `VITE_RAZORPAY_KEY_SECRET` in `frontend/.env` gets bundled into
the production JavaScript bundle. Anyone can open DevTools → Sources →
search for `rzp_` and read your secret key.

**Files changed:** `frontend/.env.example`

**Fix:** Remove `VITE_RAZORPAY_KEY_SECRET` from frontend env entirely.
The secret is only used server-side in `/create-order` and `/verify-payment`.
The frontend only needs `VITE_RAZORPAY_KEY_ID` (this is safe to expose).

---

## Issue 8 — Secrets committed to Git

**Problem:** `backend/.env` and `frontend/.env` are tracked by Git. The
Supabase service role key (bypasses all RLS), Razorpay secret, JWT secret,
and admin passwords are all in the repo history.

**Fix:**
```bash
# Add to .gitignore (in both backend/ and frontend/ directories)
echo ".env" >> backend/.gitignore
echo ".env" >> frontend/.gitignore

# Remove from Git tracking (keeps the file on disk)
git rm --cached backend/.env
git rm --cached frontend/.env
git commit -m "remove .env files from tracking"
```

Then use your deploy platform's environment variable UI (Railway, Vercel, etc.)
to set env vars — never commit them.

---

## Issue 9 — All tickets readable by anyone with anon key

**Problem:** RLS policy `"Allow read tickets" ... USING (true)` means any
anonymous request with the public anon key (which is committed to the repo)
can run: `SELECT * FROM tickets` and dump every attendee's name, phone,
college, and photo URL.

**Files changed:** `sql/schema_fixes.sql` (Fix 6)

**Fix:** Run the SQL in Fix 6 which drops the permissive read policies and
replaces them with service-role-only access. The backend (which uses the
service role key) can still read everything. The public anon key cannot.

---

## Issue 10 — Token verification was fake

**Problem:** `App.jsx` `verifyToken()` just checked `if (!token) return false; return true;`
Any string — including "dev-token" — passed. Route guards provided no security.

**Files changed:** `frontend/src/App.jsx`

**How it's fixed:**
- `verifyToken()` now calls `POST /verify-token` on the backend
- Backend does `jwt.verify(token, JWT_SECRET)` — expired, tampered, or "dev-token"
  all fail and the user is redirected to login

---

## Issue 11 — No rate limiting on payment endpoints

**Problem:** `/create-order` and `/verify-payment` had no rate limiting.
Anyone could spam order creation (burning Razorpay API quota) or flood
the DB with write attempts.

**Fixed in:** `backend/server.js` — `paymentLimiter` middleware added to both

---

## Issue 12 — Supabase client created per-request in /verify-payment

**Problem:**
```js
// Old code — inside the route handler, called on every request:
const { createClient } = await import("@supabase/supabase-js");
const adminSupabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
```
This is a dynamic import + new client on every single booking. Under load,
this creates a new connection pool entry per request.

**Fixed in:** `backend/server.js` — client created once at module startup:
```js
const adminSupabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
```

---

## Issue 13 — Missing DB indexes, constraints, and type errors

Run `sql/schema_fixes.sql` in Supabase SQL editor. It covers:
- **Fix 2:** Composite index on `tickets(phone, slot_id)` — fast duplicate checks
- **Fix 3:** `CHECK (booked_count >= 0)` constraint
- **Fix 4:** Foreign key constraints (tickets→slots, tickets→events, slots→events)
- **Fix 5:** `checked_in_at` changed from `text DEFAULT 'false'` to `timestamptz DEFAULT NULL`
- **Fix 8:** Remove duplicate `unique_phone_slot` constraint

---

## Issue 14 — Events/slots queries not cached (20k concurrent users)

**Problem:** 20k users on the events page = 20k identical `SELECT * FROM events`
queries hitting Supabase simultaneously. Events don't change during the festival.

**Files changed:** `frontend/src/pages/Events.jsx`

**How it's fixed:**
- `getEvents()` caches result for 10 seconds — 20k users collapse to 1 query/10s
- `getSlots(eventId)` caches per-event for 5 seconds — same benefit at slot selection
- Slot availability shows latest data within 5 seconds — acceptable for UX

---

## Issue 15 — ALLOWED_ORIGINS only has localhost

**Problem:** Your deployed frontend will get CORS errors because
`backend/.env` only has `http://localhost:5173,https://localhost:5000`.

**Fix:** Update `ALLOWED_ORIGINS` in `backend/.env` to include your production URLs:
```
ALLOWED_ORIGINS=http://localhost:5173,https://malhar.yoursite.com
```

---

## Deployment Checklist (do in order)

- [ ] Rotate all secrets (Issue 0 above)
- [ ] Add `.env` to `.gitignore`, run `git rm --cached`
- [ ] Run `sql/schema_fixes.sql` in Supabase SQL editor (all 8 fixes)
- [ ] Replace `backend/server.js` with fixed version
- [ ] Replace `frontend/src/pages/Login.jsx` with fixed version
- [ ] Replace `frontend/src/pages/Booking.jsx` with fixed version
- [ ] Replace `frontend/src/App.jsx` with fixed version
- [ ] Replace `frontend/src/pages/Events.jsx` with fixed version
- [ ] Fill in `backend/.env` with new secrets + MSG91 keys
- [ ] Fill in `frontend/.env` — remove `VITE_RAZORPAY_KEY_SECRET`
- [ ] Update `ALLOWED_ORIGINS` with production frontend URL
- [ ] Upgrade Supabase to Pro plan (connection limits for 20k users)
- [ ] Test OTP flow end to end with a real phone number
- [ ] Test booking flow: free event, paid event, sold-out slot
- [ ] Verify scanner still works (check-in path unchanged)