# 🎟️ Malhar Ticketing System

A full-stack event ticketing and entry management system built for **Malhar Fest, St. Xavier’s College, Mumbai**.

---

# 🚀 FEATURES

## 👤 User Side

* OTP-based login
* Book tickets (free & paid)
* Razorpay payment integration
* QR-based ticket generation
* View all booked tickets

## 🛡️ Admin Side

* QR Scanner for entry validation
* Prevent duplicate entries
* Real-time check-in tracking

## 👑 Super Admin

* Add/Edit/Delete Events
* Manage Slots
* Set pricing (₹ or Free)
* Control admin access

---

# 🏗️ TECH STACK

* **Frontend:** React (Vite), Axios
* **Backend:** Node.js, Express
* **Database:** Supabase (PostgreSQL + Storage)
* **Payments:** Razorpay
* **QR:** qrcode + html5-qrcode

---

# 📁 PROJECT STRUCTURE

malhar-ticketing/
├── frontend/
├── backend/
└── README.md

---

# ⚙️ COMPLETE SETUP GUIDE

---

## 🔹 STEP 1 — CLONE REPOSITORY

```bash
git clone https://github.com/your-username/malhar-ticketing-system.git
cd malhar-ticketing-system
```

---

## 🔹 STEP 2 — FRONTEND SETUP

```bash
cd frontend
npm install
npm run dev
```

👉 Runs at:

```
http://localhost:5173
```

---

## 🔹 STEP 3 — BACKEND SETUP

```bash
cd backend
npm install
node server.js
```

👉 Runs at:

```
http://localhost:5000
```

---

## 🔹 STEP 4 — ENVIRONMENT VARIABLES

### 📁 frontend/.env

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_RAZORPAY_KEY_ID=rzp_test_xxxxx
```

---

### 📁 backend/.env

```env
PORT=5000

FAST2SMS_API_KEY=your_key

RAZORPAY_KEY_ID=rzp_test_xxxxx
RAZORPAY_KEY_SECRET=your_secret
```

---


# 🔄 COMPLETE PROJECT FLOW

---

## 👤 USER FLOW

### 1. Login

* Enter phone number
* OTP generated (backend console)
* User verified

---

### 2. Event Selection

* Fetch events from database
* Shows:

  * Free events
  * Paid events (₹)

---

### 3. Slot Selection

* If multiple slots → choose slot
* If single slot → direct booking

---

### 4. Booking

#### 🟢 Free Event

→ Direct ticket creation

#### 💰 Paid Event

1. Create order (backend)
2. Razorpay popup opens
3. User completes payment
4. Backend verifies signature
5. Ticket created ONLY if verified

---

### 5. Ticket Generation

* Ticket stored in database
* QR code generated:

```json
{ "ticket_id": "uuid" }
```

---

### 6. My Tickets Page

* Fetch all tickets using phone number
* Display ticket cards + QR

---

## 🛡️ ADMIN FLOW

### 1. Admin Login

* Email-based access (Supabase admins table)

---

### 2. Scanner

* Scan QR code
* Validate ticket from DB

---

### 3. Entry Logic

| Condition    | Result            |
| ------------ | ----------------- |
| Valid & new  | ✅ Entry Allowed   |
| Already used | ⚠ Already Entered |
| Invalid QR   | ❌ Rejected        |

---

## 👑 SUPER ADMIN FLOW

* Add Events
* Add Slots
* Set pricing (₹ / Free)
* Manage system dynamically

---

# 💳 PAYMENT FLOW (SECURE)

1. Frontend → `/create-order`
2. Razorpay popup opens
3. Payment completed
4. Razorpay returns:

   * order_id
   * payment_id
   * signature
5. Backend verifies using HMAC
6. Ticket created ONLY if verified

---

# 🔐 SECURITY FEATURES

* OTP authentication
* Payment signature verification
* Admin access control
* Duplicate ticket prevention
* QR validation system

---

# 🧪 TESTING

## Test Payment Card

```
Card: 4111 1111 1111 1111
Expiry: Any future date
CVV: 123
OTP: 1234
```

---

# 🐞 COMMON ISSUES & FIXES

### OTP not working

→ Check backend console for OTP

---

### Payment failing

→ Verify Razorpay keys

---

### Tickets not showing

→ Check phone number in localStorage

---

### Scanner not working on mobile

→ Use HTTPS (ngrok/localtunnel)

---

# 🚀 DEPLOYMENT (NEXT STEP)

* Frontend → Vercel
* Backend → Render
* Supabase → already hosted

---

# 👨‍💻 AUTHOR

Omkar Bommakanti

---

# ⭐ FINAL NOTE

This project is a **production-level ticketing system prototype**
and can be scaled into a real event platform with minimal changes.
