# 🎟️ Malhar Ticketing System

A full-stack event ticketing and entry management system built for **Malhar Fest, St. Xavier's College, Mumbai**.

---

## 🚀 Features

### 👤 User
- OTP-based login (SMS via MSG91)
- Browse free and paid events
- Slot selection with live availability
- Photo upload before booking
- Cashfree payment integration for paid events
- QR-based ticket generation
- View all booked tickets

### 🛡️ Admin
- QR scanner for entry validation
- Duplicate entry prevention
- Real-time check-in tracking

### 👑 Super Admin
- Add / Edit / Delete events
- Manage slots and capacity
- Set pricing (₹ or Free)
- Release slots on demand
- Control admin access

---

## 🏗️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 (Vite), Tailwind CSS, Framer Motion, MagicUI, Acertinity UI |
| Backend | Supabase Edge Functions (Deno/TypeScript) *or* Node.js + Express 5 |
| Database | Supabase (PostgreSQL + Storage) |
| Auth | JWT + OTP via MSG91 / Fast2SMS |
| Payments | Cashfree (frontend) / Razorpay SDK (backend/edge functions) |
| QR | qrcode + html5-qrcode |
| Deployment | Vercel (frontend) + Supabase Edge Functions (or Render for Express) |

> ⚠️ **Note:** The frontend payment flow uses Cashfree JS SDK (`Booking.jsx`) while the backend `booking.controller.js` (and the corresponding `verify-payment` Edge Function) still uses Razorpay for order creation and signature verification. These need to be aligned — pick one gateway and update both sides consistently.

---

## 📁 Project Structure

```
Malhar-Passes/
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/       # Header, Acertinity (Meteors), MagicUI (Particles)
│   │   ├── lib/              # supabase.js, cache.js, utils.js
│   │   ├── pages/            # Events, Slots, Booking, Ticket, Account,
│   │   │                     # Scanner, ScannerLogin, AdminLogin, AdminDashboard, AdminEvents
│   │   ├── styles/
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
├── supabase/                 # Serverless Edge Functions backend
│   ├── functions/
│   │   ├── _shared/          # CORS, JWT, Supabase client, OTP services
│   │   ├── send-otp/         # OTP dispatch
│   │   ├── verify-otp/       # OTP verification
│   │   ├── create-order/     # Razorpay order generation
│   │   ├── verify-payment/   # Razorpay signature & DB book slot
│   │   ├── book-free/        # Atomic slot reservation
│   │   ├── ...               # Other endpoints mapped to Edge Functions
│   │   └── verify-token/     # JWT verification
│   └── MIGRATION.md          # Migration and mapping reference
├── backend/                  # Legacy Express backend
│   ├── controllers/
│   ├── middleware/
│   ├── routes/
│   ├── services/
│   └── server.js
└── README.md
```

---

## ⚙️ Setup Guide

### Step 1 — Clone

```bash
git clone https://github.com/Omkar4407/Malhar-Passes.git
cd Malhar-Passes
```

### Step 2 — Frontend

```bash
cd frontend
npm install
npm run dev
```

Runs at `http://localhost:5173`

### Step 3 — Backend (Choose One Option)

#### Option A: Supabase Edge Functions (Recommended / Modern)
1. Install Supabase CLI:
   ```bash
   npm install -g supabase
   ```
2. Start the local Supabase Edge Functions server:
   ```bash
   supabase start
   supabase functions serve --no-verify-jwt
   ```
   *Note: In local development, the local functions serve at `http://localhost:54321/functions/v1/`.*

#### Option B: Node.js / Express Backend (Legacy)
1. Install dependencies:
   ```bash
   cd backend
   npm install
   ```
2. Start the server:
   ```bash
   npm run dev
   ```
   Runs at `http://localhost:5000`

---

## 🔑 Environment Variables

### `frontend/.env`

```env
# Point to either local/production Express server or Supabase Edge Functions base URL
# Local Express: http://localhost:5000
# Local Edge Functions: http://localhost:54321/functions/v1
VITE_BACKEND_URL=http://localhost:54321/functions/v1

VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_CASHFREE_ENV=sandbox
```

> Never commit `.env` files. Add `.env` to `.gitignore` in both `frontend/` and `backend/`.

### `backend/.env` (Only needed for Legacy Express backend)

```env
PORT=5000

# CORS — comma-separated list of allowed frontend origins
ALLOWED_ORIGINS=http://localhost:5173,https://your-production-url.vercel.app

# Supabase
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# JWT
JWT_SECRET=run_openssl_rand_hex_32

# OTP
MSG91_AUTH_KEY=your_msg91_auth_key
MSG91_TEMPLATE_ID=your_msg91_template_id
OTP_HMAC_SECRET=run_openssl_rand_hex_32

# Payments (Razorpay — backend only)
RAZORPAY_KEY_ID=rzp_live_xxxxx
RAZORPAY_KEY_SECRET=your_razorpay_secret

# Admin & Scanner
ADMIN_PASSWORD=strong_random_password
SCANNER_PASSWORD=strong_random_password
```

