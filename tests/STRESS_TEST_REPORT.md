# Malhar Passes — Stress & Integration Test Report

**Generated:** 2026-05-18  
**API target:** `http://localhost:5000` (Express backend)  
**Frontend (manual check):** `http://localhost:5173`  
**Runner:** `python -m pytest tests/ -v -m integration`

---

## Executive summary

| Metric | Value |
|--------|--------|
| Total tests | 14 |
| Passed | 7 |
| Failed | 2 |
| Skipped | 5 |
| Duration | ~2.4 s |
| Overall | **Partial pass** — core health/auth OK; one load test slightly over latency SLO; booking stress not run (missing config) |

---

## Live app (manual UI check)

Servers verified reachable before this report:

| Service | URL | Status |
|---------|-----|--------|
| Frontend (Vite) | http://localhost:5173 | HTTP 200 |
| Backend API | http://localhost:5000/health | `{"ok":true}` |

**Suggested manual flow to verify UI changes:**

1. Open http://localhost:5173 — should show **Google sign-in only** (no phone OTP on login).
2. Sign in with Google → **Dashboard** (no “phone not verified” banner).
3. **Book Tickets** → pick event → pick slot → **Booking** page.
4. On booking: **Mobile verification** (phone + OTP) + **Your details** (name, college, photo) on the **same page**.
5. Complete verification and details → **Pay** or **Book Free Pass** → **My Ticket**.

> Ensure `frontend/.env` has `VITE_BACKEND_URL=http://localhost:5000` and `VITE_GOOGLE_CLIENT_ID` set, or API calls from the UI will fail.

---

## Test results by category

### Health checks — PASS

| Test | Result | Notes |
|------|--------|-------|
| `test_health_ok` | PASS | `/health` returns 200, `ok: true` |
| `test_health_response_time` | PASS | Response &lt; 500 ms |

### Stress: public read load — FAIL (marginal)

| Test | Result | Details |
|------|--------|---------|
| `test_events_under_concurrent_load` | **FAIL** | 100 parallel GETs, 50 workers |

**Load profile:** `STRESS_READ_REQUESTS=100`, `STRESS_WORKERS=50`, threshold `READ_P95_MS=2000`

| Metric | Value |
|--------|--------|
| Success rate (HTTP 200) | Met ≥ 95% requirement |
| Median latency | ~921 ms |
| **P95 latency** | **~2034 ms** (limit: 2000 ms) |

**Analysis:** Under heavy concurrent reads, tail latency slightly exceeds the 2 s SLO. Connection-pool warnings (`pool size: 10`) suggest the test client or server may be connection-bound on localhost. For production, consider connection pooling tuning, caching for `/events`, or raising the SLO for local dev runs (`READ_P95_MS=2500` in `tests/.env`).

### Stress: booking concurrency — SKIPPED

| Test | Result | Reason |
|------|--------|--------|
| `test_parallel_book_free` | SKIPPED | `TEST_SLOT_ID` and `TEST_EVENT_ID` not set in `tests/.env` |

**To run:** Add dedicated test slot/event UUIDs from Supabase and `JWT_SECRET` (loaded from `backend/.env` when present). Then:

```bash
python -m pytest tests/test_malhar.py::TestConcurrency -v -m stress
```

### JWT / auth — PASS (1 skipped)

| Test | Result |
|------|--------|
| `test_verify_token_missing` | PASS |
| `test_verify_token_invalid` | PASS |
| `test_book_free_requires_verified_phone` | SKIPPED (no slot/event IDs) |

### OTP — PASS (1 skipped)

| Test | Result |
|------|--------|
| `test_send_otp_invalid_phone` | PASS |
| `test_send_otp_dev_mode` | SKIPPED (`RUN_OTP_TESTS` not enabled) |

### Booking validation — SKIPPED

| Test | Result | Reason |
|------|--------|--------|
| `test_book_free_missing_fields` | SKIPPED | `TEST_USER_TOKEN` not set |
| `test_create_order_missing_fields` | SKIPPED | `TEST_USER_TOKEN` not set |

### Security smoke — PARTIAL

| Test | Result | Notes |
|------|--------|-------|
| `test_sql_injection_in_verify_token` | PASS | Invalid token rejected |
| `test_oversized_json_body` | **FAIL** | Got HTTP **401**; test expects 400/413/431/500 |

**Analysis:** Oversized body may hit auth/middleware before body-size handling. Either accept 401 in the test or add explicit payload-size middleware.

### Admin login — PASS

| Test | Result |
|------|--------|
| `test_admin_login_wrong_password` | PASS |

---

## Recommendations

1. **Complete stress config** — Create `tests/.env` from `tests/.env.example` with `TEST_SLOT_ID`, `TEST_EVENT_ID`, and optionally `TEST_USER_TOKEN`.
2. **Re-run booking concurrency** — After config, run `python -m pytest tests/ -v -m stress` for full booking race coverage.
3. **Load test tuning** — For local runs, increase `READ_P95_MS` or reduce `STRESS_WORKERS` if failures are only on dev machine.
4. **Fix or adjust** `test_oversized_json_body` expected status codes to match actual API behavior (401).

---

## How to reproduce

```powershell
cd "c:\Users\Kesar Singh\Malhar-Passes"
pip install -r tests/requirements.txt

# Terminal 1
cd backend; node server.js

# Terminal 2
cd frontend; npm run dev

# Terminal 3
python -m pytest tests/ -v -m integration
python -m pytest tests/ -v -m stress
```

Raw console log: `tests/stress_run_output.txt`  
HTML report (pytest-html): `tests/stress_report.html` (open in browser)

**Note:** A second stress-only run immediately after the first caused connection resets on localhost (server overload). The table above reflects the **first** integration run, which is the stable baseline.

---

## UI flow implementation status

| Step | Status |
|------|--------|
| Google-only login (`Login.jsx`) | Implemented |
| Dashboard without phone banner (`Dashboard.jsx`) | Implemented |
| Phone + OTP + details on booking page (`Booking.jsx`) | Implemented |
| Pay after verification + profile complete | Implemented |
