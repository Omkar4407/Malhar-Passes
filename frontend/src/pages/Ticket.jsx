import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import QRCode from "qrcode";
import Menu from "../components/Menu";
import Header from "../components/Header";

const API = import.meta.env.VITE_BACKEND_URL;

function authHeader() {
  return { Authorization: `Bearer ${localStorage.getItem("userToken")}` };
}

// No-op — kept so Booking.jsx import doesn't break
export function bustTicketsCache() {}

export default function Ticket() {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");
  const [phoneRequired, setPhoneRequired] = useState(false);

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    setLoading(true);
    setError("");
    setPhoneRequired(false);
    try {
      // Call backend /my-tickets — uses service-role key server-side,
      // so Supabase RLS on the tickets table never blocks this read.
      const { data } = await axios.get(`${API}/my-tickets`, {
        headers: authHeader(),
      });
      setTickets(data.tickets || []);
    } catch (err) {
      console.error("Tickets fetch error:", err);
      if (err.response?.status === 401) {
        localStorage.removeItem("userToken");
        localStorage.removeItem("userPhone");
        navigate("/", { replace: true });
      } else if (
        err.response?.status === 403 &&
        err.response?.data?.code === "PHONE_REQUIRED"
      ) {
        setPhoneRequired(true);
        setError("Verify your phone number to view tickets.");
      } else {
        setError("Failed to load tickets. Please refresh.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Menu />
      <Header />
      <div style={styles.page}>

        <div style={styles.titleRow}>
          <h1 style={styles.pageTitle}>My Tickets</h1>
          {!loading && tickets.length > 0 && (
            <span style={styles.count}>
              {tickets.length} ticket{tickets.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {error && (
          <div style={styles.errorWrap}>
            <div style={styles.errorBox}>{error}</div>
            {phoneRequired && (
              <button
                type="button"
                onClick={() => navigate("/")}
                style={styles.verifyLinkBtn}
              >
                Verify phone on Login →
              </button>
            )}
          </div>
        )}

        {loading && (
          <div style={styles.emptyState}>
            <p style={styles.emptyText}>Loading tickets…</p>
          </div>
        )}

        {!loading && tickets.length === 0 && !error && (
          <div style={styles.emptyState}>
            <span style={styles.emptyIcon}>🎟️</span>
            <p style={styles.emptyText}>No tickets yet. Book an event to get started!</p>
            <button onClick={() => navigate("/events")} style={styles.bookBtn}>
              Browse Events →
            </button>
          </div>
        )}

        {tickets.map((ticket) => (
          <TicketCard key={ticket.id} ticket={ticket} />
        ))}
      </div>
    </>
  );
}

function TicketCard({ ticket }) {
  const [qr, setQr]             = useState("");
  const [qrError, setQrError]   = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    QRCode.toDataURL(
      JSON.stringify({ ticket_id: ticket.id }),
      { width: 200, margin: 2 }
    )
      .then(setQr)
      .catch(() => setQrError(true));
  }, [ticket.id]);

  const isPaid      = ticket.payment_status === "paid";
  const isRejected  = ticket.rejected === true;
  const isCheckedIn = ticket.checked_in === true;

  return (
    <div style={styles.ticketCard}>
      <div style={styles.topBand}>
        <div>
          <p style={styles.bandLabel}>Event</p>
          <h2 style={styles.bandTitle}>{ticket.slots?.events?.name || "MALHAR"}</h2>
        </div>
        <span style={{
          ...styles.statusBadge,
          background: isRejected ? "#fff0f0" : isCheckedIn ? "#E6FFF2" : "#FFF3E0",
          color: isRejected ? "#d0312d" : isCheckedIn ? "#1a7a45" : "#b45309",
        }}>
          {isRejected ? "🚫 Rejected" : isCheckedIn ? "✓ Checked In" : "Not Checked In"}
        </span>
      </div>

      <div style={styles.perforate} />

      <div style={styles.body}>
        <div style={styles.profileRow}>
          {ticket.photo_url ? (
            <img
              src={ticket.photo_url}
              alt={ticket.name}
              style={styles.photo}
              onError={(e) => { e.target.style.display = "none"; }}
            />
          ) : (
            <div style={styles.photoPlaceholder}>
              {ticket.name?.[0]?.toUpperCase() || "?"}
            </div>
          )}
          <div style={styles.profileInfo}>
            <p style={styles.name}>{ticket.name}</p>
            <p style={styles.detail}>{ticket.college}</p>
            <p style={styles.detail}>{ticket.phone}</p>
          </div>
        </div>

        {ticket.slots && (
          <div style={styles.slotRow}>
            {ticket.slots.name  && <InfoChip icon="🎪" text={ticket.slots.name} />}
            {ticket.slots.date  && <InfoChip icon="📅" text={ticket.slots.date} />}
            {ticket.slots.time  && <InfoChip icon="🕐" text={ticket.slots.time} />}
          </div>
        )}

        {isPaid && (
          <span style={{ ...styles.paymentBadge, background: "#E6FFF2", color: "#1a7a45" }}>
            ✓ Payment Confirmed
          </span>
        )}

        <button onClick={() => setExpanded((v) => !v)} style={styles.qrToggle}>
          {expanded ? "Hide QR Code ▲" : "Show QR Code ▼"}
        </button>

        {expanded && (
          <div style={styles.qrSection}>
            {qrError
              ? <p style={{ color: "#d0312d", fontSize: "13px" }}>Failed to generate QR.</p>
              : qr
                ? <>
                    <img src={qr} alt="QR Code" style={styles.qrImg} />
                    <a
                      href={qr}
                      download={`ticket-${ticket.id}.png`}
                      style={styles.downloadBtn}
                    >
                      ⬇ Download QR
                    </a>
                  </>
                : <p style={{ color: "#aaa", fontSize: "13px" }}>Generating…</p>
            }
            <p style={styles.ticketId}>ID: {ticket.id}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function InfoChip({ icon, text }) {
  return (
    <span style={{ fontSize: "12px", background: "#f5f5f5", color: "#444", padding: "3px 10px", borderRadius: "20px", display: "inline-flex", alignItems: "center", gap: "4px" }}>
      {icon} {text}
    </span>
  );
}

const styles = {
  page: { padding: "20px", maxWidth: "560px", margin: "0 auto", fontFamily: "'Segoe UI', system-ui, sans-serif", color: "#1a1a1a" },
  titleRow: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" },
  pageTitle: { fontSize: "22px", fontWeight: 800, margin: 0, letterSpacing: "-0.02em" },
  count: { fontSize: "12px", fontWeight: 600, color: "#aaa", background: "#f5f5f5", padding: "3px 10px", borderRadius: "20px" },
  ticketCard: { background: "#1A0A00", borderRadius: "16px", marginBottom: "20px", overflow: "hidden", boxShadow: "0 4px 16px rgba(0,0,0,0.15)" },
  topBand: { padding: "18px 20px 14px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" },
  bandLabel: { color: "#aaa", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 4px" },
  bandTitle: { color: "#FF5C1A", fontSize: "20px", fontWeight: 900, margin: 0, letterSpacing: "0.04em" },
  statusBadge: { fontSize: "11px", fontWeight: 700, padding: "3px 10px", borderRadius: "20px", alignSelf: "flex-start" },
  perforate: { borderTop: "2px dashed rgba(255,255,255,0.15)", margin: "0 16px" },
  body: { background: "#fff", padding: "18px 20px", display: "flex", flexDirection: "column", gap: "14px" },
  profileRow: { display: "flex", gap: "14px", alignItems: "center" },
  photo: { width: "56px", height: "56px", borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: "2px solid #eee" },
  photoPlaceholder: { width: "56px", height: "56px", borderRadius: "50%", background: "#FF5C1A", color: "white", fontWeight: 800, fontSize: "22px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  profileInfo: { display: "flex", flexDirection: "column", gap: "2px" },
  name: { fontSize: "16px", fontWeight: 700, margin: 0 },
  detail: { fontSize: "13px", color: "#666", margin: 0 },
  slotRow: { display: "flex", gap: "8px", flexWrap: "wrap" },
  paymentBadge: { fontSize: "12px", fontWeight: 700, padding: "4px 12px", borderRadius: "20px", alignSelf: "flex-start" },
  qrToggle: { background: "none", border: "1px solid #eee", borderRadius: "8px", padding: "8px 14px", fontSize: "13px", fontWeight: 600, color: "#FF5C1A", cursor: "pointer", textAlign: "center" },
  qrSection: { display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", padding: "8px 0" },
  qrImg: { width: "180px", height: "180px", borderRadius: "8px", border: "1px solid #eee" },
  downloadBtn: { display: "inline-block", padding: "8px 20px", background: "#FF5C1A", color: "white", borderRadius: "8px", fontSize: "13px", fontWeight: 700, textDecoration: "none", textAlign: "center" },
  ticketId: { fontSize: "10px", color: "#bbb", fontFamily: "monospace", margin: 0 },
  emptyState: { textAlign: "center", padding: "48px 20px", background: "#fafafa", borderRadius: "12px", border: "2px dashed #eee", display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" },
  emptyIcon: { fontSize: "36px" },
  emptyText: { color: "#aaa", fontSize: "14px", margin: 0 },
  bookBtn: { marginTop: "4px", padding: "10px 20px", background: "#FF5C1A", color: "white", border: "none", borderRadius: "8px", fontWeight: 700, fontSize: "14px", cursor: "pointer" },
  errorWrap: { marginBottom: "14px", display: "flex", flexDirection: "column", gap: "10px" },
  errorBox: { background: "#fff0f0", border: "1px solid #fdd", color: "#d0312d", fontSize: "13px", padding: "8px 12px", borderRadius: "7px" },
  verifyLinkBtn: {
    alignSelf: "flex-start",
    padding: "8px 14px",
    background: "#FF5C1A",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    fontWeight: 700,
    fontSize: "13px",
    cursor: "pointer",
  },
};