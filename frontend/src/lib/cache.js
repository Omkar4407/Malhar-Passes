// ── cache.js ─────────────────────────────────────────────────────────────────
// Unified in-memory + localStorage cache for the frontend.
//
// Two tiers:
//   1. memCache  — module-level Map, fast, lives for the browser session.
//                  Used for shared data (events, slots) that many users read.
//   2. lsCache   — localStorage-backed, survives page reload.
//                  Used for per-user data (profile, tickets) to avoid a
//                  network round-trip on every navigation.
//
// All writes that mutate DB data must call bust() on the affected key(s)
// so stale data is never served after a mutation.
// ─────────────────────────────────────────────────────────────────────────────

const memStore = new Map(); // key → { data, ts }

// ── In-memory cache ───────────────────────────────────────────────────────────

export function memGet(key) {
  const entry = memStore.get(key);
  if (!entry) return null;
  return entry; // caller checks TTL
}

export function memSet(key, data) {
  memStore.set(key, { data, ts: Date.now() });
}

export function memBust(key) {
  memStore.delete(key);
}

export function memBustPrefix(prefix) {
  for (const k of memStore.keys()) {
    if (k.startsWith(prefix)) memStore.delete(k);
  }
}

// ── localStorage cache ────────────────────────────────────────────────────────

export function lsGet(key) {
  try {
    const raw = localStorage.getItem(`_cache_${key}`);
    if (!raw) return null;
    return JSON.parse(raw); // { data, ts }
  } catch {
    return null;
  }
}

export function lsSet(key, data) {
  try {
    localStorage.setItem(`_cache_${key}`, JSON.stringify({ data, ts: Date.now() }));
  } catch {
    // storage quota exceeded — degrade silently
  }
}

export function lsBust(key) {
  localStorage.removeItem(`_cache_${key}`);
}

// ── Generic cached-fetch helper ───────────────────────────────────────────────
// Usage:
//   const events = await cached("events", 30_000, fetchEventsFromDB);
//
// Checks memStore first (fastest), then falls through to fetcher.
// `ttlMs` is the max age in milliseconds.

export async function cached(key, ttlMs, fetcher) {
  const entry = memGet(key);
  if (entry && Date.now() - entry.ts < ttlMs) {
    return entry.data;
  }
  const data = await fetcher();
  memSet(key, data);
  return data;
}

// ── Per-user localStorage cached-fetch ───────────────────────────────────────
// Same as above but reads/writes localStorage so data survives navigation.
// Useful for user profile, tickets list.

export async function lsCached(key, ttlMs, fetcher) {
  const entry = lsGet(key);
  if (entry && Date.now() - entry.ts < ttlMs) {
    return entry.data;
  }
  const data = await fetcher();
  lsSet(key, data);
  return data;
}