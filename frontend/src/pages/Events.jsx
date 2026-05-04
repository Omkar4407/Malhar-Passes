import { useEffect, useState, useRef } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import Menu from "../components/Menu";

const API = import.meta.env.VITE_BACKEND_URL;

export function bustSlotsCache() {} // no-op — cache removed, kept for import compat

export default function Events() {
  const [events, setEvents]         = useState([]);
  const [loading, setLoading]       = useState(true);
  const [navigating, setNavigating] = useState(null);
  const [error, setError]           = useState("");
  const [toast, setToast]           = useState("");   // transient 2-second toast
  const toastTimer = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    axios.get(`${API}/events`)
      .then(({ data }) => setEvents(data.events || []))
      .catch(() => setError("Failed to load events. Please refresh."))
      .finally(() => setLoading(false));
  }, []);

  // Show a toast that auto-dismisses after 2 s
  const showToast = (msg) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 2000);
  };

  const handleClick = async (event) => {
    if (navigating) return;
    setNavigating(event.id);
    setError("");
    try {
      const { data } = await axios.get(`${API}/events/${event.id}/slots`);
      const slots = data.slots || [];

      if (slots.length === 0) {
        showToast(`No slots available for "${event.name}" yet.`);
        setNavigating(null);
        return;
      }

      // Check if at least one slot has been released by admin
      const anyReleased = slots.some((s) => s.is_released === true);
      if (!anyReleased) {
        showToast(`Passes for "${event.name}" haven't been released yet. Check back soon.`);
        setNavigating(null);
        return;
      }

      // Pass ALL slots to the Slots page — it handles released vs locked display.
      // Don't pre-filter here; users should see locked slots with the
      // "Passes not released yet" label rather than getting a misleading "fully booked" error.
      if (slots.length === 1) {
        // Single slot: go straight to booking if released and has capacity,
        // otherwise show the slots page so the user sees the locked state.
        const s = slots[0];
        if (s.is_released && s.booked_count < s.capacity) {
          navigate("/booking", { state: { slot: s, event } });
        } else {
          navigate("/slots", { state: { slots, event } });
        }
      } else {
        navigate("/slots", { state: { slots, event } });
      }
    } catch {
      setError("Could not load slots. Please try again.");
      setNavigating(null);
    }
  };

  return (
    <>
      <Menu />
      <Header />

      {/* ── Toast notification ── */}
      {toast && (
        <div style={styles.toastOverlay}>
          <div style={styles.toast}>{toast}</div>
        </div>
      )}

      <div style={styles.page}>
        <div style={styles.titleRow}>
          <h1 style={styles.pageTitle}>Events</h1>
          {!loading && (
            <span style={styles.count}>
              {events.length} event{events.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {error && <div style={styles.errorBox}>{error}</div>}

        {loading && (
          <div style={styles.emptyState}>
            <p style={styles.emptyText}>Loading events…</p>
          </div>
        )}

        {!loading && events.length === 0 && !error && (
          <div style={styles.emptyState}>
            <span style={styles.emptyIcon}>🎪</span>
            <p style={styles.emptyText}>No events available yet. Check back soon!</p>
          </div>
        )}

        {events.map((event) => {
          const isLoading = navigating === event.id;
          return (
            <div
              key={event.id}
              onClick={() => handleClick(event)}
              style={{
                ...styles.card,
                opacity: navigating && !isLoading ? 0.5 : 1,
                cursor: navigating ? "default" : "pointer",
              }}
            >
              <div style={styles.cardLeft}>
                <div style={styles.nameRow}>
                  <h2 style={styles.eventName}>{event.name}</h2>
                  {event.type && <span style={styles.typeBadge}>{event.type}</span>}
                </div>
                <span style={styles.tapHint}>{isLoading ? "Loading…" : "Tap to book →"}</span>
              </div>
              <span style={{
                ...styles.priceBadge,
                background: event.price > 0 ? "#FFE4D6" : "#E6FFF2",
                color:      event.price > 0 ? "#B94000" : "#1a7a45",
              }}>
                {event.price > 0 ? `₹${event.price}` : "Free"}
              </span>
            </div>
          );
        })}
      </div>
    </>
  );
}

const styles = {
  page:       { padding: "20px", maxWidth: "560px", margin: "0 auto", fontFamily: "'Segoe UI', system-ui, sans-serif", color: "#1a1a1a" },
  titleRow:   { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" },
  pageTitle:  { fontSize: "22px", fontWeight: 800, margin: 0, letterSpacing: "-0.02em" },
  count:      { fontSize: "12px", fontWeight: 600, color: "#aaa", background: "#f5f5f5", padding: "3px 10px", borderRadius: "20px" },
  card:       { background: "#fff", border: "1px solid #eee", borderRadius: "12px", padding: "16px 18px", marginBottom: "10px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", boxShadow: "0 1px 4px rgba(0,0,0,0.05)", transition: "opacity 0.15s" },
  cardLeft:   { display: "flex", flexDirection: "column", gap: "4px", flex: 1, minWidth: 0 },
  nameRow:    { display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" },
  eventName:  { fontSize: "16px", fontWeight: 700, margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  typeBadge:  { fontSize: "10px", fontWeight: 600, color: "#7C3AED", background: "#F3EEFF", padding: "2px 8px", borderRadius: "20px", textTransform: "uppercase", letterSpacing: "0.04em", flexShrink: 0 },
  tapHint:    { fontSize: "12px", color: "#FF5C1A", fontWeight: 500 },
  priceBadge: { padding: "5px 12px", borderRadius: "20px", fontSize: "13px", fontWeight: 700, flexShrink: 0 },
  emptyState: { textAlign: "center", padding: "48px 20px", background: "#fafafa", borderRadius: "12px", border: "2px dashed #eee", display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" },
  emptyIcon:  { fontSize: "36px" },
  emptyText:  { color: "#aaa", fontSize: "14px", margin: 0 },
  errorBox:    { background: "#fff0f0", border: "1px solid #fdd", color: "#d0312d", fontSize: "13px", padding: "8px 12px", borderRadius: "7px", marginBottom: "14px" },
  toastOverlay: { position: "fixed", top: "16px", left: "50%", transform: "translateX(-50%)", zIndex: 9999, pointerEvents: "none", width: "calc(100% - 32px)", maxWidth: "480px" },
  toast:        { background: "#1A0A00", color: "#FF5C1A", fontSize: "13px", fontWeight: 600, padding: "12px 18px", borderRadius: "12px", boxShadow: "0 4px 20px rgba(0,0,0,0.25)", border: "1px solid rgba(255,92,26,0.3)", textAlign: "center", lineHeight: 1.4 },
};