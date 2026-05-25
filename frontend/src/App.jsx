import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
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

function AdminRoute({ children }) {
  return <TokenGuard tokenKey="adminToken" redirectTo="/admin-login">{children}</TokenGuard>;
}

function ScannerRoute({ children }) {
  return <TokenGuard tokenKey="scannerToken" redirectTo="/scanner-login">{children}</TokenGuard>;
}

function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const hash = window.location.hash;
        if (!hash) {
          navigate("/", { replace: true });
          return;
        }

        const params = new URLSearchParams(hash.substring(1));
        const accessToken = params.get("access_token");

        if (!accessToken) {
          navigate("/", { replace: true });
          return;
        }

        const { data } = await axios.post(`${API}/auth-supabase`, {
          access_token: accessToken,
        });

        if (data.token) {
          localStorage.setItem("userToken", data.token);
          if (data.user) {
            localStorage.setItem("userEmail", data.user.email || "");
          }
          // Force redirect and full reload to update Header and ProtectedRoutes
          window.location.href = "/";
        } else {
          navigate("/", { replace: true });
        }
      } catch (err) {
        console.error("Auth callback error:", err);
        navigate("/", { replace: true });
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", height: "100vh", background: "#0b011c", color: "#eedcff", fontFamily: "Montserrat, sans-serif" }}>
      <div style={{
        width: "36px",
        height: "36px",
        border: "4px solid rgba(255,0,207,0.2)",
        borderTop: "4px solid #ff00cf",
        borderRadius: "50%",
        animation: "_spin 0.8s linear infinite",
        marginBottom: "16px"
      }} />
      <style>{`@keyframes _spin { to { transform: rotate(360deg); } }`}</style>
      <p style={{ fontWeight: 600, letterSpacing: "0.05em" }}>Completing sign in...</p>
    </div>
  );
}

function App() {
  return (
    <Routes>
      {/* Set Events as the main public landing page */}
      <Route path="/"            element={<Events />} />
      <Route path="/events"      element={<Navigate to="/" replace />} />
      
      <Route path="/admin-login"   element={<AdminLogin />} />
      <Route path="/scanner-login" element={<ScannerLogin />} />
      
      {/* Google OAuth Callback route */}
      <Route path="/auth/callback" element={<AuthCallback />} />

      {/* Protected Routes (Require login via Google to book/view tickets) */}
      <Route path="/slots"     element={<ProtectedRoute><Slots /></ProtectedRoute>} />
      <Route path="/booking"   element={<ProtectedRoute><Booking /></ProtectedRoute>} />
      <Route path="/ticket"    element={<ProtectedRoute><Ticket /></ProtectedRoute>} />
      <Route path="/account"   element={<ProtectedRoute><Account /></ProtectedRoute>} />

      <Route path="/admin"        element={<AdminRoute><AdminDashboard /></AdminRoute>} />
      <Route path="/admin-events" element={<AdminRoute><AdminEvents /></AdminRoute>} />

      <Route path="/scanner" element={<ScannerRoute><Scanner /></ScannerRoute>} />
      <Route path="*"        element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;