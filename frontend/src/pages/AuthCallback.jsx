import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const API = import.meta.env.VITE_API_URL;

export default function AuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");

    if (!code) {
      setError("No login code received from Google.");
      setTimeout(() => navigate("/"), 2000);
      return;
    }

    axios
      .post(`${API}/auth/google/callback`, { code })
      .then(({ data }) => {
        if (data.success && data.token) {
          localStorage.setItem("userToken", data.token);
          localStorage.setItem("userEmail", data.user.email);
          localStorage.setItem("userName", data.user.name);
          axios.defaults.headers.common["Authorization"] = `Bearer ${data.token}`;
          // ✅ Goes to phone verify page — NOT dashboard
          navigate("/events");
        } else {
          setError("Login failed. Please try again.");
          setTimeout(() => navigate("/"), 2000);
        }
      })
      .catch(() => {
        setError("Something went wrong. Redirecting...");
        setTimeout(() => navigate("/"), 2000);
      });
  }, []);

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      background: "#fafafa",
    }}>
      {error ? (
        <p style={{ color: "#d0312d", fontSize: 18 }}>{error}</p>
      ) : (
        <>
          <style>{`@keyframes _spin { to { transform: rotate(360deg); } }`}</style>
          <div style={{
            width: "40px",
            height: "40px",
            border: "4px solid #eee",
            borderTop: "4px solid #FF5C1A",
            borderRadius: "50%",
            animation: "_spin 0.8s linear infinite",
            marginBottom: 16,
          }} />
          <p style={{ color: "#1A0A00", fontSize: 18, fontWeight: 600 }}>
            Signing you in...
          </p>
        </>
      )}
    </div>
  );
}