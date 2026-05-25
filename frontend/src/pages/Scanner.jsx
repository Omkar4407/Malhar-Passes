import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { Html5Qrcode } from "html5-qrcode";

const API = import.meta.env.VITE_BACKEND_URL;
const QR_DIV_ID = "qr-reader";

function authHeader() {
  return { Authorization: `Bearer ${localStorage.getItem("scannerToken")}` };
}

function extractTicketId(raw) {
  const trimmed = raw.trim();
  try {
    const parsed = JSON.parse(trimmed);
    if (parsed.ticket_id) return parsed.ticket_id;
  } catch {}
  return trimmed.length > 0 ? trimmed : null;
}

const MAX_ATTEMPTS = 5;

export default function Scanner() {
  const [input, setInput]               = useState("");
  const [scanState, setScanState]       = useState(null);
  const [ticket, setTicket]             = useState(null);
  const [loading, setLoading]           = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError]   = useState("");
  const [attempts, setAttempts]         = useState(0); // attempts for current ticket
  const isFrontCamera = useRef(false);  // track facing mode for mirror logic
  const html5QrRef = useRef(null);

  // ── Camera ──────────────────────────────────────────────────────────────────
  // Track whether a scan is in-progress so we don't double-fire
  const scanningRef = useRef(false);

  const startCamera = async () => {
    setCameraError("");
    try {
      if (html5QrRef.current) {
        await html5QrRef.current.stop().catch(() => {});
        html5QrRef.current = null;
      }
      const scanner = new Html5Qrcode(QR_DIV_ID);
      html5QrRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 30,
          qrbox: (w, h) => {
            const size = Math.min(w, h) * 0.8;
            return { width: size, height: size };
          },
          aspectRatio: 1.0,
          disableFlip: false,
          experimentalFeatures: {
            useBarCodeDetectorIfSupported: true,
          },
          rememberLastUsedCamera: true,
        },
        (decodedText) => {
          if (scanningRef.current) return;
          scanningRef.current = true;
          setInput(decodedText);
          processTicket(decodedText);
        },
        () => {}
      );
      setCameraActive(true);

      // Detect actual facing mode from the live stream track settings.
      // Only mirror for front/user-facing cameras — back cameras must NOT be mirrored.
      requestAnimationFrame(() => {
        const video = document.querySelector(`#${QR_DIV_ID} video`);
        if (!video) return;

        // Try to read facingMode from the actual stream track
        let actualFacing = "environment"; // safe default
        try {
          const stream = video.srcObject;
          if (stream) {
            const track = stream.getVideoTracks()[0];
            const settings = track?.getSettings?.();
            if (settings?.facingMode) actualFacing = settings.facingMode;
          }
        } catch (_) {}

        isFrontCamera.current = actualFacing === "user";
        // Mirror only front/selfie cameras
        video.style.transform = isFrontCamera.current ? "scaleX(-1)" : "none";
      });

    } catch (err) {
      console.error("Camera error:", err);
      html5QrRef.current = null;
      setCameraError(
        err?.message?.toLowerCase().includes("permission")
          ? "Camera permission denied. Please allow camera access and retry."
          : "Could not start camera. Ensure the page is served over HTTPS."
      );
    }
  };

  const stopCamera = () => {
    if (html5QrRef.current) {
      html5QrRef.current.stop().catch(() => {});
      html5QrRef.current = null;
    }
    setCameraActive(false);
  };

  useEffect(() => () => stopCamera(), []);

  // ── Ticket lookup ────────────────────────────────────────────────────────────
  const processTicket = async (rawText) => {
    setScanState(null);
    setTicket(null);
    setAttempts(0);
    setLoading(true);

    const ticketId = extractTicketId(rawText);
    if (!ticketId) {
      setScanState("invalid");
      setLoading(false);
      // Auto-release so camera can scan next ticket immediately
      scanningRef.current = false;
      return;
    }

    try {
      const { data } = await axios.get(`${API}/scanner-ticket?id=${ticketId}`, {
        headers: authHeader(),
      });
      const t = data.ticket;
      setTicket(t);

      if (t.rejected)        setScanState("rejected_prev");
      else if (t.checked_in) setScanState("already_entered");
      else                   setScanState("pending");
    } catch (err) {
      setScanState(err.response?.status === 404 ? "invalid" : "error");
      // Auto-release on error/not-found so camera keeps working
      scanningRef.current = false;
    }
    setLoading(false);
  };

  const handleScan = () => { if (input.trim()) processTicket(input.trim()); };

  const handleAllow = async () => {
    if (attempts >= MAX_ATTEMPTS) return;
    setLoading(true);
    const nextAttempt = attempts + 1;
    setAttempts(nextAttempt);
    try {
      await axios.post(`${API}/scanner-checkin`, { action: "checkin", ticket_id: ticket.id }, { headers: authHeader() });
      setScanState("allowed");
    } catch (err) {
      console.error("Check-in error:", err);
      if (nextAttempt >= MAX_ATTEMPTS) setScanState("locked");
    }
    setLoading(false);
  };

  const handleReject = async () => {
    if (attempts >= MAX_ATTEMPTS) return;
    setLoading(true);
    const nextAttempt = attempts + 1;
    setAttempts(nextAttempt);
    try {
      await axios.post(`${API}/scanner-checkin`, { action: "reject", ticket_id: ticket.id }, { headers: authHeader() });
      setScanState("rejected");
    } catch (err) {
      console.error("Reject error:", err);
      if (nextAttempt >= MAX_ATTEMPTS) setScanState("locked");
    }
    setLoading(false);
  };

  const handleReset = () => {
    setInput("");
    setScanState(null);
    setTicket(null);
    setAttempts(0);
    scanningRef.current = false; // allow next scan
    // Camera stays running — no need to restart
  };

  return (
    <>
      <div style={styles.page}>
        <h2 style={styles.heading}>Scanner</h2>

        {/* ── Scan UI — always mounted so camera stays alive; hidden when result shown ── */}
        <div style={{ display: scanState ? "none" : "block" }}>
        {true && (
          <div style={styles.scanSection}>

            {/* Camera card */}
            <div style={styles.cameraCard}>
              {/* Placeholder shown when camera is off */}
              {!cameraActive && (
                <div style={styles.placeholder}>
                  <span style={{ fontSize: "44px" }}>📷</span>
                  <span style={{ fontSize: "13px", color: "#aaa", textAlign: "center" }}>
                    {cameraError || "Tap 'Start Camera' to scan"}
                  </span>
                </div>
              )}
              {/*
                Html5Qrcode injects its video/canvas directly into this div.
                It MUST be a fixed pixel size — percentage heights don't work
                before the element is mounted. Keep NO React children here.
              */}
              <div
                id={QR_DIV_ID}
                style={{
                  width: "100%",
                  // Give it a real pixel height so the injected video has room
                  height: cameraActive ? "300px" : "0px",
                  overflow: "hidden",
                  transition: "height 0.2s",
                }}
              />
            </div>

            {cameraError && <div style={styles.errBox}>{cameraError}</div>}

            {!cameraActive ? (
              <button onClick={startCamera} style={styles.camBtn}>📷 Start Camera</button>
            ) : (
              <button onClick={stopCamera} style={{ ...styles.camBtn, background: "#555" }}>■ Stop Camera</button>
            )}

            <div style={styles.divRow}>
              <hr style={styles.hr} /><span style={styles.orText}>or enter manually</span><hr style={styles.hr} />
            </div>

            <input
              placeholder="Paste ticket ID or QR JSON"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleScan()}
              style={styles.input}
            />
            <button
              onClick={handleScan}
              disabled={!input.trim() || loading}
              style={{ ...styles.camBtn, opacity: !input.trim() || loading ? 0.5 : 1 }}
            >
              {loading ? "Looking up…" : "Lookup Ticket"}
            </button>
          </div>
        )}
        </div>

        {/* ── Invalid ── */}
        {scanState === "invalid" && (
          <Outcome icon="🚫" title="Invalid Ticket" titleColor="#d0312d" bg="#fff0f0" border="#d0312d"
            sub="This ticket ID was not found in the system."
            actions={[{ label: "Scan Again", color: "#d0312d", onClick: handleReset }]}
          />
        )}

        {/* ── Error ── */}
        {scanState === "error" && (
          <Outcome icon="⚠️" title="Server Error" titleColor="#b45309" bg="#fffbe6" border="#b45309"
            sub="Could not reach the server. Please try again."
            actions={[{ label: "Try Again", color: "#b45309", onClick: handleReset }]}
          />
        )}

        {/* ── Previously rejected ── */}
        {scanState === "rejected_prev" && ticket && (
          <Outcome icon="🚫" title="Previously Rejected" titleColor="#d0312d" bg="#fff0f0" border="#d0312d"
            sub={`${ticket.name} was already rejected. Entry not permitted.`}
            photo={ticket.photo_url}
            info={[
              { label: "Name",    value: ticket.name },
              { label: "College", value: ticket.college },
              { label: "Phone",   value: ticket.phone },
              { label: "Event", value: ticket._eventSlotLabel },
            ]}
            actions={[{ label: "Scan Again", color: "#d0312d", onClick: handleReset }]}
          />
        )}

        {/* ── Already entered ── */}
        {scanState === "already_entered" && ticket && (
          <Outcome icon="⚠️" title="Already Entered" titleColor="#b45309" bg="#fffbe6" border="#b45309"
            sub={`${ticket.name} has already checked in.`}
            photo={ticket.photo_url}
            info={[
              { label: "Name",    value: ticket.name },
              { label: "College", value: ticket.college },
              { label: "Phone",   value: ticket.phone },
              { label: "Event", value: ticket._eventSlotLabel },
            ]}
            actions={[{ label: "Scan Again", color: "#b45309", onClick: handleReset }]}
          />
        )}

        {/* ── Pending — show allow/reject ── */}
        {scanState === "pending" && ticket && (
          <Outcome icon="🎟️" title="Valid Ticket" titleColor="#1a4a7a" bg="#f0f8ff" border="#1a4a7a"
            photo={ticket.photo_url}
            info={[
              { label: "Name",    value: ticket.name },
              { label: "College", value: ticket.college },
              { label: "Phone",   value: ticket.phone },
              { label: "Event", value: ticket._eventSlotLabel },
              { label: "Attempts", value: `${attempts} / ${MAX_ATTEMPTS}` },
            ]}
            actions={[
              { label: loading ? "…" : "✅ Allow Entry", color: "#16a34a", onClick: handleAllow, disabled: loading || attempts >= MAX_ATTEMPTS },
              { label: "❌ Reject",                       color: "#d0312d", onClick: handleReject, disabled: loading || attempts >= MAX_ATTEMPTS },
            ]}
          />
        )}

        {/* ── Action locked after 5 attempts ── */}
        {scanState === "locked" && (
          <Outcome icon="🔒" title="Action Locked" titleColor="#7c3aed" bg="#f5f0ff" border="#7c3aed"
            sub={`${MAX_ATTEMPTS} failed attempts. Please contact a supervisor.`}
            actions={[{ label: "Scan Again", color: "#7c3aed", onClick: handleReset }]}
          />
        )}

        {/* ── Allowed ── */}
        {scanState === "allowed" && ticket && (
          <Outcome icon="✅" title="Entry Allowed" titleColor="#16a34a" bg="#f0fff4" border="#16a34a"
            sub={`${ticket.name} has been checked in.`}
            photo={ticket.photo_url}
            info={[
              { label: "Name",    value: ticket.name },
              { label: "Event", value: ticket._eventSlotLabel },
            ]}
            actions={[{ label: "Scan Next", color: "#16a34a", onClick: handleReset }]}
          />
        )}

        {/* ── Just rejected ── */}
        {scanState === "rejected" && ticket && (
          <Outcome icon="🚫" title="Entry Rejected" titleColor="#d0312d" bg="#fff0f0" border="#d0312d"
            sub={`${ticket.name} has been turned away.`}
            photo={ticket.photo_url}
            info={[
              { label: "Name",    value: ticket.name },
              { label: "Event", value: ticket._eventSlotLabel },
            ]}
            actions={[{ label: "Scan Again", color: "#d0312d", onClick: handleReset }]}
          />
        )}
      </div>
    </>
  );
}

