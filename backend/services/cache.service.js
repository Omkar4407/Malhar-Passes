// ── cache.service.js ──────────────────────────────────────────────────────────
// Simple in-process Map-based cache for the backend.
//
// Scope: one Node.js process. If you scale to multiple backend instances
// (e.g. multiple Render workers), replace this with a shared Redis store.
// For a single-process deployment (one Render dyno, one Railway container)
// this is fully correct and safe.
//
// Keys cached here:
//   slot:<slot_id>     — slot availability (capacity, booked_count)
//   ticket:<ticket_id> — full ticket row, used after booking
//
// TTLs are intentionally short because these values change during booking.
// Writes (book_slot RPC) must call bust() on the affected slot key.
// ─────────────────────────────────────────────────────────────────────────────

const store = new Map(); // key → { value, expiresAt }

// ── Core primitives ───────────────────────────────────────────────────────────

export function get(key) {
  const entry = store.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return undefined;
  }
  return entry.value;
}

export function set(key, value, ttlMs) {
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
}

export function bust(key) {
  store.delete(key);
}

export function bustPrefix(prefix) {
  for (const k of store.keys()) {
    if (k.startsWith(prefix)) store.delete(k);
  }
}

// ── Cached-fetch helper ───────────────────────────────────────────────────────
// Usage:
//   const slot = await cacheGet("slot:uuid", 5000, () => fetchSlotFromDB(id));

export async function cacheGet(key, ttlMs, fetcher) {
  const hit = get(key);
  if (hit !== undefined) return hit;
  const value = await fetcher();
  set(key, value, ttlMs);
  return value;
}

// ── TTL constants ─────────────────────────────────────────────────────────────
export const TTL = {
  SLOT_AVAILABILITY: 5_000,   // 5s — changes during booking rush
  TICKET:           10_000,   // 10s — read right after booking
  SCANNER_TICKET:    5_000,   // 5s — scanner reads need to be fresh
};

// ── Periodic cleanup (prevents unbounded memory growth) ──────────────────────
// Runs every 60s and evicts all expired entries.
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (now > entry.expiresAt) store.delete(key);
  }
}, 60_000);