import { Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import axios from "axios";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
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

// ── FIX: Real token verification via backend ──────────────────────────────────
// Previously: verifyToken() just checked if a token string existed in
// localStorage — any non-empty string passed. "dev-token" was accepted as valid.
// This meant the route guard provided zero security: anyone could set
// localStorage.setItem('userToken', 'anything') and access protected routes.
//
// Now: calls /verify-token on the backend which does jwt.verify() with the
// real secret. Expired tokens, tampered tokens, and "dev-token" will all fail
// and redirect the user to login.
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
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        <style>{`@keyframes _spin { to { transform: rotate(360deg); } }`}</style>
        <div style={{
          width: "36px",
          height: "36px",
          border: "4px solid #eee",
          borderTop: "4px solid #FF5C1A",
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

function App() {
  return (
    <Routes>
      <Route path="/"            element={<Login />} />
      <Route path="/admin-login"   element={<AdminLogin />} />
      <Route path="/scanner-login" element={<ScannerLogin />} />

      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/events"    element={<ProtectedRoute><Events /></ProtectedRoute>} />
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