import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { supabase } from "../lib/supabase";
import Header from "../components/Header";
import { Camera, User, Mail, GraduationCap, Phone, Calendar, MapPin, Clock, Ticket as TicketIcon, Loader2, ChevronRight, LogOut, ChevronDown } from "lucide-react";

const API = import.meta.env.VITE_BACKEND_URL;

export default function Account() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("details");
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);

  // Profile data from Supabase profiles table
  const [profile, setProfile] = useState({
    firstName: "",
    lastName: "",
    gender: "",
    dob: "",
    phone: "",
    email: "",
    photoUrl: null,
    isXavierite: null,
    college: "",
    course: "",
    year: "",
  });

  useEffect(() => {
    loadProfile();
    fetchTickets();
  }, []);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data: profileData, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("Failed to load profile:", error);
      }

      if (profileData) {
        setProfile({
          firstName: profileData.first_name || "",
          lastName: profileData.last_name || "",
          gender: profileData.gender || "",
          dob: profileData.dob || "",
          phone: profileData.phone || "",
          email: profileData.email || user.email || "",
          photoUrl: profileData.photo_url || null,
          isXavierite: profileData.is_xavierite,
          college: profileData.institution_name || "",
          course: profileData.course || "",
          year: profileData.year || "",
        });
      } else {
        // Fallback: set email from auth
        setProfile(p => ({ ...p, email: user.email || "" }));
      }
    } catch (err) {
      console.error("Profile load error:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTickets = async () => {
    setTicketsLoading(true);
    try {
      const token = localStorage.getItem("userToken");
      if (!token) return;
      const { data } = await axios.get(`${API}/my-tickets`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTickets(data.tickets || []);
    } catch (err) {
      console.error("Failed to fetch tickets:", err);
    } finally {
      setTicketsLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem("userToken");
    localStorage.removeItem("onboardingComplete");
    localStorage.removeItem("onboardingData");
    localStorage.removeItem("userAvatar");
    navigate("/");
  };

  const initials = profile.firstName
    ? profile.firstName[0].toUpperCase()
    : profile.email
      ? profile.email[0].toUpperCase()
      : "U";

  const fullName = [profile.firstName, profile.lastName].filter(Boolean).join(" ") || "Guest User";

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b011c] text-[#eedcff]">
        <Header />
        <div className="flex flex-col items-center justify-center pt-32 space-y-4">
          <div className="w-12 h-12 border-4 border-[#ff00cf]/20 border-t-[#ff00cf] rounded-full animate-spin" />
          <p className="text-[#a78899]">Loading Profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b011c] text-[#eedcff] font-['Montserrat'] relative overflow-x-hidden pb-24">
      <Header />

      {/* Ambient Glow */}
      <div className="absolute top-[15%] left-[50%] w-[600px] h-[600px] bg-[#6f24bb] rounded-full blur-[180px] opacity-[0.06] pointer-events-none -translate-x-1/2 -z-0" />

      <div className="relative z-10 max-w-5xl mx-auto px-5 py-8 flex flex-col md:flex-row gap-8 md:gap-12">

        {/* ── Left Sidebar (Profile & Tabs) ── */}
        <div className="w-full md:w-72 flex-shrink-0 flex flex-col">
          {/* Profile Header */}
          <div className="flex flex-col items-center md:items-start mb-8 text-center md:text-left">
            <div className="relative w-28 h-28 md:w-32 md:h-32 rounded-full mb-4 md:mb-5 shadow-[0_0_30px_rgba(255,0,207,0.15)]">
              <div className="absolute inset-[-3px] rounded-full bg-gradient-to-br from-[#ff00cf] to-[#9d00ff] opacity-70" />
              <div className="absolute inset-[2px] rounded-full bg-[#0b011c]" />
              <div className="absolute inset-[4px] rounded-full overflow-hidden bg-[#261938] flex items-center justify-center">
                {profile.photoUrl ? (
                  <img src={profile.photoUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-4xl md:text-5xl font-black text-[#ffaddf]">{initials}</span>
                )}
              </div>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-white tracking-wide" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
              {fullName}
            </h2>
            <p className="text-sm text-[#a89bbc] mt-1">{profile.email || profile.phone || "No contact info"}</p>
          </div>

          {/* Tab Switcher */}
          <div className="flex md:flex-col mb-8 bg-[#1a0d2b] md:bg-transparent rounded-full md:rounded-none p-1 md:p-0 border border-[#ff00cf]/10 md:border-none gap-2">
            <button
              onClick={() => setActiveTab("details")}
              className={`flex-1 md:w-full py-2.5 md:py-3.5 md:px-5 rounded-full md:rounded-xl text-sm font-bold md:text-left transition-all duration-300 flex items-center md:gap-3 justify-center md:justify-start ${activeTab === "details"
                ? "bg-gradient-to-r from-[#ff00cf] to-[#9d00ff] md:from-[#ff00cf]/20 md:to-[#9d00ff]/20 md:border md:border-[#ff00cf]/50 text-white shadow-[0_0_15px_rgba(255,0,207,0.3)] md:shadow-[0_0_20px_rgba(255,0,207,0.15)]"
                : "text-[#a89bbc] hover:text-white md:bg-[#1a0d2b]/50 md:border md:border-white/5"
                }`}
            >
              <User size={16} className="hidden md:block" /> Details
            </button>
            <button
              onClick={() => setActiveTab("events")}
              className={`flex-1 md:w-full py-2.5 md:py-3.5 md:px-5 rounded-full md:rounded-xl text-sm font-bold md:text-left transition-all duration-300 flex items-center md:gap-3 justify-center md:justify-start ${activeTab === "events"
                ? "bg-gradient-to-r from-[#ff00cf] to-[#9d00ff] md:from-[#ff00cf]/20 md:to-[#9d00ff]/20 md:border md:border-[#ff00cf]/50 text-white shadow-[0_0_15px_rgba(255,0,207,0.3)] md:shadow-[0_0_20px_rgba(255,0,207,0.15)]"
                : "text-[#a89bbc] hover:text-white md:bg-[#1a0d2b]/50 md:border md:border-white/5"
                }`}
            >
              <TicketIcon size={16} className="hidden md:block" /> Events
            </button>
          </div>

          {/* Logout Button (Moved to sidebar for desktop) */}
          <div className="hidden md:block mt-auto pt-4 border-t border-white/5">
            <button
              onClick={handleLogout}
              className="w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 bg-[#261938] hover:bg-[#93000a]/30 text-[#ffb4ab] border border-[#ffb4ab]/20 transition-all hover:border-[#ffb4ab]/40"
            >
              <LogOut size={16} /> Sign Out
            </button>
          </div>
        </div>

        {/* ── Right Content Area ── */}
        <div className="flex-1 max-w-3xl w-full">

          {/* ── Details Tab ── */}
          {activeTab === "details" && (
            <div className="space-y-6 animate-in fade-in duration-300">

              {/* Personal Info Grid */}
              <div className="mb-8">
                <h3 className="text-xl md:text-2xl font-bold text-white mb-4 pb-2 border-b border-white/10 tracking-wide" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
                  Personal Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <GridField label="First Name" value={profile.firstName} />
                  <GridField label="Last Name" value={profile.lastName} />

                  <GridField label="Gender" value={profile.gender ? profile.gender.charAt(0).toUpperCase() + profile.gender.slice(1) : ""} showChevron />
                  <GridField label="Date of Birth" value={profile.dob} showChevron />

                  <GridField label="Email Address" value={profile.email} colSpan={1} />
                  <GridField label="Phone Number" value={profile.phone ? `+91 ${profile.phone}` : ""} colSpan={1} />
                </div>
              </div>

              {/* Academic Info Grid */}
              <div className="mb-8">
                <h3 className="text-xl md:text-2xl font-bold text-white mb-4 pb-2 border-b border-white/10 tracking-wide mt-2" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
                  Academic Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <GridField label="Institution" value={profile.college} />
                  <GridField label="Course" value={profile.course} />

                  <GridField label="Academic Year" value={profile.year} showChevron />
                  <GridField label="Xavierite Status" value={profile.isXavierite === "yes" ? "Yes" : profile.isXavierite === "no" ? "No" : ""} showChevron />
                </div>
              </div>

              {/* Logout Button (Mobile Only) */}
              <div className="md:hidden">
                <button
                  onClick={handleLogout}
                  className="w-full py-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 bg-[#261938] hover:bg-[#93000a]/30 text-[#ffb4ab] border border-[#ffb4ab]/20 transition-all hover:border-[#ffb4ab]/40"
                >
                  <LogOut size={18} /> Sign Out
                </button>
              </div>
            </div>
          )}

          {/* ── Registered Events Tab ── */}
          {activeTab === "events" && (
            <div className="space-y-4 animate-in fade-in duration-300">
              {ticketsLoading ? (
                <div className="flex flex-col items-center justify-center py-16 space-y-4">
                  <Loader2 size={32} className="text-[#ff00cf] animate-spin" />
                  <p className="text-[#a89bbc] text-sm">Loading your tickets...</p>
                </div>
              ) : tickets.length === 0 ? (
                <div className="glass-card p-10 text-center">
                  <div className="w-16 h-16 rounded-full bg-[#261938] flex items-center justify-center mx-auto mb-4">
                    <TicketIcon size={28} className="text-[#a89bbc]" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">No Events Yet</h3>
                  <p className="text-sm text-[#a89bbc] mb-6">You haven't registered for any events. Browse available events and book your pass!</p>
                  <button
                    onClick={() => navigate("/")}
                    className="bg-gradient-to-r from-[#ff00cf] to-[#9d00ff] text-white font-bold px-8 py-3 rounded-xl transition-opacity hover:opacity-90 shadow-[0_0_15px_rgba(255,0,207,0.3)]"
                  >
                    Browse Events
                  </button>
                </div>
              ) : (
                tickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    onClick={() => navigate("/ticket", { state: { ticket } })}
                    className="glass-card p-5 flex items-center gap-4 cursor-pointer hover:border-[#ff00cf]/30 transition-all group"
                  >
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#ff00cf]/20 to-[#9d00ff]/20 flex items-center justify-center border border-[#ff00cf]/20 flex-shrink-0">
                      <TicketIcon size={22} className="text-[#ff00cf]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-white text-sm truncate">{ticket.event_name || ticket.name || `Event #${ticket.event_id}`}</h4>
                      <p className="text-xs text-[#a89bbc] mt-1">
                        {ticket.payment_status === "paid" ? "💳 Paid" : "🆓 Free"} · Ticket #{ticket.id?.toString().slice(-6)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${ticket.checked_in
                        ? "bg-green-500/20 text-green-400 border border-green-500/30"
                        : "bg-[#ff00cf]/10 text-[#ff00cf] border border-[#ff00cf]/20"
                        }`}>
                        {ticket.checked_in ? "CHECKED IN" : "ACTIVE"}
                      </span>
                      <ChevronRight size={16} className="text-[#a89bbc] group-hover:text-[#ff00cf] transition-colors" />
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Mobile Spacing */}
          <div className="h-10 md:hidden"></div>
        </div>
      </div>
    </div>
  );
}

// ── Grid Field Component ──
function GridField({ label, value, colSpan = 1, showChevron = false }) {
  return (
    <div className={`p-4 rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.04] transition-colors flex items-center justify-between ${colSpan === 2 ? 'md:col-span-2' : ''}`}>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-[#a89bbc] uppercase tracking-wider font-bold mb-1">
          {label}
        </p>
        <p className="text-sm md:text-[15px] font-medium text-white truncate">
          {value || "—"}
        </p>
      </div>
      {showChevron && (
        <ChevronDown size={16} className="text-[#a89bbc]/50 flex-shrink-0" />
      )}
    </div>
  );
}