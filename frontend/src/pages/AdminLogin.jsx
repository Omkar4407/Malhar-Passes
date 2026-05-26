import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { ShieldAlert, Loader2 } from "lucide-react";
import { supabase } from "../lib/supabase";

const API = import.meta.env.VITE_BACKEND_URL;

export default function AdminLogin() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleGoogleSignIn = async () => {
    setError("");
    setLoading(true);
    try {
      // Use Supabase OAuth to get a Google token
      // We use signInWithOAuth with a popup so we can intercept the access_token
      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/admin-login-callback`,
          queryParams: {
            // Request offline access — gets us a proper access token
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
          <p className="text-sm text-[#a78899] mt-2 font-medium">
            Sign in with your authorised Google account
          </p>
        </div>

        {/* Sign-In Card */}
        <div className="glass-card p-8 border-t-0 rounded-t-none space-y-6 -mt-6 pt-6">
          
          {error && (
            <div className="bg-[#93000a]/20 border border-[#ffb4ab]/30 text-[#ffb4ab] p-4 rounded-xl text-sm font-medium text-center">
              {error}
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

          <p className="text-center text-[#a78899]/60 text-xs leading-relaxed">
            Only Google accounts registered as <strong className="text-[#ff6b00]/80">super_admin</strong> in the admins table will be granted access.
          </p>
        </div>

        <p className="text-center text-[#a78899]/40 text-[10px] uppercase tracking-[0.2em] font-bold">
          High Security Area
        </p>
      </div>
    </div>
  );
}
