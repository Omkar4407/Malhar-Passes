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
| Frontend | React 19 (Vite), Tailwind CSS, Axios |
| Backend | Node.js, Express 5 |
| Database | Supabase (PostgreSQL + Storage) |
| Auth | JWT + OTP via MSG91 |
| Payments | Cashfree (frontend) / Razorpay SDK (backend) |
| QR | qrcode + html5-qrcode |
| Deployment | Vercel (frontend) + Render (backend) |

> ⚠️ **Note:** The frontend payment flow uses Cashfree JS SDK (`Booking.jsx`) while the backend `booking.controller.js` still uses Razorpay for order creation and signature verification. These need to be aligned — pick one gateway and update both sides consistently.

---

## 📁 Project Structure

```
Malhar-Passes/
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/       # Header, Menu
│   │   ├── lib/              # supabase.js, cache.js
│   │   ├── pages/            # Login, Dashboard, Events, Slots,
│   │   │                     # Booking, Ticket, Account,
│   │   │                     # Scanner, ScannerLogin,
│   │   │                     # AdminLogin, AdminDashboard, AdminEvents
│   │   ├── styles/
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
├── backend/
│   ├── controllers/
│   │   ├── auth.controller.js
│   │   ├── booking.controller.js
│   │   ├── events.controller.js
│   │   ├── otp.controller.js
│   │   └── scanner.controller.js
│   ├── middleware/
│   │   ├── auth.middleware.js
│   │   └── rateLimiter.js
│   ├── routes/
│   ├── services/
│   │   ├── booking.service.js
│   │   ├── cache.service.js
│   │   ├── jwt.service.js
│   │   ├── otp.service.js
│   │   └── supabase.service.js
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

### Step 3 — Backend

```bash
cd backend
npm install
node server.js
# or for auto-reload:
npm run dev
```

Runs at `http://localhost:5000`

---

## 🔑 Environment Variables

### `frontend/.env`

```env
VITE_BACKEND_URL=http://localhost:5000
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_CASHFREE_ENV=sandbox
```

> Never commit `.env` files. Add `.env` to `.gitignore` in both `frontend/` and `backend/`.

### `backend/.env`

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
    └─→ Dashboard
            ├─→ Events list
            │       └─→ Slot selection
            │               └─→ Booking form (name + college + photo)
            │                       ├─→ Free event  → Book → Ticket + QR
            │                       └─→ Paid event  → Cashfree checkout → Verify → Ticket + QR
            └─→ My Tickets (view QR codes)
```

### Payment Flow (Paid Events)

1. User fills booking form and uploads photo
2. Clicks **Pay ₹X** — Cashfree SDK loads dynamically (not on page load)
3. Frontend calls `POST /create-order` → backend creates Razorpay order, returns `payment_session_id`
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
- Rate limiting on OTP, payment, and auth endpoints via `express-rate-limit`
- Supabase RLS restricts ticket reads to service role only — anon key cannot dump user data
- Payment gateway secret keys are backend-only — never sent to the frontend

---

## 🚀 Deployment

### Frontend → Vercel

1. Connect your GitHub repo to Vercel
2. Set **Root Directory** to `frontend`
3. Add all `VITE_*` environment variables in the Vercel dashboard
4. Deploy — Vercel auto-detects Vite

### Backend → Render

1. Create a new **Web Service** on Render
2. Set **Root Directory** to `backend`, **Start Command** to `node server.js`
3. Add all backend environment variables in the Render dashboard
4. Add `ALLOWED_ORIGINS` with your Vercel frontend URL

### Keep Render Awake (Free Tier)

Render free tier spins down after 15 minutes of inactivity. Use [UptimeRobot](https://uptimerobot.com) to ping `https://your-backend.onrender.com/health` every 5 minutes.

---

## 🐞 Troubleshooting

**OTP not received**
→ Check MSG91 dashboard for delivery logs. Ensure `MSG91_AUTH_KEY` and `MSG91_TEMPLATE_ID` are set correctly in backend `.env`.

**CORS errors in production**
→ Add your Vercel frontend URL to `ALLOWED_ORIGINS` in backend `.env`. Redeploy backend after changing env vars on Render.

**Payment not completing**
→ Confirm `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` in backend `.env` are live keys (not test keys) for production. Frontend `VITE_CASHFREE_ENV` should be `production`.

**Tickets not showing**
→ Check that `SUPABASE_SERVICE_ROLE_KEY` is correct in backend `.env`. The service role key is required to read tickets (anon key is blocked by RLS).

**Scanner not working on mobile**
→ Camera access requires HTTPS. Use your Vercel URL (not `localhost`) when testing on a phone.

**Render cold start delays**
→ Set up UptimeRobot to ping `/health` every 5 minutes to prevent spin-down.

---

## 👨‍💻 Author

**Omkar Bommakanti** — built for Malhar Fest, St. Xavier's College, Mumbai.