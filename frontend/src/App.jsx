import { Routes, Route, Navigate } from "react-router-dom";
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

// Redirects logged-in users to /onboarding if they haven't completed it yet
function OnboardingGuard({ children }) {
  const onboarded = localStorage.getItem("onboardingComplete") === "true";
  if (!onboarded) return <Navigate to="/onboarding" replace />;
  return children;
}

function AdminRoute({ children }) {
  return <TokenGuard tokenKey="adminToken" redirectTo="/admin-login">{children}</TokenGuard>;
}

function ScannerRoute({ children }) {
  return <TokenGuard tokenKey="scannerToken" redirectTo="/scanner-login">{children}</TokenGuard>;
}

function App() {
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session) {
        // Exchange Supabase token for our custom backend token
        if (!localStorage.getItem("userToken")) {
          try {
            const { data } = await axios.post(
              `${API}/auth-supabase`, 
              { access_token: session.access_token },
              { headers: { Authorization: `Bearer ${session.access_token}` } }
            );
            if (data.token) {
              localStorage.setItem("userToken", data.token);
              
              // Check DB for onboarding status
              const { data: profile } = await supabase
                .from("profiles")
                .select("is_onboarded, photo_url")
                .eq("id", session.user.id)
                .single();

              if (profile?.is_onboarded) {
                localStorage.setItem("onboardingComplete", "true");
                if (profile.photo_url) localStorage.setItem("userAvatar", profile.photo_url);
                window.location.reload();
              } else {
                localStorage.removeItem("onboardingComplete");
                window.location.href = "/onboarding";
              }
            }
          } catch (err) {
            console.error("Failed to authenticate with backend:", err);
          }
        }
      } else if (event === "SIGNED_OUT") {
        localStorage.removeItem("userToken");
        localStorage.removeItem("onboardingComplete");
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <Routes>
      {/* Set Events as the main public landing page */}
      <Route path="/"            element={<Events />} />
      <Route path="/events"      element={<Navigate to="/" replace />} />
      
      <Route path="/admin-login"   element={<AdminLogin />} />
      <Route path="/scanner-login" element={<ScannerLogin />} />

      {/* Onboarding (login required, but no onboarding guard to avoid loop) */}
      <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />

      {/* Protected Routes (Require login + completed onboarding) */}
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