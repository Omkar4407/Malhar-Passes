"""Shared pytest fixtures — load config from env or backend/.env."""

import os
from pathlib import Path

import jwt
import pytest
import requests
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[1]
BACKEND_ENV = ROOT / "backend" / ".env"

load_dotenv(BACKEND_ENV)
load_dotenv(ROOT / "tests" / ".env")


def _env(name: str, default: str = "") -> str:
    return os.getenv(name, default).strip()


@pytest.fixture(scope="session")
def api_base() -> str:
    """Backend or Supabase functions base URL (no trailing slash)."""
    url = _env("MALHAR_API_URL", "http://localhost:5000")
    return url.rstrip("/")


@pytest.fixture(scope="session")
def api_style() -> str:
    """
    express  -> /events, /events/:id/slots  (Node backend)
    supabase -> /get-events, /get-slots?event_id=  (edge functions)
    """
    return _env("MALHAR_API_STYLE", "express").lower()


@pytest.fixture(scope="session")
def jwt_secret() -> str | None:
    secret = _env("JWT_SECRET")
    return secret or None


@pytest.fixture(scope="session")
def http_session() -> requests.Session:
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def endpoints(api_style: str):
    if api_style == "supabase":
        return {
            "events": "/get-events",
            "slots": "/get-slots",
            "slots_query": True,
        }
    return {
        "events": "/events",
        "slots": None,
        "slots_query": False,
    }


@pytest.fixture
def mint_user_token(jwt_secret):
    """Build attendee JWTs when JWT_SECRET is available (local stress runs)."""

    def _mint(
        *,
        phone: str | None = None,
        google_sub: str | None = None,
        role: str = "user",
    ) -> str:
        if not jwt_secret:
            pytest.skip("JWT_SECRET not set — cannot mint tokens")
        payload: dict = {"role": role}
        if phone:
            payload["phone"] = phone
        if google_sub:
            payload["google_sub"] = google_sub
        return jwt.encode(payload, jwt_secret, algorithm="HS256")

    return _mint


@pytest.fixture
def user_token() -> str | None:
    t = _env("TEST_USER_TOKEN")
    return t or None


@pytest.fixture
def admin_token() -> str | None:
    t = _env("TEST_ADMIN_TOKEN")
    return t or None


@pytest.fixture
def test_slot_id() -> str | None:
    t = _env("TEST_SLOT_ID")
    return t or None


@pytest.fixture
def test_event_id() -> str | None:
    t = _env("TEST_EVENT_ID")
    return t or None


@pytest.fixture
def auth_headers(user_token):
    if not user_token:
        return None

    def _headers(token: str | None = None):
        t = token or user_token
        return {"Authorization": f"Bearer {t}"}

    return _headers