---

## 🔄 User Flow

```
Login (OTP)
    └─→ Events Page (Main Landing)
            ├─→ Slot selection
            │       └─→ Booking form (name + college + photo)
            │               ├─→ Free event  → Book → Ticket + QR
            │               └─→ Paid event  → Cashfree checkout → Verify → Ticket + QR
            └─→ My Account (view booked QR codes)
```

### Payment Flow (Paid Events)

1. User fills booking form and uploads photo
2. Clicks **Pay ₹X** — Cashfree SDK loads dynamically (not on page load)
3. Frontend calls `POST /create-order` → backend/Edge Function creates Razorpay order, returns order details
4. Cashfree modal opens, user completes payment
5. Frontend calls `POST /verify-payment` with order details
6. Backend verifies signature via HMAC, then atomically books the slot using `book_slot()` DB RPC
7. Ticket created only if verification passes

---

## 🛡️ Admin Flow

| Route | Access | Purpose |
|---|---|---|
| `/admin-login` | Admin password | Login |
| `/admin` | Admin JWT | Dashboard |
| `/admin-events` | Admin JWT | Manage events & slots |
| `/scanner-login` | Scanner password | Login |
| `/scanner` | Scanner JWT | Scan QR + check-in |

### Entry Logic

| Condition | Result |
|---|---|
| Valid ticket, not yet scanned | ✅ Entry allowed |
| Already scanned | ⚠️ Already entered |
| Invalid / unknown QR | ❌ Rejected |

---

## 🔐 Security

- OTPs stored as HMAC-SHA256 hashes in Supabase — never in plain text or server memory
- JWTs signed with `JWT_SECRET` — verified on every protected request
- Phone number always extracted from JWT, never trusted from request body
- Slot booking uses `SELECT FOR UPDATE` row lock — prevents overselling under concurrent load
- Rate limiting on OTP, payment, and auth endpoints via `express-rate-limit` (Express backend only) or DB logs
- Supabase RLS restricts ticket reads to service role only — anon key cannot dump user data
- Payment gateway secret keys are backend-only — never sent to the frontend

---

## 🚀 Deployment

### Frontend → Vercel

1. Connect your GitHub repo to Vercel
2. Set **Root Directory** to `frontend`
3. Add all `VITE_*` environment variables in the Vercel dashboard
4. Deploy — Vercel auto-detects Vite

### Backend Option A → Supabase Edge Functions (Recommended)

1. Set your environment secrets on Supabase:
   ```bash
   supabase secrets set RAZORPAY_KEY_ID=rzp_live_xxxxx
   supabase secrets set RAZORPAY_KEY_SECRET=your_secret
   supabase secrets set ADMIN_PASSWORD=your_admin_password
   supabase secrets set SCANNER_PASSWORD=your_scanner_password
   supabase secrets set JWT_SECRET=your_jwt_secret
   supabase secrets set OTP_HMAC_SECRET=your_otp_hmac_secret
   supabase secrets set MSG91_AUTH_KEY=your_msg91_auth_key
   supabase secrets set MSG91_TEMPLATE_ID=your_template_id
   supabase secrets set ALLOWED_ORIGINS=https://your-frontend.vercel.app
   ```
2. Deploy the functions:
   ```bash
   supabase functions deploy --no-verify-jwt
   ```

### Backend Option B → Render (Express)

1. Create a new **Web Service** on Render
2. Set **Root Directory** to `backend`, **Start Command** to `node server.js`
3. Add all backend environment variables in the Render dashboard
4. Add `ALLOWED_ORIGINS` with your Vercel frontend URL
5. (Optional) Keep Render Awake (Free Tier): Use [UptimeRobot](https://uptimerobot.com) to ping `https://your-backend.onrender.com/health` every 5 minutes.

---

## 🐞 Troubleshooting

**OTP not received**
→ Check MSG91 dashboard for delivery logs. Ensure `MSG91_AUTH_KEY` and `MSG91_TEMPLATE_ID` are set correctly in the backend `.env` or Supabase secrets.

**CORS errors in production**
→ Add your Vercel frontend URL to `ALLOWED_ORIGINS` in the backend `.env` or Supabase secrets.

**Payment not completing**
→ Confirm `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` are live keys (not test keys) for production. Frontend `VITE_CASHFREE_ENV` should be `production`.

**Tickets not showing**
→ Check that `SUPABASE_SERVICE_ROLE_KEY` is correct. The service role key is required to read tickets (anon key is blocked by RLS).

**Scanner not working on mobile**
→ Camera access requires HTTPS. Use your Vercel URL (not `localhost`) when testing on a phone.

---

## 👨‍💻 Author

**Omkar Bommakanti** — built for Malhar Fest, St. Xavier's College, Mumbai.