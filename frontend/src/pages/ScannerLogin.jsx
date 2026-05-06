import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import axios from "axios";

export default function ScannerLogin() {
  const navigate = useNavigate();

  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError("");
    const { email, password } = form;

    if (!email || !password) {
      setError("Please fill in all fields.");
      return;
    }

    setLoading(true);

    // Email + password both sent to backend. Backend verifies password AND
    // checks the email against admins table (role=admin) before issuing JWT.
    // This fixes the previous race condition where the token was issued
    // before the client-side email check.
    try {
      const { data } = await axios.post(`${import.meta.env.VITE_BACKEND_URL}/scanner-login`, {
        email: email.trim().toLowerCase(),
        password,
      });

      localStorage.setItem("scannerToken", data.token);
      localStorage.setItem("scannerAuth", "true");
      localStorage.setItem("scannerEmail", data.admin.email);
      navigate("/scanner");
    } catch (err) {
      setError(err?.response?.data?.error || "Access denied. Check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === "Enter") handleLogin();
  };

  return (
    <>
      <Header />
      <div style={styles.page}>

        {/* Card */}
        <div style={styles.card}>

          {/* Icon */}
          <div style={styles.iconWrap}>
            <span style={{ fontSize: "32px" }}>📷</span>
          </div>

          <h1 style={styles.title}>Scanner Access</h1>
          <p style={styles.subtitle}>Admin credentials required</p>

          {/* Error */}
          {error && (
            <div style={styles.errorBox}>
              <span>⚠️</span> {error}
            </div>
          )}

          {/* Fields */}
          <div style={styles.fields}>
            <Field
              label="Admin Email"
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={(v) => setForm({ ...form, email: v })}
              onKeyDown={handleKey}
            />
            <Field
              label="Password"
              type="password"
              placeholder="Enter scanner password"
              value={form.password}
              onChange={(v) => setForm({ ...form, password: v })}
              onKeyDown={handleKey}
            />
          </div>

          {/* Submit */}
          <button
            onClick={handleLogin}
            disabled={loading}
            style={{ ...styles.btn, opacity: loading ? 0.7 : 1 }}
          >
            {loading ? "Verifying…" : "Access Scanner →"}
          </button>

        </div>

        <p style={styles.note}>
          🔒 Only authorized admins can access the scanner.
        </p>
      </div>
    </>
  );
}

// ── Reusable field ────────────────────────────────────────
function Field({ label, type, placeholder, value, onChange, onKeyDown }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={styles.fieldWrap}>
      <label style={styles.label}>{label}</label>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onKeyDown={onKeyDown}
        style={{
          ...styles.input,
          borderColor: focused ? "#FF5C1A" : "#e0e0e0",
          boxShadow: focused ? "0 0 0 3px rgba(255,92,26,0.12)" : "none",
        }}
      />
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────
const styles = {
  page: {
    minHeight: "calc(100vh - 70px)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px 20px",
    background: "#fafafa",
    fontFamily: "'Segoe UI', system-ui, sans-serif",
  },
  card: {
    background: "#fff",
    borderRadius: "20px",
    padding: "36px 32px",
    width: "100%",
    maxWidth: "400px",
    boxShadow: "0 8px 32px rgba(0,0,0,0.10)",
    border: "1px solid #f0f0f0",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "8px",
  },
  iconWrap: {
    width: "68px",
    height: "68px",
    borderRadius: "20px",
    background: "#1A0A00",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: "4px",
  },
  title: {
    fontSize: "22px",
    fontWeight: 800,
    color: "#1a1a1a",
    margin: 0,
    letterSpacing: "-0.02em",
  },
  subtitle: {
    fontSize: "13px",
    color: "#aaa",
    margin: "0 0 8px",
  },
  errorBox: {
    width: "100%",
    background: "#fff0f0",
    border: "1px solid #fdd",
    color: "#d0312d",
    fontSize: "13px",
    fontWeight: 600,
    padding: "10px 14px",
    borderRadius: "10px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    boxSizing: "border-box",
  },
  fields: {
    width: "100%",
    display: "flex",
    flexDirection: "column",
    gap: "14px",
    marginTop: "8px",
  },
  fieldWrap: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    width: "100%",
  },
  label: {
    fontSize: "12px",
    fontWeight: 700,
    color: "#555",
    letterSpacing: "0.04em",
    textTransform: "uppercase",
  },
  input: {
    width: "100%",
    padding: "11px 14px",
    fontSize: "14px",
    border: "1.5px solid #e0e0e0",
    borderRadius: "10px",
    outline: "none",
    transition: "border-color 0.15s, box-shadow 0.15s",
    boxSizing: "border-box",
    color: "#1a1a1a",
    background: "#fff",
    fontFamily: "'Segoe UI', system-ui, sans-serif",
  },
  btn: {
    width: "100%",
    padding: "13px",
    marginTop: "8px",
    background: "#FF5C1A",
    color: "#fff",
    border: "none",
    borderRadius: "12px",
    fontSize: "15px",
    fontWeight: 700,
    cursor: "pointer",
    letterSpacing: "0.02em",
    transition: "opacity 0.15s",
  },
  note: {
    marginTop: "20px",
    fontSize: "12px",
    color: "#bbb",
    textAlign: "center",
  },
};