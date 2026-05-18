import { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import Menu from "../components/Menu";
import { bustSlotsCache } from "./Events";
import { bustTicketsCache } from "./Ticket";

const API = import.meta.env.VITE_BACKEND_URL;
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_SIZE_BYTES = 5 * 1024 * 1024;

const sanitizePhone = (val) => val.replace(/\D/g, "").slice(0, 10);
const sanitizeOtp = (val) => val.replace(/\D/g, "").slice(0, 6);
const isValidPhone = (p) => /^[6-9]\d{9}$/.test(p);
const isValidOtp = (o) => /^\d{4,6}$/.test(o);

function authHeader() {
  const token = localStorage.getItem("userToken");
  return { Authorization: `Bearer ${token}` };
}

function loadCashfreeSDK() {
  return new Promise((resolve, reject) => {
    if (window.Cashfree) return resolve(window.Cashfree);
    const script = document.createElement("script");
    script.src = "https://sdk.cashfree.com/js/v3/cashfree.js";
    script.onload = () => resolve(window.Cashfree);
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

export default function Booking() {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpStep, setOtpStep] = useState(1);
  const [otpLoading, setOtpLoading] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);
  const [devOtp, setDevOtp] = useState(null);
  const countdownRef = useRef(null);

  const [name, setName] = useState("");
  const [college, setCollege] = useState("");
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoUrl, setPhotoUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [phoneVerified, setPhoneVerified] = useState(null);

  const navigate = useNavigate();
  const location = useLocation();
  const slot = location.state?.slot;
  const event = location.state?.event;

  const startResendCooldown = () => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    setResendCountdown(30);
    countdownRef.current = setInterval(() => {
      setResendCountdown((v) => {
        if (v <= 1) {
          clearInterval(countdownRef.current);
          return 0;
        }
        return v - 1;
      });
    }, 1000);
  };

  useEffect(() => () => {
    if (countdownRef.current) clearInterval(countdownRef.current);
  }, []);

  useEffect(() => {
    if (!slot || !event) return;
    const token = localStorage.getItem("userToken");
    if (!token) {
      setPhoneVerified(false);
      return;
    }
    const stored = localStorage.getItem("userPhone");
    if (stored) setPhone(stored);

    axios
      .post(`${API}/verify-token`, { token })
      .then(({ data }) => {
        const verified = Boolean(data.valid && data.payload?.phone);
        setPhoneVerified(verified);
        if (verified && data.payload?.phone) {
          setPhone(data.payload.phone);
          localStorage.setItem("userPhone", data.payload.phone);
        }
      })
      .catch(() => setPhoneVerified(false));
  }, [slot, event]);

  const sendOtp = async () => {
    setError("");
    const cleanPhone = sanitizePhone(phone);
    if (!isValidPhone(cleanPhone)) {
      setError("Enter a valid 10-digit Indian mobile number.");
      return;
    }
    setOtpLoading(true);
    try {
      const { data } = await axios.post(`${API}/send-otp`, { phone: cleanPhone });
      setPhone(cleanPhone);
      setDevOtp(data.dev_otp || null);
      setOtpStep(2);
      setOtp("");
      startResendCooldown();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to send OTP. Please try again.");
    } finally {
      setOtpLoading(false);
    }
  };

  const resendOtp = async () => {
    if (resendCountdown > 0 || otpLoading) return;
    setOtp("");
    setError("");
    setOtpLoading(true);
    try {
      const { data } = await axios.post(`${API}/send-otp`, { phone });
      setDevOtp(data.dev_otp || null);
      startResendCooldown();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to resend OTP.");
    } finally {
      setOtpLoading(false);
    }
  };

  const verifyOtp = async () => {
    setError("");
    const cleanOtp = sanitizeOtp(otp);
    if (!isValidOtp(cleanOtp)) {
      setError("Enter the 6-digit OTP sent to your number.");
      return;
    }
    setOtpLoading(true);
    try {
      const token = localStorage.getItem("userToken");
      const { data } = await axios.post(
        `${API}/verify-otp`,
        { phone, otp: cleanOtp },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      localStorage.setItem("userToken", data.token);
      localStorage.setItem("userPhone", phone);
      axios.defaults.headers.common["Authorization"] = `Bearer ${data.token}`;
      setPhoneVerified(true);
      setOtpStep(1);
      setOtp("");
    } catch (err) {
      setError(err.response?.data?.error || "Verification failed. Please try again.");
    } finally {
      setOtpLoading(false);
    }
  };

  const handleOtpBack = () => {
    setOtpStep(1);
    setOtp("");
    if (countdownRef.current) clearInterval(countdownRef.current);
    setResendCountdown(0);
  };

  if (!slot || !event) {
    return (
      <>
        <Menu />
        <div style={styles.page}>
          <div style={styles.errorBox}>
            Invalid booking session. Please go back and select an event.
          </div>
          <button
            type="button"
            style={styles.backLink}
            onClick={() => navigate("/events")}
          >
            ← Back to events
          </button>
        </div>
      </>
    );
  }

  if (phoneVerified === null) {
    return (
      <>
        <Menu />
        <div style={styles.page}>
          <p style={{ textAlign: "center", color: "#888" }}>Loading…</p>
        </div>
      </>
    );
  }

  const validate = () => {
    if (!phoneVerified) return "Verify your mobile number above to continue.";
    if (!name.trim()) return "Please enter your name.";
    if (name.trim().length > 100) return "Name must be 100 characters or fewer.";
    if (!college.trim()) return "Please enter your college name.";
    if (college.trim().length > 150) return "College name must be 150 characters or fewer.";
    if (!photoUrl) return "Please upload a photo first.";
    return null;
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("Only JPEG, PNG, or WebP images are allowed.");
      e.target.value = "";
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      setError("Photo must be smaller than 5MB.");
      e.target.value = "";
      return;
    }
    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
    setPhotoUrl(null);
    if (error) setError("");
  };

  const handleUploadPhoto = async () => {
    if (!photo) return;
    setUploading(true);
    setError("");
    try {
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}-${photo.name}`;
      const { error: uploadError } = await supabase.storage
        .from("photos")
        .upload(fileName, photo);

      if (uploadError) {
        setError("Photo upload failed. Please try again.");
        return;
      }

      const { data: urlData } = supabase.storage.from("photos").getPublicUrl(fileName);
      setPhotoUrl(urlData.publicUrl);
    } catch {
      setError("Photo upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleBooking = async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const { data } = await axios.post(
        `${API}/book-free`,
        {
          name: name.trim(),
          college: college.trim(),
          slot_id: slot.id,
          event_id: event.id,
          photo_url: photoUrl,
        },
        { headers: authHeader() }
      );
      bustSlotsCache(event.id);
      bustTicketsCache();
      navigate("/ticket", { state: { ticket: data.ticket } });
    } catch (err) {
      const msg = err.response?.data?.error;
      if (err.response?.status === 409) {
        if (err.response?.data?.code === "DUPLICATE_TICKET") {
          setError("You already have a ticket for this slot. You can book a different slot for this event.");
        } else {
          setError("Sorry, this slot just sold out. Please go back and pick another.");
        }
      } else {
        setError(msg || "Booking failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const { data: order } = await axios.post(
        `${API}/create-order`,
        { amount: event.price, slot_id: slot.id, event_id: event.id },
        { headers: authHeader() }
      );

      const cashfree = await loadCashfreeSDK();
      const cf = cashfree({ mode: import.meta.env.VITE_CASHFREE_ENV || "production" });

      cf.checkout({
        paymentSessionId: order.payment_session_id,
        redirectTarget: "_modal",
      }).then(async (result) => {
        if (result.error) {
          setError(result.error.message || "Payment failed. Please try again.");
          setLoading(false);
          return;
        }

        if (result.paymentDetails || result.redirect) {
          try {
            const verify = await axios.post(
              `${API}/verify-payment`,
              {
                order_id: order.order_id,
                name: name.trim(),
                college: college.trim(),
                slot_id: slot.id,
                event_id: event.id,
                photo_url: photoUrl,
              },
              { headers: authHeader() }
            );

            if (verify.data.success) {
              bustSlotsCache(event.id);
              bustTicketsCache();
              navigate("/ticket", { state: { ticket: verify.data.ticket } });
            } else {
              setError("Payment verification failed. Please contact support.");
              setLoading(false);
            }
          } catch (err) {
            const msg = err.response?.data?.error;
            if (err.response?.status === 409) {
              setError("Slot sold out after payment. Please contact support for a refund.");
            } else {
              setError(msg || "Payment verification failed. Please contact support.");
            }
            setLoading(false);
          }
        } else {
          setLoading(false);
        }
      });
    } catch (err) {
      const msg = err.response?.data?.error;
      if (err.response?.status === 409) {
        if (err.response?.data?.code === "DUPLICATE_TICKET") {
          setError("You already have a ticket for this slot. You can book a different slot for this event.");
        } else {
          setError("This slot just sold out. Please go back and pick another.");
        }
      } else {
        setError(msg || "Could not initiate payment. Please try again.");
      }
      setLoading(false);
    }
  };

  const isPhotoReady = !!photoUrl;
  const isProfileReady = name.trim() && college.trim() && isPhotoReady;
  const canBook = phoneVerified && isProfileReady;

  const payLabel = () => {
    if (loading) return "Please wait…";
    if (!phoneVerified) return "Verify mobile number to continue";
    if (!isPhotoReady) return "Upload photo to continue";
    if (!name.trim() || !college.trim()) return "Complete your details to continue";
    return event.price > 0 ? `Pay ₹${event.price}` : "Book Free Pass";
  };

  return (
    <>
      <Menu />
      <div style={styles.page}>
        <div style={styles.hero}>
          <div style={styles.badge}>Booking</div>
          <h1 style={styles.title}>Book Your Pass</h1>
          <p style={styles.eventName}>{event.name}</p>
          <div style={styles.slotPill}>
            🕐 {slot.name}{slot.time ? ` — ${slot.time}` : ""}
          </div>
        </div>

        <div style={styles.card}>
          {error && <div style={styles.errorBox}>{error}</div>}

          <p style={styles.sectionTitle}>Mobile verification</p>
          {phoneVerified ? (
            <div style={styles.verifiedBadge}>✅ Verified: +91 {phone}</div>
          ) : otpStep === 1 ? (
            <>
              <label style={styles.label} htmlFor="booking-phone">Mobile number *</label>
              <div style={styles.phoneRow}>
                <span style={styles.countryCode}>+91</span>
                <input
                  id="booking-phone"
                  type="tel"
                  inputMode="numeric"
                  placeholder="98765 43210"
                  value={phone}
                  maxLength={10}
                  onChange={(e) => setPhone(sanitizePhone(e.target.value))}
                  style={{ ...styles.input, marginBottom: 0, borderRadius: "0 8px 8px 0", borderLeft: "none" }}
                  disabled={otpLoading}
                />
              </div>
              <button
                type="button"
                onClick={sendOtp}
                disabled={otpLoading || phone.length < 10}
                style={{
                  ...styles.otpBtn,
                  opacity: otpLoading || phone.length < 10 ? 0.6 : 1,
                }}
              >
                {otpLoading ? "Sending…" : "Send OTP"}
              </button>
            </>
          ) : (
            <>
              <label style={styles.label}>OTP sent to +91 {phone}</label>
              {devOtp && (
                <div style={styles.devOtpBox}>DEV MODE — OTP: <strong>{devOtp}</strong></div>
              )}
              <input
                type="tel"
                inputMode="numeric"
                placeholder="6-digit OTP"
                value={otp}
                maxLength={6}
                onChange={(e) => setOtp(sanitizeOtp(e.target.value))}
                style={styles.input}
                disabled={otpLoading}
              />
              <button
                type="button"
                onClick={verifyOtp}
                disabled={otpLoading || otp.length < 6}
                style={{
                  ...styles.otpBtn,
                  opacity: otpLoading || otp.length < 6 ? 0.6 : 1,
                }}
              >
                {otpLoading ? "Verifying…" : "Verify OTP"}
              </button>
              <button
                type="button"
                onClick={resendOtp}
                disabled={resendCountdown > 0 || otpLoading}
                style={styles.resendBtn}
              >
                {resendCountdown > 0 ? `Resend OTP in ${resendCountdown}s` : "Resend OTP"}
              </button>
              <button type="button" onClick={handleOtpBack} style={styles.changePhone}>
                ← Change number
              </button>
            </>
          )}

          <div style={styles.sectionDivider} />

          <p style={styles.sectionTitle}>Your details</p>

          <label style={styles.label} htmlFor="booking-name">Full name *</label>
          <input
            id="booking-name"
            placeholder="e.g. Omkar Sharma"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (error) setError("");
            }}
            style={styles.input}
            maxLength={100}
          />

          <label style={styles.label} htmlFor="booking-college">College *</label>
          <input
            id="booking-college"
            placeholder="e.g. St. Xavier's College"
            value={college}
            onChange={(e) => {
              setCollege(e.target.value);
              if (error) setError("");
            }}
            style={styles.input}
            maxLength={150}
          />

          <label style={styles.label}>Photo *</label>
          <label htmlFor="booking-photo" style={styles.fileLabel}>
            {photoPreview ? (
              <img src={photoPreview} alt="Preview" style={styles.photoPreview} />
            ) : (
              <div style={styles.filePlaceholder}>
                <span style={styles.fileIcon}>📷</span>
                <span style={styles.fileText}>Tap to select photo (JPEG/PNG/WebP, max 5MB)</span>
              </div>
            )}
          </label>
          <input
            id="booking-photo"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            capture="user"
            onChange={handlePhotoChange}
            style={{ display: "none" }}
          />

          {photo && !isPhotoReady && (
            <button
              type="button"
              onClick={handleUploadPhoto}
              disabled={uploading}
              style={{ ...styles.uploadBtn, opacity: uploading ? 0.7 : 1 }}
            >
              {uploading ? "Uploading…" : "Upload photo"}
            </button>
          )}

          {isPhotoReady && <div style={styles.uploadedBadge}>✅ Photo uploaded</div>}

          {photoPreview && !isPhotoReady && !uploading && (
            <button
              type="button"
              onClick={() => {
                setPhoto(null);
                setPhotoPreview(null);
                setPhotoUrl(null);
              }}
              style={styles.removePhoto}
            >
              Remove photo
            </button>
          )}
        </div>

        <button
          type="button"
          style={{ ...styles.btn, opacity: loading || !canBook ? 0.6 : 1 }}
          disabled={loading || !canBook}
          onClick={event.price > 0 ? handlePayment : handleBooking}
        >
          {payLabel()}
        </button>
      </div>
    </>
  );
}

const styles = {
  page: {
    padding: "24px 20px",
    maxWidth: "480px",
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
    fontSize: "26px",
    fontWeight: 800,
    margin: "0 0 6px 0",
    letterSpacing: "-0.02em",
  },
  eventName: { color: "rgba(255,255,255,0.75)", fontSize: "15px", margin: "0 0 10px 0" },
  slotPill: {
    display: "inline-block",
    background: "rgba(255,255,255,0.08)",
    color: "rgba(255,255,255,0.6)",
    fontSize: "12px",
    padding: "4px 10px",
    borderRadius: "20px",
    border: "1px solid rgba(255,255,255,0.12)",
  },
  card: {
    background: "#fff",
    padding: "20px",
    borderRadius: "12px",
    border: "1px solid #eee",
    boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
    marginBottom: "0",
  },
  sectionTitle: {
    fontSize: "13px",
    fontWeight: 800,
    color: "#1a1a1a",
    margin: "0 0 12px 0",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  sectionDivider: {
    height: "1px",
    background: "#eee",
    margin: "20px 0",
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
  phoneRow: {
    display: "flex",
    alignItems: "stretch",
    border: "1px solid #ddd",
    borderRadius: "8px",
    overflow: "hidden",
    marginBottom: "10px",
  },
  countryCode: {
    padding: "10px 10px",
    background: "#f5f5f5",
    fontSize: "14px",
    fontWeight: 600,
    color: "#555",
    borderRight: "1px solid #ddd",
    display: "flex",
    alignItems: "center",
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
  otpBtn: {
    width: "100%",
    padding: "11px",
    background: "#1A0A00",
    color: "white",
    border: "none",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: 700,
    cursor: "pointer",
    marginBottom: "8px",
  },
  resendBtn: {
    width: "100%",
    background: "none",
    border: "1px solid #ddd",
    borderRadius: "8px",
    color: "#FF5C1A",
    fontSize: "13px",
    fontWeight: 600,
    cursor: "pointer",
    padding: "8px",
    marginBottom: "6px",
  },
  changePhone: {
    background: "none",
    border: "none",
    color: "#FF5C1A",
    fontSize: "13px",
    fontWeight: 600,
    cursor: "pointer",
    padding: "4px 0 8px",
  },
  verifiedBadge: {
    fontSize: "13px",
    color: "#16a34a",
    fontWeight: 600,
    padding: "8px 12px",
    background: "#f0fdf4",
    borderRadius: "8px",
    border: "1px solid #bbf7d0",
    marginBottom: "4px",
  },
  devOtpBox: {
    background: "#fffbe6",
    border: "1px solid #ffe58f",
    color: "#7c5800",
    fontSize: "13px",
    padding: "8px 12px",
    borderRadius: "7px",
    marginBottom: "10px",
  },
  fileLabel: { display: "block", cursor: "pointer", marginBottom: "8px" },
  filePlaceholder: {
    border: "2px dashed #ddd",
    borderRadius: "10px",
    padding: "24px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "8px",
    background: "#fafafa",
  },
  fileIcon: { fontSize: "28px" },
  fileText: { fontSize: "13px", color: "#aaa", textAlign: "center" },
  photoPreview: {
    width: "100%",
    maxHeight: "200px",
    objectFit: "cover",
    borderRadius: "10px",
    display: "block",
  },
  uploadBtn: {
    width: "100%",
    padding: "10px",
    background: "#1A0A00",
    color: "white",
    border: "none",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: 700,
    cursor: "pointer",
    marginBottom: "6px",
  },
  uploadedBadge: {
    fontSize: "13px",
    color: "#16a34a",
    fontWeight: 600,
    padding: "6px 0",
  },
  removePhoto: {
    background: "none",
    border: "none",
    color: "#d0312d",
    fontSize: "12px",
    cursor: "pointer",
    padding: "0 0 12px 0",
    textDecoration: "underline",
  },
  btn: {
    width: "100%",
    padding: "14px",
    background: "#FF5C1A",
    color: "white",
    border: "none",
    borderRadius: "10px",
    marginTop: "14px",
    fontWeight: 700,
    fontSize: "16px",
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
  backLink: {
    marginTop: "12px",
    background: "none",
    border: "none",
    color: "#FF5C1A",
    fontWeight: 600,
    cursor: "pointer",
    fontSize: "14px",
  },
};
