# Supabase Edge Functions Migration Guide

## Structure Created

```
supabase/functions/
├── _shared/                  ← shared modules (not deployed as functions)
│   ├── supabase.ts           ← adminSupabase client
│   ├── jwt.ts                ← signToken / verifyTokenPayload
│   ├── http.ts               ← CORS, json(), requireUserToken/AdminToken/ScannerToken
│   └── otp.ts                ← hashOtp, sendSmsOtp, storeOtp, fetchOtpRecord, etc.
│
├── send-otp/index.ts         ← POST /send-otp
├── verify-otp/index.ts       ← POST /verify-otp
├── admin-login/index.ts      ← POST /admin-login
├── scanner-login/index.ts    ← POST /scanner-login
├── verify-token/index.ts     ← POST /verify-token
├── create-order/index.ts     ← POST /create-order
├── verify-payment/index.ts   ← POST /verify-payment
├── book-free/index.ts        ← POST /book-free
├── my-tickets/index.ts       ← GET  /my-tickets
├── get-events/index.ts       ← GET  /events
├── get-slots/index.ts        ← GET  /events/:id/slots → ?event_id=
├── admin-events/index.ts     ← GET/POST/PATCH/DELETE /admin/events
├── admin-slots/index.ts      ← GET/POST/PATCH/DELETE /admin/slots
├── scanner-ticket/index.ts   ← GET  /scanner/ticket/:id → ?id=
├── scanner-checkin/index.ts  ← POST /scanner/checkin + /scanner/reject (action param)
└── toggle-release-slot/index.ts ← POST /admin/toggle-release-slot
```

---

## Old Express URL → New Edge Function URL

| Old (Render)                           | New (Supabase)                                              | Change needed |
|----------------------------------------|-------------------------------------------------------------|---------------|
| POST `/send-otp`                       | `.../functions/v1/send-otp`                                 | base URL only |
| POST `/verify-otp`                     | `.../functions/v1/verify-otp`                               | base URL only |
| POST `/admin-login`                    | `.../functions/v1/admin-login`                              | base URL only |
| POST `/scanner-login`                  | `.../functions/v1/scanner-login`                            | base URL only |
| POST `/verify-token`                   | `.../functions/v1/verify-token`                             | base URL only |
| GET  `/my-tickets`                     | `.../functions/v1/my-tickets`                               | base URL only |
| POST `/create-order`                   | `.../functions/v1/create-order`                             | base URL only |
| POST `/verify-payment`                 | `.../functions/v1/verify-payment`                           | base URL only |
| POST `/book-free`                      | `.../functions/v1/book-free`                                | base URL only |
| GET  `/events`                         | `.../functions/v1/get-events`                               | base URL only |
| GET  `/events/:id/slots`              | `.../functions/v1/get-slots?event_id=<id>`                  | URL shape     |
| GET  `/admin/events`                   | `.../functions/v1/admin-events` (GET)                       | base URL only |
| POST `/admin/events`                   | `.../functions/v1/admin-events` (POST)                      | base URL only |
| PATCH `/admin/events/:id`              | `.../functions/v1/admin-events` (PATCH, event_id in body)   | URL shape     |
| DELETE `/admin/events/:id`             | `.../functions/v1/admin-events` (DELETE, event_id in body)  | URL shape     |
| GET `/admin/slots`                     | `.../functions/v1/admin-slots` (GET)                        | base URL only |
| POST `/admin/slots`                    | `.../functions/v1/admin-slots` (POST)                       | base URL only |
| PATCH `/admin/slots/:id`               | `.../functions/v1/admin-slots` (PATCH, slot_id in body)     | URL shape     |
| DELETE `/admin/slots/:id`              | `.../functions/v1/admin-slots` (DELETE, slot_id in body)    | URL shape     |
| GET `/scanner/ticket/:id`             | `.../functions/v1/scanner-ticket?id=<id>`                   | URL shape     |
| POST `/scanner/checkin/:id`           | `.../functions/v1/scanner-checkin` `{ action:"checkin", ticket_id }` | URL shape |
| POST `/scanner/reject/:id`            | `.../functions/v1/scanner-checkin` `{ action:"reject", ticket_id }`  | URL shape |
| POST `/admin/toggle-release-slot`     | `.../functions/v1/toggle-release-slot`                      | base URL only |

---

## Step-by-Step Deployment

### 1. Install Supabase CLI
```bash
npm install -g supabase
supabase login
supabase link --project-ref <your-project-ref>
```

### 2. Copy this supabase/ folder into your project root
```
malhar-ticketing/
├── frontend/
├── backend/         ← keep for now, delete after testing
└── supabase/        ← new
    └── functions/
```

### 3. Set secrets on Supabase (replaces backend .env)
```bash
supabase secrets set RAZORPAY_KEY_ID=rzp_test_xxx
supabase secrets set RAZORPAY_KEY_SECRET=your_secret
supabase secrets set ADMIN_PASSWORD=your_admin_password
supabase secrets set SCANNER_PASSWORD=your_scanner_password
supabase secrets set JWT_SECRET=your_jwt_secret
supabase secrets set OTP_HMAC_SECRET=your_otp_hmac_secret
supabase secrets set FAST2SMS_API_KEY=your_fast2sms_key
supabase secrets set ALLOWED_ORIGINS=https://your-frontend.vercel.app
supabase secrets set DEV_MODE=false
```
SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected automatically — no need to set.

### 4. Deploy all functions
```bash
supabase functions deploy --no-verify-jwt
```

### 5. Update frontend — change VITE_BACKEND_URL
```
# frontend/.env
VITE_BACKEND_URL=https://<project-ref>.supabase.co/functions/v1
```
All your axios/fetch calls like `axios.post(\`${BACKEND_URL}/send-otp\`, ...)` work as-is.
Only the URL-shape changes (listed in the table above) need frontend code edits.

### 6. Test every route, then delete the backend/ folder

---

## What Was NOT Migrated (and why)

### Rate Limiting (express-rate-limit)
Edge Functions are stateless — there's no shared in-process Map across invocations.
Options:
- **Supabase DB rate limiting**: create a `rate_limit` table with phone+count+window,
  checked inside send-otp / verify-otp (simplest).
- **Upstash Redis**: free tier, works great with Deno. 1 extra secret needed.
- **Leave it**: for a college fest with a known audience, DB-level OTP expiry + 
  the `attempts` column already limits abuse effectively.

### In-process Cache (cache.service.js)
The Map cache doesn't survive across Edge Function invocations (they're ephemeral).
The book_slot() RPC is already atomic so this is safe to drop — just slightly more
DB reads during a booking rush. For a fest-scale load this is fine.
If you want caching, Upstash Redis works perfectly with Deno.

---

## Rate Limiting (simple DB approach if you want it)

Add to `otp_store` table: it already limits to 5 attempts per OTP request.
For IP-based payment rate limiting, you can add this to create-order/verify-payment:

```typescript
// Quick DB-based rate limit check (add to create-order if needed)
const ip = req.headers.get("x-forwarded-for") || "unknown";
const window = new Date(Date.now() - 60_000).toISOString();
const { count } = await adminSupabase
  .from("rate_log")
  .select("id", { count: "exact" })
  .eq("ip", ip)
  .gt("created_at", window);
if ((count ?? 0) >= 5) return json(req, { error: "Too many requests." }, 429);
await adminSupabase.from("rate_log").insert({ ip });
```
