"""
Malhar Passes — API & stress tests (pytest).

Configure via env or tests/.env (see tests/.env.example).
Run: pip install -r tests/requirements.txt && pytest tests/ -v
Stress only: pytest tests/ -v -m stress
"""

from __future__ import annotations

import os
import statistics
import time
from concurrent.futures import ThreadPoolExecutor, as_completed

import pytest
import requests

from helpers import events_url

# ── Config (override with env) ────────────────────────────────────────────────
STRESS_WORKERS = int(os.getenv("STRESS_WORKERS", "50"))
STRESS_READ_REQUESTS = int(os.getenv("STRESS_READ_REQUESTS", "100"))
READ_P95_MS = float(os.getenv("READ_P95_MS", "2000"))


def _post(session, url, **kwargs):
    return session.post(url, timeout=kwargs.pop("timeout", 30), **kwargs)


def _get(session, url, **kwargs):
    return session.get(url, timeout=kwargs.pop("timeout", 30), **kwargs)


# ── Health ────────────────────────────────────────────────────────────────────
@pytest.mark.integration
class TestHealthCheck:
    def test_health_ok(self, http_session, api_base):
        r = _get(http_session, f"{api_base}/health")
        assert r.status_code == 200
        assert r.json().get("ok") is True

    def test_health_response_time(self, http_session, api_base):
        t0 = time.perf_counter()
        r = _get(http_session, f"{api_base}/health")
        elapsed_ms = (time.perf_counter() - t0) * 1000
        assert r.status_code == 200
        assert elapsed_ms < 500, f"health took {elapsed_ms:.0f}ms"


# ── Public read load ──────────────────────────────────────────────────────────
@pytest.mark.integration
@pytest.mark.stress
class TestPublicReadLoad:
    def test_events_under_concurrent_load(
        self, http_session, api_base, endpoints
    ):
        url = events_url(api_base, endpoints)

        def one_request(_):
            t0 = time.perf_counter()
            try:
                r = _get(http_session, url, timeout=15)
                ms = (time.perf_counter() - t0) * 1000
                return r.status_code, ms, None
            except requests.RequestException as e:
                ms = (time.perf_counter() - t0) * 1000
                return 0, ms, str(e)

        with ThreadPoolExecutor(max_workers=STRESS_WORKERS) as pool:
            results = list(pool.map(one_request, range(STRESS_READ_REQUESTS)))

        codes = [c for c, _, _ in results]
        times = [ms for _, ms, _ in results]
        errors = [e for _, _, e in results if e]

        ok = sum(1 for c in codes if c == 200)
        assert ok >= STRESS_READ_REQUESTS * 0.95, (
            f"only {ok}/{STRESS_READ_REQUESTS} returned 200; errors={errors[:3]}"
        )

        times.sort()
        p95 = times[int(len(times) * 0.95) - 1] if times else 0
        assert p95 < READ_P95_MS, (
            f"p95 latency {p95:.0f}ms exceeds {READ_P95_MS}ms "
            f"(median={statistics.median(times):.0f}ms)"
        )


# ── JWT / auth ────────────────────────────────────────────────────────────────
@pytest.mark.integration
class TestJWT:
    def test_verify_token_missing(self, http_session, api_base):
        r = _post(http_session, f"{api_base}/verify-token", json={})
        assert r.status_code in (400, 401, 422)

    def test_verify_token_invalid(self, http_session, api_base):
        r = _post(
            http_session,
            f"{api_base}/verify-token",
            json={"token": "not.a.real.jwt"},
        )
        data = r.json()
        assert data.get("valid") is False

    def test_book_free_requires_verified_phone(
        self, http_session, api_base, mint_user_token, test_slot_id, test_event_id
    ):
        if not test_slot_id or not test_event_id:
            pytest.skip("TEST_SLOT_ID / TEST_EVENT_ID not set")

        token = mint_user_token(google_sub="stress-test-no-phone")
        r = _post(
            http_session,
            f"{api_base}/book-free",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "name": "Stress User",
                "college": "Test College",
                "slot_id": test_slot_id,
                "event_id": test_event_id,
                "photo_url": "https://example.com/p.jpg",
            },
        )
        assert r.status_code in (401, 403)
        assert "phone" in r.json().get("error", "").lower()


# ── OTP (dev mode) ────────────────────────────────────────────────────────────
@pytest.mark.integration
class TestOTP:
    def test_send_otp_invalid_phone(self, http_session, api_base):
        r = _post(http_session, f"{api_base}/send-otp", json={"phone": "123"})
        assert r.status_code == 400

    @pytest.mark.skipif(
        os.getenv("RUN_OTP_TESTS", "").lower() not in ("1", "true", "yes"),
        reason="Set RUN_OTP_TESTS=1 to hit real SMS/OTP (rate limited)",
    )
    def test_send_otp_dev_mode(self, http_session, api_base):
        phone = os.getenv("TEST_PHONE", "9876543210")
        r = _post(http_session, f"{api_base}/send-otp", json={"phone": phone})
        assert r.status_code == 200
        if os.getenv("DEV_MODE", "").lower() == "true":
            assert "dev_otp" in r.json()