// ── Outcome card with 70/30 photo layout ────────────────────────────────────
function Outcome({ icon, title, titleColor, bg, border, sub, photo, info, actions }) {
  const [fullscreen, setFullscreen] = useState(false);

  return (
    <div style={{ background: bg, border: `2px solid ${border}`, borderRadius: "16px", overflow: "hidden" }}>

      {photo && (
        <>
          {/* Fullscreen overlay */}
          {fullscreen && (
            <div
              onClick={() => setFullscreen(false)}
              style={{
                position: "fixed", inset: 0, zIndex: 1000,
                background: "rgba(0,0,0,0.92)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <img
                src={photo}
                alt="Attendee"
                style={{ maxWidth: "95vw", maxHeight: "95vh", borderRadius: "12px", objectFit: "contain" }}
                onError={(e) => { e.target.style.display = "none"; }}
              />
              <button
                onClick={(e) => { e.stopPropagation(); setFullscreen(false); }}
                style={styles.collapseBtn}
                title="Collapse"
              >✕</button>
            </div>
          )}

          {/* 70% photo strip */}
          <div style={{ position: "relative", width: "100%", height: "260px", background: "#111" }}>
            <img
              src={photo}
              alt="Attendee"
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              onError={(e) => { e.target.parentElement.style.display = "none"; }}
            />
            {/* Expand icon */}
            <button
              onClick={() => setFullscreen(true)}
              style={styles.expandBtn}
              title="View fullscreen"
            >⛶</button>
            {/* Gradient fade into the details section below */}
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "60px", background: `linear-gradient(transparent, ${bg})` }} />
          </div>
        </>
      )}

      {/* 30% — details section */}
      <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: "10px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "28px" }}>{icon}</span>
          <p style={{ fontSize: "18px", fontWeight: 800, color: titleColor, margin: 0 }}>{title}</p>
        </div>

        {sub && <p style={{ fontSize: "13px", color: "#555", margin: 0 }}>{sub}</p>}

        {info && info.filter(r => r.value).length > 0 && (
          <div style={{ background: "rgba(255,255,255,0.7)", borderRadius: "10px", padding: "10px 12px", display: "flex", flexDirection: "column", gap: "5px" }}>
            {info.filter(r => r.value).map(({ label, value }) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(0,0,0,0.06)", paddingBottom: "4px" }}>
                <span style={{ color: "#888", fontSize: "12px" }}>{label}</span>
                <span style={{ fontWeight: 700, fontSize: "12px" }}>{value}</span>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: "flex", gap: "8px" }}>
          {actions.map(({ label, color, onClick, disabled }) => (
            <button key={label} onClick={onClick} disabled={disabled}
              style={{ flex: 1, padding: "11px", background: color, color: "white", border: "none", borderRadius: "10px", fontSize: "14px", fontWeight: 700, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.6 : 1 }}>
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: { padding: "20px", maxWidth: "440px", margin: "0 auto", fontFamily: "'Segoe UI', system-ui, sans-serif" },
  heading: { fontSize: "22px", fontWeight: 800, marginBottom: "16px", textAlign: "center" },
  scanSection: { display: "flex", flexDirection: "column", gap: "12px" },
  cameraCard: {
    position: "relative",
    width: "100%",
    background: "#111",
    borderRadius: "16px",
    overflow: "hidden",
    border: "2px solid #1A0A00",
    // Min height so placeholder is always visible
    minHeight: "180px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  placeholder: {
    position: "absolute",
    inset: 0,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    padding: "20px",
    pointerEvents: "none",
  },
  errBox: { 
    background: "#fff0f0", 
    border: "1px solid #fdd", 
    color: "#d0312d", 
    fontSize: "13px", 
    padding: "8px 12px", 
    borderRadius: "8px" 
  },
  camBtn: { 
    width: "100%", 
    padding: "12px", 
    background: "#1A0A00", 
    color: "white", 
    border: "none", 
    borderRadius: "10px", 
    fontSize: "15px", 
    fontWeight: 700, 
    cursor: "pointer" 
  },
  divRow: { 
    display: "flex", 
    alignItems: "center", 
    gap: "10px" 
  },
  hr: { 
    flex: 1, 
    border: "none", 
    borderTop: "1px solid #eee" 
  },
  orText: { 
    color: "#aaa", 
    fontSize: "12px", 
    whiteSpace: "nowrap" 
  },
  input: { 
    width: "100%", 
    padding: "12px", 
    borderRadius: "10px", 
    border: "1px solid #ddd", 
    fontSize: "14px", 
    boxSizing: "border-box", 
    outline: "none" 
  },
  expandBtn: {
    position: "absolute", 
    top: "10px", 
    right: "10px",
    background: "rgba(0,0,0,0.55)", 
    backdropFilter: "blur(4px)",
    border: "none", 
    borderRadius: "8px",
    color: "white", 
    fontSize: "18px", 
    lineHeight: 1,
    width: "36px", 
    height: "36px",
    cursor: "pointer", 
    display: "flex", 
    alignItems: "center", 
    justifyContent: "center",
  },
  collapseBtn: {
    position: "fixed", 
    top: "16px", 
    right: "16px", 
    zIndex: 1001,
    background: "rgba(255,255,255,0.15)", 
    backdropFilter: "blur(4px)",
    border: "2px solid rgba(255,255,255,0.3)", 
    borderRadius: "50%",
    color: "white", 
    fontSize: "18px", 
    fontWeight: 700,
    width: "42px", 
    height: "42px",
    cursor: "pointer", 
    display: "flex", 
    alignItems: "center", 
    justifyContent: "center",
  },
};