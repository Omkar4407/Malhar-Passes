import { useEffect, useState } from "react";
import axios from "axios";

const API = import.meta.env.VITE_BACKEND_URL;

function adminHeader() {
  return { Authorization: `Bearer ${localStorage.getItem("adminToken")}` };
}

// ─── Slot row ─────────────────────────────────────────────────────────────────
function SlotRow({ slot, onUpdated }) {
  const [editing, setEditing]   = useState(false);
  const [toggling, setToggling] = useState(false);
  const [form, setForm]         = useState({ name: slot.name, time: slot.time || "", capacity: String(slot.capacity || "") });
  const [saving, setSaving]     = useState(false);

  const isReleased = slot.is_released === true;

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      await axios.patch(
        `${API}/admin-slots`,
        { slot_id: slot.id, name: form.name.trim(), time: form.time.trim(), capacity: Number(form.capacity) || slot.capacity },
        { headers: adminHeader() }
      );
      setEditing(false);
      onUpdated();
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete slot "${slot.name}"?`)) return;
    await axios.delete(`${API}/admin-slots`, { headers: adminHeader(), data: { slot_id: slot.id } });
    onUpdated();
  };

  const handleToggleRelease = async () => {
    setToggling(true);
    try {
      await axios.post(
        `${API}/toggle-release-slot`,
        { slot_id: slot.id, is_released: !isReleased },
        { headers: adminHeader() }
      );
      onUpdated();
    } catch (e) { console.error(e); }
    setToggling(false);
  };

  if (editing) {
    return (
      <div style={styles.slotRow}>
        <input value={form.name}     onChange={(e) => setForm({ ...form, name: e.target.value })}     style={{ ...styles.input, flex: 2, marginBottom: 0 }} placeholder="Slot name" />
        <input value={form.time}     onChange={(e) => setForm({ ...form, time: e.target.value })}     style={{ ...styles.input, flex: 2, marginBottom: 0 }} placeholder="Time" />
        <input value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} style={{ ...styles.input, flex: 1, marginBottom: 0 }} type="number" min="1" />
        <div style={styles.actionRow}>
          <button onClick={handleSave} disabled={saving} style={styles.btnSave}>{saving ? "Saving…" : "Save"}</button>
          <button onClick={() => setEditing(false)} style={styles.btnCancel}>Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.slotRow}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          <strong style={{ fontSize: "14px" }}>{slot.name}</strong>
          {slot.time && <span style={styles.slotTime}>{slot.time}</span>}
          {/* Release status badge */}
          <span style={{
            fontSize: "11px", fontWeight: 700, padding: "2px 8px", borderRadius: "20px",
            background: isReleased ? "#E6FFF2" : "#FFF3E0",
            color:      isReleased ? "#1a7a45" : "#b45309",
          }}>
            {isReleased ? "✓ Released" : "⚠ Not Released"}
          </span>
        </div>
        <div style={{ fontSize: "12px", color: "#aaa", marginTop: "3px" }}>
          {slot.booked_count ?? 0} booked · {slot.capacity} capacity
        </div>
      </div>

      <div style={styles.actionRow}>
        {/* Toggle release button */}
        <button
          onClick={handleToggleRelease}
          disabled={toggling}
          style={{
            ...styles.btnRelease,
            background: isReleased ? "#1a7a45" : "#FF5C1A",
            opacity: toggling ? 0.6 : 1,
          }}
        >
          {toggling
            ? "…"
            : isReleased
              ? "🔒 Lock"
              : "🔓 Release"}
        </button>
        <button onClick={() => setEditing(true)} style={styles.btnEdit}>Edit</button>
        <button onClick={handleDelete}           style={styles.btnDelete}>Del</button>
      </div>
    </div>
  );
}

// ─── Slot add form ────────────────────────────────────────────────────────────
function SlotAddForm({ eventId, onAdded }) {
  const [form, setForm]     = useState({ name: "", time: "", capacity: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");

  const handleAdd = async () => {
    if (!form.name.trim())                           { setError("Slot name is required."); return; }
    if (!form.capacity || Number(form.capacity) < 1) { setError("Capacity must be at least 1."); return; }
    setSaving(true); setError("");
    try {
      await axios.post(
        `${API}/admin-slots`,
        { name: form.name.trim(), time: form.time.trim(), capacity: Number(form.capacity), event_id: eventId },
        { headers: adminHeader() }
      );
      setForm({ name: "", time: "", capacity: "" });
      onAdded();
    } catch (e) { setError("Failed to add slot."); }
    setSaving(false);
  };

  return (
    <div style={styles.slotAddForm}>
      {error && <p style={styles.errorText}>{error}</p>}
      <div style={styles.inlineRow}>
        <input placeholder="Slot name" value={form.name}     onChange={(e) => setForm({ ...form, name: e.target.value })}     style={{ ...styles.input, flex: 2 }} />
        <input placeholder="Time"      value={form.time}     onChange={(e) => setForm({ ...form, time: e.target.value })}     style={{ ...styles.input, flex: 2 }} />
        <input placeholder="Capacity"  value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} style={{ ...styles.input, flex: 1 }} type="number" min="1" />
        <button onClick={handleAdd} disabled={saving} style={{ ...styles.btnPrimary, whiteSpace: "nowrap" }}>
          {saving ? "Adding…" : "+ Add Slot"}
        </button>
      </div>
    </div>
  );
}

// ─── Event card ───────────────────────────────────────────────────────────────
function EventCard({ event, slots, onUpdated, onDeleted }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm]       = useState({ name: event.name, price: String(event.price) });
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState("");

  const eventSlots   = slots.filter((s) => s.event_id === event.id);
  const totalBooked  = eventSlots.reduce((a, s) => a + (s.booked_count ?? 0), 0);
  const releasedCount = eventSlots.filter((s) => s.is_released).length;

  const handleSave = async () => {
    if (!form.name.trim()) { setError("Event name is required."); return; }
    setSaving(true); setError("");
    try {
      await axios.patch(
        `${API}/admin-events`,
        { event_id: event.id, name: form.name.trim(), price: Number(form.price) || 0 },
        { headers: adminHeader() }
      );
      setEditing(false);
      onUpdated();
    } catch (e) { setError("Failed to save."); }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete event "${event.name}" and all its slots?`)) return;
    await axios.delete(`${API}/admin-events`, { headers: adminHeader(), data: { event_id: event.id } });
    onDeleted();
  };

  return (
    <div style={styles.card}>
      {editing ? (
        <div style={styles.editBlock}>
          {error && <p style={styles.errorText}>{error}</p>}
          <label style={styles.label}>Event Name</label>
          <input value={form.name}  onChange={(e) => setForm({ ...form, name: e.target.value })}  style={styles.input} />
          <label style={styles.label}>Price (₹)</label>
          <input value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} style={styles.input} type="number" min="0" />
          <div style={styles.actionRow}>
            <button onClick={handleSave} disabled={saving} style={styles.btnSave}>{saving ? "Saving…" : "Save"}</button>
            <button onClick={() => { setEditing(false); setError(""); }} style={styles.btnCancel}>Cancel</button>
          </div>
        </div>
      ) : (
        <div style={styles.eventHeader}>
          <div>
            <h2 style={styles.eventName}>{event.name}</h2>
            <div style={{ display: "flex", gap: "8px", marginTop: "4px", flexWrap: "wrap" }}>
              <span style={styles.eventPrice}>{event.price > 0 ? `₹${event.price}` : "Free"}</span>
              {eventSlots.length > 0 && (
                <span style={styles.releaseSummary}>
                  {releasedCount}/{eventSlots.length} slots released · {totalBooked} booked
                </span>
              )}
            </div>
          </div>
          <div style={styles.actionRow}>
            <button onClick={() => setEditing(true)} style={styles.btnEdit}>Edit</button>
            <button onClick={handleDelete}           style={styles.btnDelete}>Delete</button>
          </div>
        </div>
      )}

      <div style={styles.slotsSection}>
        <h4 style={styles.slotsHeading}>
          Slots <span style={styles.slotCount}>{eventSlots.length}</span>
        </h4>
        {eventSlots.length === 0 && <p style={styles.emptyNote}>No slots yet.</p>}
        {eventSlots.map((slot) => <SlotRow key={slot.id} slot={slot} onUpdated={onUpdated} />)}
        <SlotAddForm eventId={event.id} onAdded={onUpdated} />
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function AdminEvents() {
  const [events, setEvents]     = useState([]);
  const [slots, setSlots]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [newEvent, setNewEvent] = useState({ name: "", price: "" });
  const [saving, setSaving]     = useState(false);
  const [addError, setAddError] = useState("");

  const fetchAll = async () => {
    try {
      const [evRes, slRes] = await Promise.all([
        axios.get(`${API}/admin-events`, { headers: adminHeader() }),
        axios.get(`${API}/admin-slots`,  { headers: adminHeader() }),
      ]);
      setEvents(evRes.data.events || []);
      setSlots(slRes.data.slots   || []);
    } catch (err) {
      console.error("Admin fetch error:", err.response?.data || err.message);
    }
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const addEvent = async () => {
    if (!newEvent.name.trim()) { setAddError("Event name is required."); return; }
    setSaving(true); setAddError("");
    try {
      await axios.post(
        `${API}/admin-events`,
        { name: newEvent.name.trim(), price: Number(newEvent.price) || 0 },
        { headers: adminHeader() }
      );
      setNewEvent({ name: "", price: "" });
      fetchAll();
    } catch (e) { setAddError("Failed to add event."); }
    setSaving(false);
  };

  return (
    <>
      <div style={styles.page}>
        <h1 style={styles.pageTitle}>Admin Panel</h1>

        <div style={{ ...styles.card, ...styles.addCard }}>
          <h2 style={styles.sectionTitle}>Add New Event</h2>
          {addError && <p style={styles.errorText}>{addError}</p>}
          <div style={styles.inlineRow}>
            <div style={{ flex: 2 }}>
              <label style={styles.label}>Event Name *</label>
              <input placeholder="e.g. Morning Yoga" value={newEvent.name} onChange={(e) => setNewEvent({ ...newEvent, name: e.target.value })} onKeyDown={(e) => e.key === "Enter" && addEvent()} style={styles.input} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={styles.label}>Price (₹)</label>
              <input type="number" min="0" placeholder="0 = Free" value={newEvent.price} onChange={(e) => setNewEvent({ ...newEvent, price: e.target.value })} onKeyDown={(e) => e.key === "Enter" && addEvent()} style={styles.input} />
            </div>
            <div style={{ alignSelf: "flex-end", paddingBottom: "11px" }}>
              <button onClick={addEvent} disabled={saving} style={styles.btnPrimary}>{saving ? "Adding…" : "+ Add Event"}</button>
            </div>
          </div>
        </div>

        {loading ? <p style={styles.emptyNote}>Loading…</p>
          : events.length === 0
            ? <div style={styles.emptyState}><p>No events yet. Create your first event above.</p></div>
            : events.map((event) => (
              <EventCard key={event.id} event={event} slots={slots}
                onUpdated={fetchAll} onDeleted={fetchAll} />
            ))
        }
      </div>
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = {
  page:           { padding: "24px 20px", maxWidth: "780px", margin: "0 auto", fontFamily: "'Segoe UI', system-ui, sans-serif", color: "#1a1a1a" },
  pageTitle:      { fontSize: "26px", fontWeight: 700, marginBottom: "20px" },
  card:           { background: "#fff", padding: "20px", borderRadius: "12px", marginBottom: "16px", boxShadow: "0 1px 4px rgba(0,0,0,0.08)", border: "1px solid #eee" },
  addCard:        { borderLeft: "4px solid #FF5C1A" },
  sectionTitle:   { fontSize: "16px", fontWeight: 600, marginBottom: "14px", marginTop: 0 },
  eventHeader:    { display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "8px" },
  eventName:      { fontSize: "18px", fontWeight: 700, margin: "0 0 4px 0" },
  eventPrice:     { fontSize: "13px", color: "#666", background: "#f5f5f5", padding: "2px 8px", borderRadius: "4px" },
  releaseSummary: { fontSize: "12px", color: "#1a7a45", background: "#E6FFF2", padding: "2px 8px", borderRadius: "4px", fontWeight: 600 },
  editBlock:      { display: "flex", flexDirection: "column" },
  label:          { display: "block", fontSize: "12px", fontWeight: 600, color: "#555", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.04em" },
  input:          { width: "100%", padding: "9px 12px", marginBottom: "10px", borderRadius: "7px", border: "1px solid #ddd", fontSize: "14px", outline: "none", boxSizing: "border-box" },
  inlineRow:      { display: "flex", gap: "10px", alignItems: "flex-start", flexWrap: "wrap" },
  actionRow:      { display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap" },
  slotsSection:   { marginTop: "16px", borderTop: "1px solid #f0f0f0", paddingTop: "14px" },
  slotsHeading:   { fontSize: "13px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#888", margin: "0 0 10px 0", display: "flex", alignItems: "center", gap: "6px" },
  slotCount:      { background: "#FF5C1A", color: "#fff", borderRadius: "10px", fontSize: "11px", padding: "1px 6px" },
  slotRow:        { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", background: "#fafafa", borderRadius: "8px", marginBottom: "6px", gap: "8px", flexWrap: "wrap" },
  slotTime:       { fontSize: "12px", color: "#888", background: "#f0f0f0", padding: "1px 6px", borderRadius: "4px" },
  slotAddForm:    { marginTop: "10px", background: "#f7f7f7", padding: "10px", borderRadius: "8px" },
  emptyNote:      { fontSize: "13px", color: "#aaa", fontStyle: "italic", margin: "4px 0 10px" },
  emptyState:     { textAlign: "center", padding: "40px 20px", color: "#aaa", background: "#fafafa", borderRadius: "12px", border: "2px dashed #eee" },
  errorText:      { color: "#d0312d", fontSize: "13px", margin: "0 0 8px 0", background: "#fff0f0", padding: "6px 10px", borderRadius: "6px", border: "1px solid #fdd" },
  btnPrimary:     { padding: "9px 16px", background: "#FF5C1A", color: "#fff", border: "none", borderRadius: "7px", fontWeight: 600, fontSize: "14px", cursor: "pointer" },
  btnRelease:     { padding: "6px 12px", color: "#fff", border: "none", borderRadius: "6px", fontWeight: 700, fontSize: "12px", cursor: "pointer" },
  btnSave:        { padding: "6px 14px", background: "#1a8f4e", color: "#fff", border: "none", borderRadius: "6px", fontWeight: 600, fontSize: "13px", cursor: "pointer" },
  btnCancel:      { padding: "6px 12px", background: "transparent", color: "#666", border: "1px solid #ddd", borderRadius: "6px", fontSize: "13px", cursor: "pointer" },
  btnEdit:        { padding: "5px 10px", background: "transparent", color: "#FF5C1A", border: "1px solid #FF5C1A", borderRadius: "6px", fontSize: "12px", fontWeight: 600, cursor: "pointer" },
  btnDelete:      { padding: "5px 10px", background: "transparent", color: "#d0312d", border: "1px solid #d0312d", borderRadius: "6px", fontSize: "12px", fontWeight: 600, cursor: "pointer" },
};