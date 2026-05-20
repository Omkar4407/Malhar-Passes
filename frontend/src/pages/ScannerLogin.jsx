import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import axios from "axios";
import { Scan, AlertTriangle, ArrowRight, Loader2 } from "lucide-react";

export default function ScannerLogin() {
  const navigate = useNavigate();

  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError("");
    const { email, password } = form;

    if (!email || !password) {
      setError("Please fill in all fields.");
      return;
    }

    setLoading(true);

    try {
      const { data } = await axios.post(`${import.meta.env.VITE_BACKEND_URL}/scanner-login`, {
        email: email.trim().toLowerCase(),
        password,
      });

      localStorage.setItem("scannerToken", data.token);
      localStorage.setItem("scannerAuth", "true");
      localStorage.setItem("scannerEmail", data.admin.email);
      navigate("/scanner");
    } catch (err) {
      setError(err?.response?.data?.error || "Access denied. Check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === "Enter") handleLogin();
  };

  return (
    <div className="min-h-screen bg-[#0b011c] text-[#eedcff] font-['Montserrat'] relative overflow-hidden flex flex-col">
      <Header />

      {/* Ambient Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#6f24bb] rounded-full blur-[150px] opacity-20 pointer-events-none" />

      <div className="flex-1 flex flex-col items-center justify-center p-6 relative z-10">
        
        <div className="w-full max-w-md space-y-8">
          {/* Logo Section */}
          <div className="text-center space-y-3">
            <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-[#ff00cf]/20 to-[#6f24bb]/20 border border-[#ff00cf]/30 flex items-center justify-center shadow-[0_0_30px_rgba(255,0,207,0.2)] mb-6">
              <Scan size={36} className="text-[#ffaddf]" />
            </div>
            <h1 className="text-4xl font-black text-[#eedcff] tracking-wide font-['Bebas_Neue']">
              Scanner Access
            </h1>
            <p className="text-[#a78899] font-medium text-sm">
              Authorised personnel only
            </p>
          </div>

          <div className="glass-card p-8">
            {error && (
              <div className="bg-[#93000a]/20 border border-[#ffb4ab]/30 text-[#ffb4ab] p-4 rounded-xl text-sm flex items-start gap-3 mb-6">
                <AlertTriangle size={18} className="flex-shrink-0 mt-0.5" />
                <p className="leading-snug">{error}</p>
              </div>
            )}

            <div className="space-y-5">
              <div>
                <label className="text-[11px] font-bold text-[#a78899] uppercase tracking-wider block mb-2">Admin Email</label>
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  onKeyDown={handleKey}
                  className="w-full bg-[#140725]/80 border border-[#a78899]/20 rounded-xl px-4 py-3.5 text-[#eedcff] placeholder:text-[#a78899]/40 focus:outline-none focus:border-[#ff00cf] focus:ring-1 focus:ring-[#ff00cf]/50 transition-all font-medium"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#a78899] uppercase tracking-wider block mb-2">Password</label>
                <input
                  type="password"
                  placeholder="Enter scanner password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  onKeyDown={handleKey}
                  className="w-full bg-[#140725]/80 border border-[#a78899]/20 rounded-xl px-4 py-3.5 text-[#eedcff] placeholder:text-[#a78899]/40 focus:outline-none focus:border-[#ff00cf] focus:ring-1 focus:ring-[#ff00cf]/50 transition-all font-medium"
                />
              </div>

              <button
                onClick={handleLogin}
                disabled={loading}
                className="w-full mt-2 py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all bg-gradient-to-r from-[#ff00cf] to-[#6f24bb] text-white shadow-[0_0_20px_rgba(255,0,207,0.3)] hover:shadow-[0_0_30px_rgba(255,0,207,0.5)] disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? <Loader2 size={20} className="animate-spin" /> : "Authenticate"} 
                {!loading && <ArrowRight size={20} />}
              </button>
            </div>
          </div>

          <p className="text-center text-[#a78899]/50 text-[10px] uppercase tracking-[0.2em] font-semibold">
            🔒 Secure Connection
          </p>
        </div>

      </div>
    </div>
  );
}