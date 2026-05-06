import { useState } from "react";
import { supabase } from "../lib/supabase";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import Menu from "../components/Menu";
import { bustSlotsCache } from "./Events";
import { bustTicketsCache } from "./Ticket";

const API = import.meta.env.VITE_BACKEND_URL;
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

function authHeader() {
  const token = localStorage.getItem("userToken");
  return { Authorization: `Bearer ${token}` };
}

// Load Cashfree JS SDK dynamically
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
  const [name, setName]           = useState("");
  const [college, setCollege]     = useState("");
  const [photo, setPhoto]         = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoUrl, setPhotoUrl]   = useState(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");

  const navigate  = useNavigate();
  const location  = useLocation();
  const slot  = location.state?.slot;
  const event = location.state?.event;

  if (!slot || !event) {
    return (
      <>
        <Menu />
        <div style={styles.page}>
          <div style={styles.errorBox}>
            Invalid booking session. Please go back and select an event.
          </div>
        </div>
      </>
    );
  }

  const validate = () => {
    if (!name.trim())         return "Please enter your name.";
    if (name.trim().length > 100) return "Name must be 100 characters or fewer.";
    if (!college.trim())      return "Please enter your college name.";
    if (college.trim().length > 150) return "College name must be 150 characters or fewer.";
    if (!photoUrl)            return "Please upload a photo first.";
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
    } catch (err) {
      setError("Photo upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  // ── Free booking ───────────────────────────────────────────────────────────
  const handleBooking = async () => {
    const validationError = validate();
    if (validationError) { setError(validationError); return; }

    setLoading(true);
    setError("");
    try {
      const { data } = await axios.post(
        `${API}/book-free`,
        { name: name.trim(), college: college.trim(), slot_id: slot.id, event_id: event.id, photo_url: photoUrl },
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

  // ── Paid booking via Cashfree ──────────────────────────────────────────────
  const handlePayment = async () => {
    const validationError = validate();
    if (validationError) { setError(validationError); return; }

    setLoading(true);
    setError("");
    try {
      // Step 1 — create order on backend, get payment_session_id
      const { data: order } = await axios.post(
        `${API}/create-order`,
        { amount: event.price, slot_id: slot.id, event_id: event.id },
        { headers: authHeader() }
      );

      // Step 2 — load Cashfree SDK and open checkout
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
          // Step 3 — verify payment on backend
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
          // User closed the modal
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
  const isFormReady  = name.trim() && college.trim() && isPhotoReady;

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

          <label style={styles.label} htmlFor="booking-name">Full Name *</label>
          <input
            id="booking-name"
            placeholder="e.g. Omkar Sharma"
            value={name}
            onChange={(e) => { setName(e.target.value); if (error) setError(""); }}
            style={styles.input}
            maxLength={100}
            autoFocus
          />

          <label style={styles.label} htmlFor="booking-college">College *</label>
          <input
            id="booking-college"
            placeholder="e.g. St. Xavier's College"
            value={college}
            onChange={(e) => { setCollege(e.target.value); if (error) setError(""); }}
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
              onClick={handleUploadPhoto}
              disabled={uploading}
              style={{ ...styles.uploadBtn, opacity: uploading ? 0.7 : 1 }}
            >
              {uploading ? "Uploading…" : "📤 Upload Photo"}
            </button>
          )}

          {isPhotoReady && (
            <div style={styles.uploadedBadge}>✅ Photo uploaded</div>
          )}

          {photoPreview && !isPhotoReady && !uploading && (
            <button
              onClick={() => { setPhoto(null); setPhotoPreview(null); setPhotoUrl(null); }}
              style={styles.removePhoto}
            >
              Remove photo
            </button>
          )}
        </div>

        <button
          style={{ ...styles.btn, opacity: loading || !isFormReady ? 0.6 : 1 }}
          disabled={loading || !isFormReady}
          onClick={event.price > 0 ? handlePayment : handleBooking}
        >
          {loading
            ? "Please wait…"
            : !isPhotoReady
            ? "Upload photo to continue"
            : event.price > 0
            ? `Pay ₹${event.price}`
            : "Book Free Pass"}
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
};