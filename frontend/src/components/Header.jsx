import { useNavigate, useLocation } from "react-router-dom";

// Admin/scanner paths — Header never shows nav buttons on these
const ADMIN_PATHS = ["/admin", "/admin-login", "/scanner", "/scanner-login"];

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();

  // Never show nav links on admin or scanner pages
  const isAdminOrScanner = ADMIN_PATHS.includes(location.pathname);

  const navItems = [
    { label: "Events",     path: "/events" },
    { label: "My Ticket",  path: "/ticket" },
  ];

  return (
    <div style={{
      background: "#1A0A00",
      color: "#FFF8F0",
      padding: "14px 24px",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      position: "sticky",
      top: 0,
      zIndex: 100,
      boxShadow: "0 2px 12px rgba(0,0,0,0.4)",
    }}>
      {/* Logo */}
      <div style={{ cursor: "pointer" }} onClick={() => navigate("/")}>
        <h1 style={{
          fontFamily: "'Bebas Neue', sans-serif",
          color: "#FF5C1A",
          letterSpacing: "3px",
          fontSize: "28px",
          margin: 0,
          lineHeight: 1,
        }}>
          MALHAR
        </h1>
        <p style={{ fontSize: "10px", opacity: 0.5, margin: 0, letterSpacing: "0.05em" }}>
          St. Xavier's College
        </p>
      </div>

      {/* Nav buttons — hidden on admin/scanner pages */}
      {!isAdminOrScanner && (
        <div style={{ display: "flex", gap: "8px" }}>
          {navItems.map(({ label, path }) => {
            const isActive = location.pathname === path;
            return (
              <button
                key={path}
                onClick={() => navigate(path)}
                style={{
                  background: isActive ? "#FF5C1A" : "transparent",
                  color: isActive ? "#fff" : "rgba(255,248,240,0.7)",
                  border: isActive ? "1px solid #FF5C1A" : "1px solid rgba(255,255,255,0.15)",
                  borderRadius: "8px",
                  padding: "7px 14px",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  letterSpacing: "0.02em",
                  whiteSpace: "nowrap",
                }}
                onMouseEnter={e => {
                  if (!isActive) {
                    e.target.style.background = "rgba(255,92,26,0.15)";
                    e.target.style.color = "#FF5C1A";
                    e.target.style.borderColor = "rgba(255,92,26,0.4)";
                  }
                }}
                onMouseLeave={e => {
                  if (!isActive) {
                    e.target.style.background = "transparent";
                    e.target.style.color = "rgba(255,248,240,0.7)";
                    e.target.style.borderColor = "rgba(255,255,255,0.15)";
                  }
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}