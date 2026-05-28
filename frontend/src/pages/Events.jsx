import { useEffect, useState, useRef } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";

const API = import.meta.env.VITE_BACKEND_URL;

function authHeader() {
  const token = localStorage.getItem("userToken");
  return { Authorization: `Bearer ${token}` };
}

export function bustSlotsCache() {} // no-op

export default function Events() {
  const [events, setEvents]         = useState([]);
  const [loading, setLoading]       = useState(true);
  const [navigating, setNavigating] = useState(null);
  const [error, setError]           = useState("");
  const [toast, setToast]           = useState("");
  const toastTimer = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    axios.get(`${API}/get-events`)
      .then(({ data }) => setEvents(data.events || []))
      .catch(() => setError("Failed to load events. Please refresh."))
      .finally(() => setLoading(false));
  }, []);

  const showToast = (msg) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 3000);
  };

  const handleClick = async (event) => {
    if (navigating) return;
    setNavigating(event.id);
    setError("");
    try {
      const token = localStorage.getItem("userToken");
      const { data } = await axios.get(`${API}/get-slots?event_id=${event.id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const slots = data.slots || [];

      if (slots.length === 0) {
        showToast(`No slots available for "${event.name}" yet.`);
        setNavigating(null);
        return;
      }

      const anyReleased = slots.some((s) => s.is_released === true);
      if (!anyReleased) {
        showToast(`Passes for "${event.name}" haven't been released yet. Check back soon.`);
        setNavigating(null);
        return;
      }

      if (slots.length === 1) {
        const s = slots[0];
        if (s.is_released && s.booked_count < s.capacity) {
            // We skip the pre-check here and let the booking endpoint handle 409 errors
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
    <div style={{ minHeight: "100vh" }}>
      <Header />

      {/* Ambient glow */}
      <div style={{
        position: "fixed",
        top: "-10%",
        right: "-10%",
        width: "50vw",
        height: "50vw",
        background: "radial-gradient(circle, rgba(111,36,187,0.15) 0%, transparent 70%)",
        pointerEvents: "none",
        zIndex: 0
      }} />

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
            <div style={styles.spinner}></div>
            <p style={styles.emptyText}>Loading events…</p>
          </div>
        )}

        {!loading && events.length === 0 && !error && (
          <div style={styles.emptyState}>
            <span style={styles.emptyIcon}>🎪</span>
            <p style={styles.emptyText}>No events available yet. Check back soon!</p>
          </div>
        )}

        <div style={styles.grid}>
          {events.map((event) => {
            const isLoading = navigating === event.id;
            return (
              <div
                key={event.id}
                onClick={() => handleClick(event)}
                className="glass-card"
                style={{
                  ...styles.card,
                  opacity: navigating && !isLoading ? 0.6 : 1,
                  cursor: navigating ? "default" : "pointer",
                  pointerEvents: navigating ? "none" : "auto",
                }}
              >
                {/* Glowing border top accent */}
                <div style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "2px",
                  background: "linear-gradient(90deg, transparent, #ff00cf, transparent)",
                  opacity: 0.5
                }} />

                <div style={styles.cardContent}>
                  <div style={styles.cardLeft}>
                    <div style={styles.nameRow}>
                      <h2 style={styles.eventName}>{event.name}</h2>
                      {event.type && <span style={styles.typeBadge}>{event.type}</span>}
                    </div>
                    <span style={styles.tapHint}>{isLoading ? "Loading slots…" : "Tap to book →"}</span>
                  </div>
                  
                  <div style={{
                    ...styles.priceBadge,
                    background: event.price > 0 ? "rgba(255, 107, 0, 0.15)" : "rgba(0, 171, 255, 0.15)",
                    color: event.price > 0 ? "#ff6b00" : "#00abff",
                    border: `1px solid ${event.price > 0 ? "rgba(255, 107, 0, 0.3)" : "rgba(0, 171, 255, 0.3)"}`,
                    boxShadow: event.price > 0 ? "0 0 10px rgba(255, 107, 0, 0.1)" : "0 0 10px rgba(0, 171, 255, 0.1)"
                  }}>
                    {event.price > 0 ? `₹${event.price}` : "FREE"}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const styles = {
  page:       { position: "relative", zIndex: 1, padding: "32px 24px", maxWidth: "800px", margin: "0 auto" },
  titleRow:   { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "32px" },
  pageTitle:  { fontFamily: "'Bebas Neue', sans-serif", fontSize: "48px", margin: 0, letterSpacing: "0.02em", color: "#eedcff" },
  count:      { fontSize: "12px", fontWeight: 700, color: "#dab8ff", background: "rgba(111, 36, 187, 0.3)", padding: "4px 12px", borderRadius: "20px", border: "1px solid rgba(218, 184, 255, 0.2)", letterSpacing: "0.05em", textTransform: "uppercase" },
  grid:       { display: "flex", flexDirection: "column", gap: "16px" },
  card:       { position: "relative", padding: "24px", overflow: "hidden" },
  cardContent:{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px", position: "relative", zIndex: 1 },
  cardLeft:   { display: "flex", flexDirection: "column", gap: "8px", flex: 1, minWidth: 0 },
  nameRow:    { display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" },
  eventName:  { fontFamily: "'Montserrat', sans-serif", fontSize: "20px", fontWeight: 700, margin: 0, color: "#eedcff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  typeBadge:  { fontSize: "10px", fontWeight: 700, color: "#ffaddf", background: "rgba(255, 0, 207, 0.15)", border: "1px solid rgba(255, 0, 207, 0.3)", padding: "3px 10px", borderRadius: "20px", textTransform: "uppercase", letterSpacing: "0.1em", flexShrink: 0 },
  tapHint:    { fontSize: "13px", color: "#a78899", fontWeight: 500, letterSpacing: "0.02em" },
  priceBadge: { padding: "8px 16px", borderRadius: "12px", fontSize: "15px", fontWeight: 800, flexShrink: 0, letterSpacing: "0.05em" },
  emptyState: { textAlign: "center", padding: "64px 20px", background: "rgba(38, 25, 56, 0.3)", borderRadius: "16px", border: "1px dashed rgba(167, 136, 153, 0.2)", display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" },
  emptyIcon:  { fontSize: "48px", filter: "drop-shadow(0 0 20px rgba(255,255,255,0.2))" },
  emptyText:  { color: "#a78899", fontSize: "15px", margin: 0, fontWeight: 500 },
  spinner:    { width: "32px", height: "32px", border: "3px solid rgba(255,0,207,0.2)", borderTopColor: "#ff00cf", borderRadius: "50%", animation: "spin 1s linear infinite" },
  errorBox:   { background: "rgba(147, 0, 10, 0.2)", border: "1px solid rgba(255, 180, 171, 0.3)", color: "#ffb4ab", fontSize: "14px", padding: "12px 16px", borderRadius: "12px", marginBottom: "24px", display: "flex", alignItems: "center", gap: "8px" },
  toastOverlay: { position: "fixed", top: "24px", left: "50%", transform: "translateX(-50%)", zIndex: 9999, pointerEvents: "none", width: "calc(100% - 48px)", maxWidth: "480px", animation: "slide-up 0.3s ease-out" },
  toast:        { background: "rgba(11, 1, 28, 0.9)", backdropFilter: "blur(10px)", color: "#ffaddf", fontSize: "14px", fontWeight: 600, padding: "16px 20px", borderRadius: "16px", boxShadow: "0 10px 40px rgba(0,0,0,0.5), 0 0 20px rgba(255,0,207,0.2)", border: "1px solid rgba(255, 0, 207, 0.4)", textAlign: "center", lineHeight: 1.5, letterSpacing: "0.02em" },
};