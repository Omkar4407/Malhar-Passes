import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { lsCached } from "../lib/cache";
import { TICKETS_TTL, ticketsCacheKey } from "../lib/tickets";
import TicketCard from "./TicketCard";

const API = import.meta.env.VITE_BACKEND_URL;

function authHeader() {
  return { Authorization: `Bearer ${localStorage.getItem("userToken")}` };
}

export default function MyTicketsList({ compact = false }) {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [phoneRequired, setPhoneRequired] = useState(false);

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    setLoading(true);
    setError("");
    setPhoneRequired(false);
    try {
      const list = await lsCached(ticketsCacheKey(), TICKETS_TTL, async () => {
        const { data } = await axios.get(`${API}/my-tickets`, { headers: authHeader() });
        return data.tickets || [];
      });
      setTickets(list);
    } catch (err) {
      console.error("Tickets fetch error:", err);
      if (err.response?.status === 401) {
        localStorage.removeItem("userToken");
        localStorage.removeItem("userPhone");
        navigate("/", { replace: true });
      } else if (err.response?.status === 403 && err.response?.data?.code === "PHONE_REQUIRED") {
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
    <div style={compact ? undefined : { marginTop: "8px" }}>
      {!compact && (
        <div style={styles.titleRow}>
          <h2 style={styles.sectionTitle}>My Tickets</h2>
          {!loading && tickets.length > 0 && (
            <span style={styles.count}>
              {tickets.length} ticket{tickets.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      )}

      {error && (
        <div style={styles.errorWrap}>
          <div style={styles.errorBox}>{error}</div>
          {phoneRequired && (
            <button type="button" onClick={() => navigate("/")} style={styles.verifyLinkBtn}>
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
          <button type="button" onClick={() => navigate("/events")} style={styles.bookBtn}>
            Browse Events →
          </button>
        </div>
      )}

      {tickets.map((ticket) => (
        <TicketCard key={ticket.id} ticket={ticket} />
      ))}
    </div>
  );
}

const styles = {
  titleRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "14px",
  },
  sectionTitle: {
    fontSize: "18px",
    fontWeight: 800,
    margin: 0,
    letterSpacing: "-0.02em",
  },
  count: {
    fontSize: "12px",
    fontWeight: 600,
    color: "#aaa",
    background: "#f5f5f5",
    padding: "3px 10px",
    borderRadius: "20px",
  },
  emptyState: {
    textAlign: "center",
    padding: "32px 20px",
    background: "#fafafa",
    borderRadius: "12px",
    border: "2px dashed #eee",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "10px",
  },
  emptyIcon: { fontSize: "32px" },
  emptyText: { color: "#aaa", fontSize: "14px", margin: 0 },
  bookBtn: {
    marginTop: "4px",
    padding: "10px 20px",
    background: "#FF5C1A",
    color: "white",
    border: "none",
    borderRadius: "8px",
    fontWeight: 700,
    fontSize: "14px",
    cursor: "pointer",
  },
  errorWrap: { marginBottom: "14px", display: "flex", flexDirection: "column", gap: "10px" },
  errorBox: {
    background: "#fff0f0",
    border: "1px solid #fdd",
    color: "#d0312d",
    fontSize: "13px",
    padding: "8px 12px",
    borderRadius: "7px",
  },
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
