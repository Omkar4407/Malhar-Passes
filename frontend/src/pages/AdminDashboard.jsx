import { useNavigate } from "react-router-dom";

export default function AdminDashboard() {
  const navigate = useNavigate();

  return (
    <div style={styles.page}>
      {/* ── Hero ── */}
      <div style={styles.hero}>
        <div style={styles.badge}>Admin</div>
        <h1 style={styles.title}>Admin Panel</h1>
        <p style={styles.subtitle}>Manage your events, slots, and scan entries.</p>
      </div>

      {/* ── Actions ── */}
      <div style={styles.grid}>
        <button style={styles.actionCard} onClick={() => navigate("/scanner")}>
          <span style={styles.actionIcon}>📷</span>
          <div style={styles.actionText}>
            <span style={styles.actionLabel}>Open Scanner</span>
            <span style={styles.actionDesc}>Scan attendee QR codes at the door</span>
          </div>
          <span style={styles.actionArrow}>→</span>
        </button>

        <button style={styles.actionCard} onClick={() => navigate("/admin-events")}>
          <span style={styles.actionIcon}>🗓️</span>
          <div style={styles.actionText}>
            <span style={styles.actionLabel}>Manage Events</span>
            <span style={styles.actionDesc}>Create, edit, and organise event slots</span>
          </div>
          <span style={styles.actionArrow}>→</span>
        </button>
      </div>
    </div>
  );
}

const styles = {
  page: {
    padding: "24px 20px",
    maxWidth: "520px",
    margin: "0 auto",
    fontFamily: "'Segoe UI', system-ui, sans-serif",
    color: "#1a1a1a",
  },
  hero: {
    background: "#1A0A00",
    borderRadius: "16px",
    padding: "28px 24px",
    marginBottom: "20px",
  },
  badge: {
    display: "inline-block",
    background: "rgba(255,92,26,0.2)",
    color: "#FF5C1A",
    fontSize: "11px",
    fontWeight: 700,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    padding: "3px 10px",
    borderRadius: "20px",
    border: "1px solid rgba(255,92,26,0.35)",
    marginBottom: "10px",
  },
  title: {
    color: "#FF5C1A",
    fontSize: "28px",
    fontWeight: 800,
    margin: "0 0 6px 0",
    letterSpacing: "-0.02em",
  },
  subtitle: {
    color: "rgba(255,255,255,0.5)",
    fontSize: "14px",
    margin: 0,
  },
  grid: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  actionCard: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    gap: "14px",
    width: "100%",
    padding: "16px 18px",
    background: "#fff",
    border: "1px solid #eee",
    borderRadius: "12px",
    cursor: "pointer",
    textAlign: "left",
    boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
    boxSizing: "border-box",
  },
  actionIcon: {
    fontSize: "22px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#fff5f0",
    borderRadius: "10px",
    width: "44px",
    height: "44px",
    flexShrink: 0,
  },
  actionText: {
    display: "flex",
    flexDirection: "column",
    gap: "3px",
    flex: 1,
    minWidth: 0,
  },
  actionLabel: {
    fontWeight: 700,
    fontSize: "15px",
    color: "#1a1a1a",
  },
  actionDesc: {
    fontSize: "12px",
    color: "#999",
  },
  actionArrow: {
    color: "#FF5C1A",
    fontSize: "18px",
    fontWeight: 700,
    flexShrink: 0,
  },
};