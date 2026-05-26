import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import { Scan, AlertTriangle, Loader2 } from "lucide-react";
import { supabase } from "../lib/supabase";

export default function ScannerLogin() {
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setError("");
    setLoading(true);
    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/scanner-login-callback`,
          queryParams: {
            access_type: "online",
            prompt: "select_account",
          },
          skipBrowserRedirect: false,
        },
      });
      if (oauthError) throw oauthError;
    } catch (err) {
      setError(err?.message || "Google sign-in failed.");
      setLoading(false);
    }
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
              Sign in with your authorised Google account
            </p>
          </div>

          <div className="glass-card p-8">
            {error && (
              <div className="bg-[#93000a]/20 border border-[#ffb4ab]/30 text-[#ffb4ab] p-4 rounded-xl text-sm flex items-start gap-3 mb-6">
                <AlertTriangle size={18} className="flex-shrink-0 mt-0.5" />
                <p className="leading-snug">{error}</p>
              </div>
            )}

            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full py-4 rounded-xl font-bold text-base flex items-center justify-center gap-3 transition-all bg-white text-[#3c4043] hover:bg-[#f8f9fa] shadow-[0_2px_8px_rgba(60,64,67,0.3)] hover:shadow-[0_4px_12px_rgba(60,64,67,0.4)] disabled:opacity-70 disabled:cursor-not-allowed border border-[#dadce0]"
            >
              {loading ? (
                <Loader2 size={20} className="animate-spin text-[#4285F4]" />
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
              )}
              {loading ? "Signing in…" : "Sign in with Google"}
            </button>

            <p className="text-center text-[#a78899]/60 text-xs leading-relaxed mt-4">
              Only Google accounts registered as <strong className="text-[#ff00cf]/80">admin</strong> in the admins table will be granted access.
            </p>
          </div>

          <p className="text-center text-[#a78899]/50 text-[10px] uppercase tracking-[0.2em] font-semibold">
            🔒 Secure Connection
          </p>
        </div>

      </div>
    </div>
  );
}
