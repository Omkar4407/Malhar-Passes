import { Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import axios from "axios";
import Booking from "./pages/Booking";
import Ticket from "./pages/Ticket";
import Scanner from "./pages/Scanner";
import Events from "./pages/Events";
import Slots from "./pages/Slots";
import AdminDashboard from "./pages/AdminDashboard";
import AdminLogin from "./pages/AdminLogin";
import AdminEvents from "./pages/AdminEvents";
import Account from "./pages/Account";
import ScannerLogin from "./pages/ScannerLogin";
import Onboarding from "./pages/Onboarding";
import { supabase } from "./lib/supabase";

const API = import.meta.env.VITE_BACKEND_URL;

async function verifyToken(token) {
  if (!token) return false;
  try {
    const { data } = await axios.post(`${API}/verify-token`, { token });
    return data.valid === true;
  } catch {
    return false;
  }
}

function TokenGuard({ tokenKey, redirectTo, children }) {
  const [status, setStatus] = useState("checking");

  useEffect(() => {
    const token = localStorage.getItem(tokenKey);
    verifyToken(token).then((valid) => {
      if (valid) {
        setStatus("ok");
      } else {
        localStorage.removeItem(tokenKey);
        setStatus("fail");
      }
    });
  }, [tokenKey]);

  if (status === "checking") {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", background: "#0b011c" }}>
        <style>{`@keyframes _spin { to { transform: rotate(360deg); } }`}</style>
        <div style={{
          width: "36px",
          height: "36px",
          border: "4px solid rgba(255,0,207,0.2)",
          borderTop: "4px solid #ff00cf",
          borderRadius: "50%",
          animation: "_spin 0.8s linear infinite",
        }} />
      </div>
    );
  }

  if (status === "fail") return <Navigate to={redirectTo} replace />;
  return children;
}

function ProtectedRoute({ children }) {
  return <TokenGuard tokenKey="userToken" redirectTo="/">{children}</TokenGuard>;
}

// OnboardingGuard checks the DB (via Supabase session) — not localStorage —
// to prevent trivial bypass via localStorage manipulation.
function OnboardingGuard({ children }) {
  const [status, setStatus] = useState("checking");

  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setStatus("fail"); return; }

        const { data: profile } = await supabase
          .from("profiles")
          .select("is_onboarded")
          .eq("id", user.id)
          .single();

        if (profile?.is_onboarded) {
          setStatus("ok");
        } else {
          setStatus("fail");
        }
      } catch {
        setStatus("fail");
      }
    })();
  }, []);

  if (status === "checking") {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", background: "#0b011c" }}>
        <style>{`@keyframes _spin { to { transform: rotate(360deg); } }`}</style>
        <div style={{
          width: "36px", height: "36px",
          border: "4px solid rgba(255,0,207,0.2)",
          borderTop: "4px solid #ff00cf",
          borderRadius: "50%",
          animation: "_spin 0.8s linear infinite",
        }} />
      </div>
    );
  }

  if (status === "fail") return <Navigate to="/onboarding" replace />;
  return children;
}

function AdminRoute({ children }) {
  return <TokenGuard tokenKey="adminToken" redirectTo="/admin-login">{children}</TokenGuard>;
}

function ScannerRoute({ children }) {
  return <TokenGuard tokenKey="scannerToken" redirectTo="/scanner-login">{children}</TokenGuard>;
}

