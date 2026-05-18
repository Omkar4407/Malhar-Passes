# Malhar Passes — pytest stress & API tests

## Setup (one time)

```bash
pip install -r tests/requirements.txt
copy tests\.env.example tests\.env
```

Edit `tests/.env` (or set env vars). Minimum for local Node backend:

- `MALHAR_API_URL=http://localhost:5000`
- `MALHAR_API_STYLE=express`
- `JWT_SECRET` — same as `backend/.env`
- `TEST_SLOT_ID` / `TEST_EVENT_ID` — UUIDs from Supabase (use a **test** slot)

Start the backend:

```bash
cd backend && node server.js
```

## Run tests

```bash
# All integration tests
pytest tests/ -v

# Stress / load only
pytest tests/ -v -m stress

# Health check only
pytest tests/test_malhar.py::TestHealthCheck -v
```

## Get a real user token (optional)

1. Sign in on the site with Google + phone OTP.
2. DevTools → Application → Local Storage → `userToken`.
3. Paste into `TEST_USER_TOKEN`.

Or mint tokens locally if `JWT_SECRET` is set (concurrency tests do this automatically).

## What each category tests

| Category | What it checks |
|----------|----------------|
| `TestHealthCheck` | `/health` up and fast |
| `TestPublicReadLoad` | 100 parallel GET events, p95 latency |
| `TestJWT` | Invalid tokens; book without phone |
| `TestOTP` | Invalid phone (optional real OTP with `RUN_OTP_TESTS=1`) |
| `TestBooking` | Missing fields on book/create-order |
| `TestConcurrency` | Parallel `book-free` — no mass 5xx |
| `TestSecurity` | Injection / huge body — no secret leaks |
| `TestAdminLogin` | Wrong password handling |

## Supabase edge functions

If your frontend points at Supabase functions, set:

```env
MALHAR_API_URL=https://YOUR_PROJECT.supabase.co/functions/v1
MALHAR_API_STYLE=supabase
```

## UI flow changes (Google → Dashboard → Booking)

Those are **not** applied yet. See the prior chat for `Login.jsx`, `Dashboard.jsx`, and `Booking.jsx` edits.
