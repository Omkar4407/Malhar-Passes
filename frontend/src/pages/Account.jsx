import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { supabase } from "../lib/supabase";
import { lsCached, lsBust } from "../lib/cache";
import { clearAuthStorage } from "../lib/auth";
import Menu from "../components/Menu";
import Header from "../components/Header";
import MyTicketsList from "../components/MyTicketsList";

const API = import.meta.env.VITE_BACKEND_URL;

const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_SIZE_BYTES = 5 * 1024 * 1024;
const PROFILE_TTL = 5 * 60_000;

export default function Account() {
  const navigate = useNavigate();
  const phoneLs = localStorage.getItem("userPhone");

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const [form, setForm] = useState({
    full_name: "",
    email: "",
  });
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const fileInputRef = useRef();

  useEffect(() => {
    fetchUser();
  }, []);

  const fetchUser = async () => {
    try {
      const token = localStorage.getItem("userToken");
      const cacheKey = `profile:${token?.slice(-24) || "anon"}`;
      const data = await lsCached(cacheKey, PROFILE_TTL, async () => {
        const { data: out } = await axios.get(`${API}/user-profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        return out?.user ?? null;
      });
      if (data) {
        setUser(data);
        setForm({
          full_name: data.full_name || "",
          email: data.email || "",
        });
      }
    } catch (err) {
      console.error("Fetch error:", err);
    }
    setLoading(false);
  };

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      showToast("error", "Only JPEG, PNG, or WebP images are allowed.");
      e.target.value = "";
      return;
    }

    if (file.size > MAX_SIZE_BYTES) {
      showToast("error", "Photo must be smaller than 5MB.");
      e.target.value = "";
      return;
    }

    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleUpdate = async () => {
    setSaving(true);
    let photoUrl = user?.photo_url;

    if (photo) {
      const fileName = `${Date.now()}-${photo.name}`;
      const { error: uploadErr } = await supabase.storage.from("photos").upload(fileName, photo);

      if (uploadErr) {
        console.error("Photo upload error:", uploadErr);
        showToast("error", "Photo upload failed. Please try again.");
        setSaving(false);
        return;
      }

      const { data } = supabase.storage.from("photos").getPublicUrl(fileName);
      photoUrl = data.publicUrl;
    }

    const filterCol = user?.phone_number ? "phone_number" : "google_sub";
    const filterVal = user?.phone_number || user?.google_sub;
    if (!filterVal) {
      showToast("error", "Verify your phone before updating profile.");
      setSaving(false);
      return;
    }

    const { error: updateErr } = await supabase
      .from("users")
      .update({
        full_name: form.full_name,
        email: form.email,
        photo_url: photoUrl,
      })
      .eq(filterCol, filterVal);

    if (updateErr) {
      console.error("Profile update error:", updateErr);
      showToast("error", "Update failed. Please try again.");
    } else {
      const tok = localStorage.getItem("userToken");
      lsBust(`profile:${tok?.slice(-24) || "anon"}`);
      showToast("success", "Profile updated successfully!");
      fetchUser();
      setPhoto(null);
      setPhotoPreview(null);
    }
    setSaving(false);
  };

  const handleLogout = () => {
    clearAuthStorage();
    navigate("/", { replace: true });
  };

  const avatarSrc = photoPreview || user?.photo_url || null;
  const initials = (form.full_name || phoneLs || user?.email || "?")[0].toUpperCase();
  const phoneDisplay = user?.phone_number || phoneLs || "";

  return (
    <>
      <Menu />
      <Header />

      {toast && (
        <div
          style={{
            ...styles.toast,
            background: toast.type === "success" ? "#1a7a45" : "#d0312d",
          }}
        >
          {toast.type === "success" ? "✓ " : "✕ "}
          {toast.msg}
        </div>
      )}

      <div style={styles.page}>
        <h1 style={styles.pageTitle}>My Account</h1>

        {loading ? (
          <p style={styles.loadingText}>Loading profile…</p>
        ) : (
          <>
            <div style={styles.avatarSection}>
              <div style={styles.avatarWrap} onClick={() => fileInputRef.current?.click()}>
                {avatarSrc ? (
                  <img src={avatarSrc} alt="profile" style={styles.avatar} />
                ) : (
                  <div style={styles.avatarPlaceholder}>{initials}</div>
                )}
                <div style={styles.avatarOverlay}>
                  <span style={{ fontSize: "18px" }}>📷</span>
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handlePhotoChange}
                style={{ display: "none" }}
              />
              <p style={styles.displayName}>{form.full_name || "Add your name"}</p>
              <p style={styles.phoneDisplay}>
                {phoneDisplay ? `+91 ${phoneDisplay}` : "Phone not verified — finish OTP on Login"}
              </p>
              <p style={styles.avatarHint}>Tap photo to change (JPEG/PNG/WebP, max 5MB)</p>
            </div>

            <div style={styles.card}>
              <p style={styles.sectionLabel}>Personal Info</p>

              <Field
                label="Full Name"
                value={form.full_name}
                placeholder="Enter your full name"
                onChange={(v) => setForm({ ...form, full_name: v })}
              />
              <Field
                label="Email"
                value={form.email}
                placeholder="Enter your email"
                type="email"
                onChange={(v) => setForm({ ...form, email: v })}
              />
              <div style={styles.fieldWrap}>
                <label style={styles.label}>Phone Number</label>
                <input
                  value={phoneDisplay ? `+91 ${phoneDisplay}` : ""}
                  placeholder="Verify via Login (OTP)"
                  disabled
                  style={{ ...styles.input, ...styles.inputDisabled }}
                />
              </div>
            </div>

            <button
              type="button"
              onClick={handleUpdate}
              disabled={saving}
              style={{ ...styles.saveBtn, opacity: saving ? 0.7 : 1 }}
            >
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </>
        )}

        <div style={styles.ticketsSection}>
          <MyTicketsList />
        </div>

        <button type="button" onClick={handleLogout} style={styles.logoutBtn}>
          Log out
        </button>
      </div>
    </>
  );
}

function Field({ label, value, onChange, placeholder, type = "text" }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={styles.fieldWrap}>
      <label style={styles.label}>{label}</label>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          ...styles.input,
          borderColor: focused ? "#FF5C1A" : "#eee",
          boxShadow: focused ? "0 0 0 3px rgba(255,92,26,0.1)" : "none",
        }}
      />
    </div>
  );
}

const styles = {
  page: {
    padding: "24px 20px 48px",
    maxWidth: "560px",
    margin: "0 auto",
    fontFamily: "'Segoe UI', system-ui, sans-serif",
    color: "#1a1a1a",
  },
  pageTitle: {
    fontSize: "22px",
    fontWeight: 800,
    margin: "0 0 20px",
    letterSpacing: "-0.02em",
  },
  loadingText: {
    color: "#aaa",
    fontSize: "14px",
    marginBottom: "24px",
  },
  toast: {
    position: "fixed",
    top: "80px",
    left: "50%",
    transform: "translateX(-50%)",
    color: "#fff",
    fontSize: "13px",
    fontWeight: 700,
    padding: "10px 20px",
    borderRadius: "20px",
    zIndex: 999,
    boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
    whiteSpace: "nowrap",
  },
  avatarSection: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    marginBottom: "20px",
    gap: "4px",
  },
  avatarWrap: {
    position: "relative",
    width: "96px",
    height: "96px",
    borderRadius: "50%",
    cursor: "pointer",
    overflow: "hidden",
    border: "3px solid #FF5C1A",
    marginBottom: "4px",
  },
  avatar: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  avatarPlaceholder: {
    width: "100%",
    height: "100%",
    background: "#FF5C1A",
    color: "#fff",
    fontSize: "36px",
    fontWeight: 800,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarOverlay: {
    position: "absolute",
    inset: 0,
    background: "rgba(0,0,0,0.35)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    opacity: 0,
    transition: "opacity 0.2s",
  },
  displayName: {
    fontSize: "18px",
    fontWeight: 800,
    margin: "4px 0 0",
    textAlign: "center",
  },
  phoneDisplay: {
    fontSize: "14px",
    fontWeight: 600,
    color: "#444",
    margin: "2px 0 0",
    letterSpacing: "0.03em",
  },
  avatarHint: {
    fontSize: "11px",
    color: "#aaa",
    margin: "4px 0 0",
    textAlign: "center",
  },
  card: {
    background: "#fff",
    borderRadius: "16px",
    padding: "20px",
    boxShadow: "0 2px 12px rgba(0,0,0,0.07)",
    border: "1px solid #f0f0f0",
    marginBottom: "16px",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  sectionLabel: {
    fontSize: "11px",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.1em",
    color: "#aaa",
    margin: 0,
  },
  fieldWrap: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  label: {
    fontSize: "12px",
    fontWeight: 600,
    color: "#555",
  },
  input: {
    width: "100%",
    padding: "10px 14px",
    fontSize: "14px",
    border: "1.5px solid #eee",
    borderRadius: "10px",
    outline: "none",
    transition: "border-color 0.15s, box-shadow 0.15s",
    boxSizing: "border-box",
    color: "#1a1a1a",
    background: "#fff",
  },
  inputDisabled: {
    background: "#fafafa",
    color: "#aaa",
    cursor: "not-allowed",
  },
  saveBtn: {
    width: "100%",
    padding: "14px",
    background: "#FF5C1A",
    color: "#fff",
    border: "none",
    borderRadius: "12px",
    fontSize: "15px",
    fontWeight: 700,
    cursor: "pointer",
    letterSpacing: "0.02em",
    marginBottom: "28px",
  },
  ticketsSection: {
    borderTop: "1px solid #eee",
    paddingTop: "24px",
    marginBottom: "24px",
  },
  logoutBtn: {
    width: "100%",
    padding: "14px",
    background: "transparent",
    color: "#d0312d",
    border: "1.5px solid rgba(208,49,45,0.35)",
    borderRadius: "12px",
    fontSize: "15px",
    fontWeight: 700,
    cursor: "pointer",
  },
};
