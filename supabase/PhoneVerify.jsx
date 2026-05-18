import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const API = import.meta.env.VITE_API_URL;

export default function PhoneVerify() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState("phone");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSendOtp = async () => {
    if (!/^[6-9]\d{9}$/.test(phone)) {
      setError("Enter a valid 10-digit Indian mobile number.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await axios.post(`${API}/send-otp`, { phone });
      setStep("otp");
    } catch (err) {
      setError(err.response?.data?.error || "Failed to send OTP.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp || otp.length !== 6) {
      setError("Enter the 6-digit OTP.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await axios.post(`${API}/verify-otp`, { phone, otp });
      localStorage.setItem("userPhone", phone);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.error || "Invalid OTP.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.logo}>MALHAR</h1>
        <p style={styles.sub}>Verify your mobile number</p>

        {error && <p style={styles.error}>{error}</p>}

        {step === "phone" ? (
          <>
            <p style={styles.label}>Enter your 10-digit mobile number</p>
            <div style={styles.inputRow}>
              <span style={styles.prefix}>+91</span>
              <input
                style={styles.input}
                type="tel"
                maxLength={10}
                placeholder="9876543210"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
              />
            </div>
            <button
              style={styles.btn}
              onClick={handleSendOtp}
              disabled={loading}
            >
              {loading ? "Sending..." : "Send OTP"}
            </button>
          </>
        ) : (
          <>
            <p style={styles.label}>OTP sent to +91 {phone}</p>
            <input
              style={{ ...styles.input, width: "100%", textAlign: "center", letterSpacing: 8, fontSize: 24 }}
              type="tel"
              maxLength={6}
              placeholder="······"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
            />
            <button
              style={styles.btn}
              onClick={handleVerifyOtp}
              disabled={loading}
            >
              {loading ? "Verifying..." : "Verify OTP"}
            </button>
            <p
              style={{ color: "#FF5C1A", cursor: "pointer", marginTop: 12, fontSize: 14 }}
              onClick={() => { setStep("phone"); setOtp(""); setError(""); }}
            >
              Change number
            </p>
          </>
        )}
      </div>
    </div>
  );
}

const styles = {
  page: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#fafafa" },
  card: { background: "#fff", borderRadius: 16, padding: 40, width: 360, boxShadow: "0 4px 24px rgba(0,0,0,0.08)", textAlign: "center" },
  logo: { fontFamily: "Bebas Neue, sans-serif", fontSize: 48, color: "#1A0A00", margin: 0 },
  sub: { color: "#666", fontSize: 14, marginBottom: 24 },
  error: { color: "#d0312d", fontSize: 14, marginBottom: 16 },
  label: { color: "#333", fontSize: 14, marginBottom: 12, textAlign: "left" },
  inputRow: { display: "flex", alignItems: "center", border: "1px solid #ddd", borderRadius: 8, marginBottom: 16, overflow: "hidden" },
  prefix: { padding: "12px 12px", background: "#f5f5f5", color: "#333", fontSize: 16, borderRight: "1px solid #ddd" },
  input: { border: "none", outline: "none", padding: "12px", fontSize: 16, flex: 1 },
  btn: { width: "100%", padding: "12px", background: "#FF5C1A", color: "#fff", border: "none", borderRadius: 8, fontSize: 16, fontWeight: 700, cursor: "pointer" },
};