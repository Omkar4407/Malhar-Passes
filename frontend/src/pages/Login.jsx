import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { GoogleLogin } from "@react-oauth/google";
import Menu from "../components/Menu";

const API = import.meta.env.VITE_BACKEND_URL;
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("userToken");
    if (!token) return;
    axios
      .post(`${API}/verify-token`, { token })
      .then(({ data }) => {
        if (data.valid && data.payload?.role === "user") {
          navigate("/dashboard", { replace: true });
        }
      })
      .catch(() => {
        localStorage.removeItem("userToken");
        localStorage.removeItem("userPhone");
      });
  }, [navigate]);

  const handleGoogleSuccess = async (credentialResponse) => {
    setError("");
    setLoading(true);
    try {
      const { data } = await axios.post(`${API}/google-auth`, {
        credential: credentialResponse.credential,
      });
      localStorage.setItem("userToken", data.token);
      localStorage.removeItem("userPhone");
      navigate("/dashboard");
    } catch (err) {
      const msg = err.response?.data?.error;
      setError(msg || "Google sign-in failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Menu />
      <div style={styles.page}>
        <div style={styles.hero}>
          <h1 style={styles.title}>MALHAR</h1>
          <p style={styles.subtitle}>Sign in with Google to continue</p>
        </div>

        <div style={styles.card}>
          {error && <div style={styles.errorBox}>{error}</div>}

          {GOOGLE_CLIENT_ID ? (
            <div style={styles.googleWrap}>
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => setError("Google sign-in failed.")}
              />
            </div>
          ) : (
            <p style={styles.configHint}>
              Google sign-in is not configured. Set VITE_GOOGLE_CLIENT_ID in your environment.
            </p>
          )}

          {loading && <p style={styles.loadingHint}>Signing you in…</p>}
        </div>
      </div>
    </>
  );
}

const styles = {
  page: {
    padding: "20px",
    maxWidth: "400px",
    margin: "0 auto",
    fontFamily: "'Segoe UI', system-ui, sans-serif",
  },
  hero: {
    background: "#1A0A00",
    color: "white",
    padding: "28px 20px",
    borderRadius: "12px",
    marginBottom: "20px",
    textAlign: "center",
  },
  title: {
    color: "#FF5C1A",
    fontSize: "32px",
    fontWeight: 900,
    margin: "0 0 6px",
    letterSpacing: "0.06em",
  },
  subtitle: { color: "#aaa", fontSize: "14px", margin: 0 },
  card: {
    background: "#fff",
    padding: "24px 20px",
    borderRadius: "12px",
    border: "1px solid #eee",
    boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "12px",
  },
  googleWrap: {
    display: "flex",
    justifyContent: "center",
    width: "100%",
  },
  errorBox: {
    width: "100%",
    background: "#fff0f0",
    border: "1px solid #fdd",
    color: "#d0312d",
    fontSize: "13px",
    padding: "8px 12px",
    borderRadius: "7px",
    boxSizing: "border-box",
  },
  configHint: {
    fontSize: "13px",
    color: "#666",
    textAlign: "center",
    margin: 0,
  },
  loadingHint: {
    fontSize: "13px",
    color: "#888",
    margin: 0,
  },
};