// Handles the OAuth redirect after Google sign-in for Admin
function AdminLoginCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        // Supabase processes the hash fragment automatically
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !session) throw new Error("No session after OAuth redirect.");

        if (!session.provider_token) throw new Error("No Google token in session.");
        const { data } = await axios.post(
          `${API}/admin-login`,
          { access_token: session.provider_token }
        );
        localStorage.setItem("adminToken", data.token);
        localStorage.setItem("admin", JSON.stringify(data.admin));

        // Sign out from Supabase — admin uses our own JWT, not Supabase session
        await supabase.auth.signOut();

        navigate("/admin", { replace: true });
      } catch (err) {
        const msg = err?.response?.data?.error || err?.message || "Access denied.";
        setError(msg);
        await supabase.auth.signOut();
      }
    })();
  }, []);

  if (error) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh", background: "#0b011c", color: "#ffb4ab", fontFamily: "Montserrat, sans-serif", gap: 16 }}>
        <div style={{ background: "rgba(147,0,10,0.2)", border: "1px solid rgba(255,180,171,0.3)", borderRadius: 12, padding: "16px 24px", maxWidth: 400, textAlign: "center" }}>
          <p style={{ fontWeight: 700, marginBottom: 8 }}>Access Denied</p>
          <p style={{ fontSize: 14, opacity: 0.8 }}>{error}</p>
        </div>
        <button onClick={() => navigate("/admin-login")} style={{ color: "#ff6b00", background: "none", border: "none", cursor: "pointer", fontSize: 14, textDecoration: "underline" }}>
          Try again
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", background: "#0b011c" }}>
      <style>{`@keyframes _spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ width: "36px", height: "36px", border: "4px solid rgba(255,107,0,0.2)", borderTop: "4px solid #ff6b00", borderRadius: "50%", animation: "_spin 0.8s linear infinite" }} />
    </div>
  );
}

// Handles the OAuth redirect after Google sign-in for Scanner
function ScannerLoginCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !session) throw new Error("No session after OAuth redirect.");

        if (!session.provider_token) throw new Error("No Google token in session.");
        const { data } = await axios.post(
          `${API}/scanner-login`,
          { access_token: session.provider_token }
          
        );
        localStorage.setItem("scannerToken", data.token);
        localStorage.setItem("scannerAuth", "true");
        localStorage.setItem("scannerEmail", data.admin.email);

        // Sign out from Supabase session — scanner uses our own JWT
        await supabase.auth.signOut();

        navigate("/scanner", { replace: true });
      } catch (err) {
        const msg = err?.response?.data?.error || err?.message || "Access denied.";
        setError(msg);
        await supabase.auth.signOut();
      }
    })();
  }, []);

  if (error) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh", background: "#0b011c", color: "#ffb4ab", fontFamily: "Montserrat, sans-serif", gap: 16 }}>
        <div style={{ background: "rgba(147,0,10,0.2)", border: "1px solid rgba(255,180,171,0.3)", borderRadius: 12, padding: "16px 24px", maxWidth: 400, textAlign: "center" }}>
          <p style={{ fontWeight: 700, marginBottom: 8 }}>Access Denied</p>
          <p style={{ fontSize: 14, opacity: 0.8 }}>{error}</p>
        </div>
        <button onClick={() => navigate("/scanner-login")} style={{ color: "#ff00cf", background: "none", border: "none", cursor: "pointer", fontSize: 14, textDecoration: "underline" }}>
          Try again
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", background: "#0b011c" }}>
      <style>{`@keyframes _spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ width: "36px", height: "36px", border: "4px solid rgba(255,0,207,0.2)", borderTop: "4px solid #ff00cf", borderRadius: "50%", animation: "_spin 0.8s linear infinite" }} />
    </div>
  );
}

function App() {
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session) {
        // Only exchange for userToken if we're on a regular user route
        // (admin/scanner callbacks handle their own tokens)
        const isAdminCallback = window.location.pathname.includes("admin-login");
        const isScannerCallback = window.location.pathname.includes("scanner-login");
        if (isAdminCallback || isScannerCallback) return;

        if (!localStorage.getItem("userToken")) {
          try {
            const { data } = await axios.post(
              `${API}/auth-supabase`, 
              { access_token: session.access_token },
              { headers: { Authorization: `Bearer ${session.access_token}` } }
            );
            if (data.token) {
              localStorage.setItem("userToken", data.token);
              
              // Check DB for onboarding status (not localStorage)
              const { data: profile } = await supabase
                .from("profiles")
                .select("is_onboarded, photo_url")
                .eq("id", session.user.id)
                .single();

              if (profile?.is_onboarded) {
                if (profile.photo_url) localStorage.setItem("userAvatar", profile.photo_url);
                window.location.reload();
              } else {
                window.location.href = "/onboarding";
              }
            }
          } catch (err) {
            console.error("Failed to authenticate with backend:", err);
          }
        }
      } else if (event === "SIGNED_OUT") {
        // Invalidate the JWT on the server (blocklist it)
        const userToken = localStorage.getItem("userToken");
        if (userToken) {
          try {
            await axios.post(`${API}/logout`, {}, {
              headers: { Authorization: `Bearer ${userToken}` }
            });
          } catch { /* best-effort */ }
        }
        localStorage.removeItem("userToken");
        localStorage.removeItem("onboardingComplete");
        localStorage.removeItem("userAvatar");
      }
    });

    return () => { subscription.unsubscribe(); };
  }, []);

  return (
    <Routes>
      <Route path="/"            element={<Events />} />
      <Route path="/events"      element={<Navigate to="/" replace />} />
      
      <Route path="/admin-login"           element={<AdminLogin />} />
      <Route path="/admin-login-callback"  element={<AdminLoginCallback />} />
      <Route path="/scanner-login"         element={<ScannerLogin />} />
      <Route path="/scanner-login-callback" element={<ScannerLoginCallback />} />

      {/* Onboarding (login required, but no onboarding guard to avoid loop) */}
      <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />

      {/* Protected Routes (Require login + completed onboarding — DB-verified) */}
      <Route path="/slots"     element={<ProtectedRoute><OnboardingGuard><Slots /></OnboardingGuard></ProtectedRoute>} />
      <Route path="/booking"   element={<ProtectedRoute><OnboardingGuard><Booking /></OnboardingGuard></ProtectedRoute>} />
      <Route path="/ticket"    element={<ProtectedRoute><OnboardingGuard><Ticket /></OnboardingGuard></ProtectedRoute>} />
      <Route path="/account"   element={<ProtectedRoute><OnboardingGuard><Account /></OnboardingGuard></ProtectedRoute>} />

      <Route path="/admin"        element={<AdminRoute><AdminDashboard /></AdminRoute>} />
      <Route path="/admin-events" element={<AdminRoute><AdminEvents /></AdminRoute>} />

      <Route path="/scanner" element={<ScannerRoute><Scanner /></ScannerRoute>} />
      <Route path="*"        element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
