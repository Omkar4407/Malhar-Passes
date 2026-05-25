import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { ShieldAlert, ArrowRight, Loader2, Eye, EyeOff } from "lucide-react";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [attemptsLeft, setAttemptsLeft] = useState(null); // null = not yet tried
  const navigate = useNavigate();

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setError("Please fill in all fields.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await axios.post(`${import.meta.env.VITE_BACKEND_URL}/admin-login`, {
        email: email.trim().toLowerCase(),
        password,
      });
      // Successful login — clear counter and navigate
      setAttemptsLeft(null);
      localStorage.setItem("adminToken", res.data.token);
      localStorage.setItem("admin", JSON.stringify(res.data.admin));
      navigate("/admin");
    } catch (err) {
      // axios lowercases all header names; express-rate-limit v6+ uses 'ratelimit-remaining'
      const hdrs = err?.response?.headers || {};
      const remaining = hdrs["ratelimit-remaining"] ?? hdrs["x-ratelimit-remaining"];
      if (remaining !== undefined) setAttemptsLeft(Number(remaining));
      setError(err?.response?.data?.error || "Login failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b011c] text-[#eedcff] font-['Montserrat'] relative overflow-hidden flex flex-col items-center justify-center p-6">
      
      {/* Ambient Glow */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#ff6b00] rounded-full blur-[180px] opacity-10 pointer-events-none translate-x-1/3 -translate-y-1/3" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[#ff00cf] rounded-full blur-[150px] opacity-10 pointer-events-none -translate-x-1/3 translate-y-1/3" />

      <div className="w-full max-w-md relative z-10 space-y-6">
        
        {/* Hero Banner */}
        <div className="glass-card p-8 border-b-0 rounded-b-none relative overflow-hidden text-center bg-gradient-to-br from-[#1a0d2b] to-[#140725]">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#ff00cf] via-[#ff6b00] to-[#ff00cf]" />
          
          <div className="w-16 h-16 mx-auto rounded-2xl bg-[#ff6b00]/10 border border-[#ff6b00]/30 flex items-center justify-center shadow-[0_0_20px_rgba(255,107,0,0.2)] mb-4">
            <ShieldAlert size={32} className="text-[#ff6b00]" />
          </div>
          
          <div className="inline-block bg-[#ff6b00]/20 text-[#ff6b00] text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full border border-[#ff6b00]/30 mb-3">
            System Control
          </div>
          <h1 className="text-4xl font-black text-[#eedcff] tracking-wide font-['Bebas_Neue']">
            Admin Panel
          </h1>
        </div>

        {/* Form Card */}
        <div className="glass-card p-8 border-t-0 rounded-t-none space-y-6 -mt-6 pt-6">
          
          {error && (
            <div className="bg-[#93000a]/20 border border-[#ffb4ab]/30 text-[#ffb4ab] p-4 rounded-xl text-sm font-medium text-center">
              {error}
            </div>
          )}

          {/* Attempts remaining pill */}
          {attemptsLeft !== null && !error.includes("wait") && (
            <div className={`flex items-center justify-center gap-2 text-xs font-bold px-4 py-2 rounded-full border ${
              attemptsLeft <= 1
                ? "bg-[#93000a]/30 border-[#ffb4ab]/40 text-[#ffb4ab]"
                : "bg-[#261938]/60 border-[#a78899]/20 text-[#a78899]"
            }`}>
              <span className={`w-2 h-2 rounded-full ${attemptsLeft <= 1 ? "bg-[#ffb4ab]" : "bg-[#a78899]"}`} />
              {attemptsLeft} attempt{attemptsLeft !== 1 ? "s" : ""} remaining
            </div>
          )}

          <div className="space-y-5">
            <div>
              <label className="text-[11px] font-bold text-[#a78899] uppercase tracking-wider block mb-2" htmlFor="admin-email">Email Address</label>
              <input
                id="admin-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); if (error) setError(""); }}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                className="w-full bg-[#140725]/80 border border-[#a78899]/20 rounded-xl px-4 py-3.5 text-[#eedcff] placeholder:text-[#a78899]/40 focus:outline-none focus:border-[#ff6b00] focus:ring-1 focus:ring-[#ff6b00]/50 transition-all font-medium"
                autoComplete="email"
                autoFocus
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-[#a78899] uppercase tracking-wider block mb-2" htmlFor="admin-password">Password</label>
              <div className="relative">
                <input
                  id="admin-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); if (error) setError(""); }}
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                  className="w-full bg-[#140725]/80 border border-[#a78899]/20 rounded-xl px-4 py-3.5 pr-12 text-[#eedcff] placeholder:text-[#a78899]/40 focus:outline-none focus:border-[#ff6b00] focus:ring-1 focus:ring-[#ff6b00]/50 transition-all font-medium"
                />
                <button
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#a78899] hover:text-[#eedcff] transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              onClick={handleLogin}
              disabled={loading}
              className="w-full mt-2 py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all bg-gradient-to-r from-[#ff6b00] to-[#ff00cf] text-white shadow-[0_0_20px_rgba(255,107,0,0.3)] hover:shadow-[0_0_30px_rgba(255,107,0,0.5)] disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 size={20} className="animate-spin" /> : "Access Dashboard"} 
              {!loading && <ArrowRight size={20} />}
            </button>
          </div>
        </div>

        <p className="text-center text-[#a78899]/40 text-[10px] uppercase tracking-[0.2em] font-bold">
          High Security Area
        </p>
      </div>
    </div>
  );
}