import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setError("Please fill in all fields.");
      return;
    }

    setLoading(true);
    setError("");

    // Email + password both sent to backend. Backend verifies password AND
    // checks the email against admins table before issuing the JWT.
    // This fixes the race condition where a token was issued before the
    // client-side DB check — the token is now ONLY issued if the email is valid.
    try {
      const { data } = await axios.post(`${import.meta.env.VITE_BACKEND_URL}/admin-login`, {
        email: email.trim().toLowerCase(),
        password,
      });

      localStorage.setItem("adminToken", data.token);
      localStorage.setItem("admin", JSON.stringify(data.admin));
      navigate("/admin");
    } catch (err) {
      setError(err?.response?.data?.error || "Login failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      {/* ── Hero ── */}
      <div style={styles.hero}>
        <div style={styles.badge}>Admin</div>
        <h1 style={styles.title}>Admin Login</h1>
        <p style={styles.subtitle}>Restricted access. Authorised personnel only.</p>
      </div>

      {/* ── Form ── */}
      <div style={styles.card}>
        {error && <div style={styles.errorBox}>{error}</div>}

        <label style={styles.label} htmlFor="admin-email">Email Address</label>
        <input
          id="admin-email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => { setEmail(e.target.value); if (error) setError(""); }}
          onKeyDown={(e) => e.key === "Enter" && handleLogin()}
          style={styles.input}
          autoComplete="email"
          autoFocus
        />

        <label style={styles.label} htmlFor="admin-password">Password</label>
        <div style={styles.inputWrapper}>
          <input
            id="admin-password"
            type={showPassword ? "text" : "password"}
            placeholder="Enter password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); if (error) setError(""); }}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            style={{ ...styles.input, marginBottom: 0, paddingRight: "40px" }}
          />
          <button
            onClick={() => setShowPassword((v) => !v)}
            style={styles.eyeBtn}
            tabIndex={-1}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? "🙈" : "👁️"}
          </button>
        </div>

        <button
          onClick={handleLogin}
          disabled={loading}
          style={{ ...styles.btn, marginTop: "16px", opacity: loading ? 0.7 : 1 }}
        >
          {loading ? "Checking…" : "Login"}
        </button>
      </div>
    </div>
  );
}

const styles = {
  page: {
    padding: "24px 20px",
    maxWidth: "420px",
    margin: "0 auto",
    fontFamily: "'Segoe UI', system-ui, sans-serif",
    color: "#1a1a1a",
  },
  hero: {
    background: "#1A0A00",
    borderRadius: "16px",
    padding: "28px 24px",
    marginBottom: "16px",
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
    color: "rgba(255,255,255,0.4)",
    fontSize: "13px",
    margin: 0,
  },
  card: {
    background: "#fff",
    padding: "20px",
    borderRadius: "12px",
    border: "1px solid #eee",
    boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
  },
  label: {
    display: "block",
    fontSize: "12px",
    fontWeight: 700,
    color: "#555",
    marginBottom: "6px",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  },
  input: {
    width: "100%",
    padding: "10px 12px",
    marginBottom: "14px",
    borderRadius: "8px",
    border: "1px solid #ddd",
    fontSize: "14px",
    outline: "none",
    boxSizing: "border-box",
  },
  inputWrapper: {
    position: "relative",
  },
  eyeBtn: {
    position: "absolute",
    right: "10px",
    top: "50%",
    transform: "translateY(-50%)",
    background: "none",
    border: "none",
    cursor: "pointer",
    fontSize: "16px",
    padding: 0,
    lineHeight: 1,
  },
  btn: {
    width: "100%",
    padding: "12px",
    background: "#FF5C1A",
    color: "white",
    border: "none",
    borderRadius: "8px",
    fontWeight: 700,
    fontSize: "15px",
    cursor: "pointer",
  },
  errorBox: {
    background: "#fff0f0",
    border: "1px solid #fdd",
    color: "#d0312d",
    fontSize: "13px",
    padding: "8px 12px",
    borderRadius: "7px",
    marginBottom: "14px",
  },
};