# ── Booking validation ────────────────────────────────────────────────────────
@pytest.mark.integration
class TestBooking:
    def test_book_free_missing_fields(self, http_session, api_base, user_token):
        if not user_token:
            pytest.skip("TEST_USER_TOKEN not set")

        r = _post(
            http_session,
            f"{api_base}/book-free",
            headers={"Authorization": f"Bearer {user_token}"},
            json={},
        )
        assert r.status_code == 400

    def test_create_order_missing_fields(self, http_session, api_base, user_token):
        if not user_token:
            pytest.skip("TEST_USER_TOKEN not set")

        r = _post(
            http_session,
            f"{api_base}/create-order",
            headers={"Authorization": f"Bearer {user_token}"},
            json={},
        )
        assert r.status_code == 400


# ── Concurrency (booking race) ─────────────────────────────────────────────────
@pytest.mark.integration
@pytest.mark.stress
class TestConcurrency:
    """
    Fires many parallel book-free requests.
    Expect: at most slot capacity successes; rest 409 or duplicate rules.

    Requires JWT_SECRET (mint per-phone tokens) OR many TEST_USER_TOKEN_* env vars.
    Use a dedicated test slot with known capacity — not production main slots.
    """

    def test_parallel_book_free(
        self,
        http_session,
        api_base,
        mint_user_token,
        test_slot_id,
        test_event_id,
    ):
        if not test_slot_id or not test_event_id:
            pytest.skip("TEST_SLOT_ID / TEST_EVENT_ID not set")

        workers = int(os.getenv("BOOKING_STRESS_WORKERS", "30"))

        def book_once(i: int):
            phone = f"9{800000000 + (i % 100_000_000):09d}"[-10:]
            try:
                token = mint_user_token(phone=phone)
            except Exception:
                token = os.getenv("TEST_USER_TOKEN")
                if not token:
                    return {"status": 0, "error": "no token"}

            t0 = time.perf_counter()
            r = _post(
                http_session,
                f"{api_base}/book-free",
                headers={"Authorization": f"Bearer {token}"},
                json={
                    "name": f"Load Test {i}",
                    "college": "Stress College",
                    "slot_id": test_slot_id,
                    "event_id": test_event_id,
                    "photo_url": "https://example.com/photo.jpg",
                },
                timeout=60,
            )
            ms = (time.perf_counter() - t0) * 1000
            return {"status": r.status_code, "ms": ms, "body": r.text[:200]}

        with ThreadPoolExecutor(max_workers=workers) as pool:
            futures = [pool.submit(book_once, i) for i in range(workers)]
            results = [f.result() for f in as_completed(futures)]

        statuses = [r["status"] for r in results]
        success = sum(1 for s in statuses if s == 200)
        conflict = sum(1 for s in statuses if s == 409)
        rate_limited = sum(1 for s in statuses if s == 429)
        other = len(statuses) - success - conflict - rate_limited

        print(
            f"\n[concurrency] workers={workers} "
            f"200={success} 409={conflict} 429={rate_limited} other={other}"
        )

        # Should not all fail with 500
        server_errors = sum(1 for s in statuses if s >= 500)
        assert server_errors < workers, f"too many 5xx: {server_errors}/{workers}"

        # At least some requests got a defined booking outcome (not all 401/403)
        booking_outcomes = success + conflict + rate_limited
        assert booking_outcomes > 0, (
            "no booking outcomes — check JWT_SECRET / tokens / phone in JWT"
        )


# ── Security smoke ────────────────────────────────────────────────────────────
@pytest.mark.integration
class TestSecurity:
    def test_sql_injection_in_verify_token(self, http_session, api_base):
        r = _post(
            http_session,
            f"{api_base}/verify-token",
            json={"token": "' OR '1'='1"},
        )
        data = r.json()
        assert data.get("valid") is False

    def test_oversized_json_body(self, http_session, api_base):
        r = _post(
            http_session,
            f"{api_base}/verify-token",
            json={"token": "x" * 100_000},
        )
        assert r.status_code in (400, 413, 431, 500)
        body = r.text.lower()
        assert "secret" not in body and "jwt_secret" not in body


# ── Admin login brute smoke ─────────────────────────────────────────────────────
@pytest.mark.integration
class TestAdminLogin:
    def test_admin_login_wrong_password(self, http_session, api_base):
        r = _post(
            http_session,
            f"{api_base}/admin-login",
            json={"email": "admin@test.com", "password": "wrong-password-xyz"},
        )
        assert r.status_code in (401, 400, 429)
