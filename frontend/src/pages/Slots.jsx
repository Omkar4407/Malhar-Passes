import { useState, useEffect } from "react";
import axios from "axios";
import { useLocation, useNavigate } from "react-router-dom";
import Menu from "../components/Menu";
import Header from "../components/Header";

const API = import.meta.env.VITE_BACKEND_URL;

function saveToSession(event, slots) {
  try {
    sessionStorage.setItem("slots_event", JSON.stringify(event));
    sessionStorage.setItem("slots_data",  JSON.stringify(slots));
  } catch (_) {}
}

function loadFromSession() {
  try {
    const event = JSON.parse(sessionStorage.getItem("slots_event"));
    const slots = JSON.parse(sessionStorage.getItem("slots_data"));
    return { event, slots };
  } catch (_) {
    return { event: null, slots: null };
  }
}

export default function Slots() {
  const { state }  = useLocation();
  const navigate   = useNavigate();

  const session = loadFromSession();
  const initEvent = state?.event  || session.event;
  const initSlots = state?.slots  || session.slots;

  const [event,      setEvent]      = useState(initEvent);
  const [slots,      setSlots]      = useState(initSlots);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError,  setLoadError]  = useState("");

  useEffect(() => {
    if (!initEvent) return;
    const fetchSlots = async () => {
      setRefreshing(true);
      try {
        const { data } = await axios.get(`${API}/get-slots?event_id=${initEvent.id}`);
        const fresh = data.slots || [];
        setSlots(fresh);
        saveToSession(initEvent, fresh);
      } catch (err) {
        console.error("Initial slots fetch error:", err);
        if (!initSlots) setLoadError("Failed to load slots. Please go back and try again.");
      } finally {
        setRefreshing(false);
      }
    };
    fetchSlots();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (event && slots) saveToSession(event, slots);
  }, [event, slots]);

  if (!event) {
    return (
      <>
        <Menu />
        <div style={styles.page}>
          <div style={styles.errorBox}>Invalid page state. Please go back and try again.</div>
        </div>
      </>
    );
  }

  if (loadError && !slots) {
    return (
      <>
        <Menu />
        <div style={styles.page}>
          <div style={styles.errorBox}>{loadError}</div>
        </div>
      </>
    );
  }

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const { data } = await axios.get(`${API}/get-slots?event_id=${event.id}`);
      const fresh = data.slots || [];
      setSlots(fresh);
      saveToSession(event, fresh);
    } catch (err) {
      console.error("Refresh slots error:", err);
    }
    setRefreshing(false);
  };

  const handleSelect = (slot) => {
    navigate("/booking", { state: { slot, event } });
  };

  return (
    <>
      <Menu />
      <Header />
      <div style={styles.page}>
        <div style={styles.hero}>
          <p style={styles.heroLabel}>Select a slot for</p>
          <h1 style={styles.heroTitle}>{event.name}</h1>
          <span style={{
            ...styles.priceBadge,
            background: event.price > 0 ? "rgba(255,92,26,0.15)" : "rgba(22,163,74,0.15)",
            color:      event.price > 0 ? "#FF5C1A" : "#16a34a",
            border:     `1px solid ${event.price > 0 ? "rgba(255,92,26,0.3)" : "rgba(22,163,74,0.3)"}`,
          }}>
            {event.price > 0 ? `₹${event.price}` : "Free"}
          </span>
        </div>

        <div style={styles.controlRow}>
          <span style={styles.slotCount}>
            {slots.length} slot{slots.length !== 1 ? "s" : ""}
          </span>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            style={{ ...styles.refreshBtn, opacity: refreshing ? 0.6 : 1 }}
          >
            {refreshing ? "↻ Refreshing…" : "↻ Refresh"}
          </button>
        </div>

        {slots.length === 0 && (
          <div style={styles.emptyBox}>
            No slots available. Try refreshing.
          </div>
        )}

        {slots.map((slot) => {
          const isReleased = slot.is_released === true;
          const isFull     = (slot.booked_count ?? 0) >= slot.capacity;
          const canBook    = isReleased && !isFull;
          const spotsLeft  = slot.capacity - (slot.booked_count ?? 0);

          return (
            <div
              key={slot.id}
              onClick={() => canBook && handleSelect(slot)}
              style={{
                ...styles.slotCard,
                opacity: canBook ? 1 : 0.72,
                cursor:  canBook ? "pointer" : "default",
              }}
            >
              <div style={styles.slotLeft}>
                <h3 style={styles.slotName}>{slot.name}</h3>
                <div style={styles.slotMeta}>
                  {slot.date && <span style={styles.metaChip}>📅 {slot.date}</span>}
                  {slot.time && <span style={styles.metaChip}>🕐 {slot.time}</span>}
                </div>
              </div>

              <div style={styles.slotRight}>
                {!isReleased ? (
                  <span style={styles.lockedBadge}>Passes not released yet</span>
                ) : isFull ? (
                  <span style={{ ...styles.availBadge, background: "#f5f5f5", color: "#aaa" }}>
                    Full
                  </span>
                ) : (
                  <span style={{
                    ...styles.availBadge,
                    background: spotsLeft <= 10 ? "#FFF3E0" : "#E6FFF2",
                    color:      spotsLeft <= 10 ? "#b45309" : "#1a7a45",
                  }}>
                    {spotsLeft} left
                  </span>
                )}
                {canBook && <span style={styles.arrow}>→</span>}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

const styles = {
  page:        { padding: "20px", maxWidth: "560px", margin: "0 auto", fontFamily: "'Segoe UI', system-ui, sans-serif", color: "#1a1a1a" },
  hero:        { background: "#1A0A00", borderRadius: "14px", padding: "24px 20px", marginBottom: "16px" },
  heroLabel:   { color: "rgba(255,255,255,0.4)", fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 6px" },
  heroTitle:   { color: "#FF5C1A", fontSize: "26px", fontWeight: 900, margin: "0 0 10px", letterSpacing: "-0.02em" },
  priceBadge:  { display: "inline-block", padding: "3px 12px", borderRadius: "20px", fontSize: "13px", fontWeight: 700 },
  controlRow:  { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" },
  slotCount:   { fontSize: "13px", color: "#aaa", fontWeight: 500 },
  refreshBtn:  { background: "none", border: "1px solid #FF5C1A", color: "#FF5C1A", borderRadius: "8px", padding: "5px 12px", fontSize: "13px", fontWeight: 600, cursor: "pointer" },
  slotCard:    { background: "#fff", border: "1px solid #eee", borderRadius: "12px", padding: "16px 18px", marginBottom: "10px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", boxShadow: "0 1px 4px rgba(0,0,0,0.05)", transition: "opacity 0.15s" },
  slotLeft:    { flex: 1, minWidth: 0 },
  slotName:    { fontSize: "16px", fontWeight: 700, margin: "0 0 6px" },
  slotMeta:    { display: "flex", gap: "8px", flexWrap: "wrap" },
  metaChip:    { fontSize: "12px", color: "#666", background: "#f5f5f5", padding: "2px 8px", borderRadius: "6px" },
  slotRight:   { display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "6px", flexShrink: 0 },
  availBadge:  { fontSize: "12px", fontWeight: 700, padding: "3px 10px", borderRadius: "20px" },
  lockedBadge: { fontSize: "11px", fontWeight: 700, padding: "4px 10px", borderRadius: "20px", background: "#FFF3E0", color: "#b45309", border: "1px solid rgba(180,83,9,0.2)", whiteSpace: "nowrap" },
  arrow:       { fontSize: "18px", color: "#FF5C1A" },
  errorBox:    { background: "#fff0f0", border: "1px solid #fdd", color: "#d0312d", fontSize: "13px", padding: "10px 14px", borderRadius: "8px" },
  emptyBox:    { background: "#fafafa", border: "2px dashed #eee", color: "#aaa", fontSize: "14px", padding: "24px", borderRadius: "12px", textAlign: "center" },
};