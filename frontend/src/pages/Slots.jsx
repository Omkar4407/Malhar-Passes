import { useState, useEffect } from "react";
import axios from "axios";
import { useLocation, useNavigate } from "react-router-dom";
import Header from "../components/Header";
import { RefreshCw, Clock, Calendar, ChevronRight, Lock, Users } from "lucide-react";

const API = import.meta.env.VITE_BACKEND_URL;

function authHeader() {
  const token = localStorage.getItem("userToken");
  return { Authorization: `Bearer ${token}` };
}

function saveToSession(event, slots) {
  try {
    sessionStorage.setItem("slots_event", JSON.stringify(event));
    sessionStorage.setItem("slots_data",  JSON.stringify(slots));
  } catch (_) {}
}

function loadFromSession() {
  try {
    const event = JSON.parse(sessionStorage.getItem("slots_event"));
    const slots = JSON.parse(sessionStorage.getItem("slots_data"));
    return { event, slots };
  } catch (_) {
    return { event: null, slots: null };
  }
}

export default function Slots() {
  const { state }  = useLocation();
  const navigate   = useNavigate();

  const session = loadFromSession();
  const initEvent = state?.event  || session.event;
  const initSlots = state?.slots  || session.slots;

  const [event,      setEvent]      = useState(initEvent);
  const [slots,      setSlots]      = useState(initSlots);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError,  setLoadError]  = useState("");

  useEffect(() => {
    if (!initEvent) return;
    const fetchSlots = async () => {
      setRefreshing(true);
      try {
        const { data } = await axios.get(`${API}/get-slots?event_id=${initEvent.id}`);
        const fresh = data.slots || [];
        setSlots(fresh);
        saveToSession(initEvent, fresh);
      } catch (err) {
        if (!initSlots) setLoadError("Failed to load slots. Please go back and try again.");
      } finally {
        setRefreshing(false);
      }
    };
    fetchSlots();
  }, []);

  useEffect(() => {
    if (event && slots) saveToSession(event, slots);
  }, [event, slots]);

  if (!event) {
    return (
      <div className="min-h-screen bg-[#0b011c] text-[#eedcff] font-['Montserrat']">
        <Header />
        <div className="max-w-md mx-auto p-6 pt-24 text-center">
          <div className="bg-[#93000a]/20 border border-[#ffb4ab]/30 text-[#ffb4ab] p-4 rounded-xl">
            Invalid page state. Please go back and try again.
          </div>
          <button onClick={() => navigate("/events")} className="mt-6 text-[#ff00cf] hover:underline">
            ← Back to Events
          </button>
        </div>
      </div>
    );
  }

  if (loadError && !slots) {
    return (
      <div className="min-h-screen bg-[#0b011c] text-[#eedcff] font-['Montserrat']">
        <Header />
        <div className="max-w-md mx-auto p-6 pt-24 text-center">
          <div className="bg-[#93000a]/20 border border-[#ffb4ab]/30 text-[#ffb4ab] p-4 rounded-xl">
            {loadError}
          </div>
          <button onClick={() => navigate("/events")} className="mt-6 text-[#ff00cf] hover:underline">
            ← Back to Events
          </button>
        </div>
      </div>
    );
  }

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const { data } = await axios.get(`${API}/get-slots?event_id=${event.id}`);
      const fresh = data.slots || [];
      setSlots(fresh);
      saveToSession(event, fresh);
    } catch (err) {
      console.error("Refresh slots error:", err);
    }
    setRefreshing(false);
  };

  const [checkingSlot, setCheckingSlot] = useState(null);
  const [checkError, setCheckError] = useState("");

  const handleSelect = async (slot) => {
    if (checkingSlot) return;
    setCheckingSlot(slot.id);
    setCheckError("");
    try {
      const { data: check } = await axios.get(
        `${API}/check-slot?slot_id=${slot.id}`,
        { headers: authHeader() }
      );
      if (!check.allowed) {
        if (check.reason === "DUPLICATE_TICKET") {
          setCheckError("You already have a ticket for this slot.");
        } else if (check.reason === "SLOT_FULL") {
          setCheckError("This slot is sold out. Please pick another.");
        } else {
          setCheckError(check.message || "Cannot book this slot.");
        }
        setCheckingSlot(null);
        return;
      }
    } catch {}
    setCheckingSlot(null);
    navigate("/booking", { state: { slot, event } });
  };

  return (
    <div className="min-h-screen bg-[#0b011c] text-[#eedcff] font-['Montserrat'] relative overflow-x-hidden pb-20">
      <Header />

      {/* Ambient Glow */}
      <div className="absolute top-[10%] right-[-10%] w-[400px] h-[400px] bg-[#6f24bb] rounded-full blur-[150px] opacity-10 pointer-events-none" />

      <div className="relative z-10 max-w-xl mx-auto px-5 py-8 space-y-6">
        
        {/* Header Hero */}
        <div className="glass-card p-6 overflow-hidden relative group">
          <div className="absolute inset-0 bg-gradient-to-br from-[#00abff]/10 to-transparent opacity-50" />
          <div className="absolute top-0 left-0 w-1 h-full bg-[#00abff] shadow-[0_0_15px_#00abff]" />
          
          <div className="relative z-10">
            <p className="text-[10px] font-bold text-[#92ccff] uppercase tracking-[0.2em] mb-2">Select a slot for</p>
            <h1 className="text-4xl md:text-5xl font-black text-[#eedcff] mb-4 tracking-wide" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
              {event.name}
            </h1>
            
            <div className={`inline-flex items-center px-4 py-1.5 rounded-xl border font-bold text-sm shadow-[0_0_15px_currentColor] ${
              event.price > 0 
                ? "bg-[#ff6b00]/10 border-[#ff6b00]/30 text-[#ff6b00]" 
                : "bg-[#00abff]/10 border-[#00abff]/30 text-[#00abff]"
            }`}>
              {event.price > 0 ? `₹${event.price}` : "FREE ENTRY"}
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center px-1">
          <span className="text-[#a78899] text-sm font-semibold tracking-wide">
            {slots.length} available slot{slots.length !== 1 ? "s" : ""}
          </span>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wider px-4 py-2 rounded-lg border transition-all ${
              refreshing 
                ? "bg-[#261938] border-[#a78899]/20 text-[#a78899] cursor-not-allowed" 
                : "bg-[#00abff]/10 border-[#00abff]/30 text-[#00abff] hover:bg-[#00abff]/20 hover:shadow-[0_0_15px_rgba(0,171,255,0.2)]"
            }`}
          >
            <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {checkError && (
          <div className="bg-[#93000a]/20 border border-[#ffb4ab]/30 text-[#ffb4ab] p-4 rounded-xl text-sm font-medium flex items-start gap-3">
            <span>⚠️</span>
            <p className="leading-snug pt-0.5">{checkError}</p>
          </div>
        )}

        {slots.length === 0 && (
          <div className="glass-card p-12 text-center border-dashed border-[#a78899]/30">
            <p className="text-[#a78899] font-medium">No slots currently available.</p>
          </div>
        )}

        <div className="space-y-4">
          {slots.map((slot) => {
            const isReleased = slot.is_released === true;
            const isFull     = (slot.booked_count ?? 0) >= slot.capacity;
            const canBook    = isReleased && !isFull;
            const spotsLeft  = slot.capacity - (slot.booked_count ?? 0);

            return (
              <button
                key={slot.id}
                onClick={() => canBook && !checkingSlot && handleSelect(slot)}
                disabled={!canBook || checkingSlot}
                className={`w-full text-left p-5 rounded-2xl border transition-all duration-300 relative overflow-hidden group ${
                  canBook
                    ? "bg-[#261938]/80 border-[#a78899]/20 hover:border-[#ff00cf]/50 hover:bg-[#312443]/90 hover:shadow-[0_5px_30px_rgba(255,0,207,0.1)] cursor-pointer"
                    : "bg-[#140725]/50 border-[#a78899]/10 opacity-70 cursor-not-allowed"
                }`}
              >
                {canBook && (
                  <div className="absolute top-0 right-0 w-32 h-32 bg-[#ff00cf] rounded-full blur-[60px] opacity-0 group-hover:opacity-10 transition-opacity duration-500 pointer-events-none" />
                )}

                <div className="flex justify-between items-center relative z-10">
                  <div className="flex-1 min-w-0 pr-4">
                    <h3 className="text-xl font-bold text-[#eedcff] mb-3 truncate font-['Montserrat']">
                      {slot.name}
                    </h3>
                    
                    <div className="flex flex-wrap gap-2">
                      {slot.date && (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#0b011c]/60 text-[#dab8ff] text-xs font-semibold border border-[#a78899]/10">
                          <Calendar size={12} className="text-[#00abff]" /> {slot.date}
                        </div>
                      )}
                      {slot.time && (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#0b011c]/60 text-[#dab8ff] text-xs font-semibold border border-[#a78899]/10">
                          <Clock size={12} className="text-[#ff6b00]" /> {slot.time}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-3 flex-shrink-0">
                    {!isReleased ? (
                      <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#f59e0b]/10 border border-[#f59e0b]/20 text-[#f59e0b] text-[10px] font-bold uppercase tracking-wider">
                        <Lock size={12} /> Not Released
                      </span>
                    ) : isFull ? (
                      <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#a78899]/10 border border-[#a78899]/20 text-[#a78899] text-[10px] font-bold uppercase tracking-wider">
                        <Users size={12} /> Sold Out
                      </span>
                    ) : (
                      <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[10px] font-bold uppercase tracking-wider ${
                        spotsLeft <= 10 
                          ? "bg-[#ff6b00]/10 border-[#ff6b00]/30 text-[#ff6b00]" 
                          : "bg-[#16a34a]/10 border-[#16a34a]/30 text-[#16a34a]"
                      }`}>
                        <Users size={12} /> {spotsLeft} left
                      </span>
                    )}

                    {canBook && (
                      <div className="w-8 h-8 rounded-full bg-[#ff00cf]/10 border border-[#ff00cf]/30 flex items-center justify-center text-[#ffaddf] group-hover:bg-[#ff00cf] group-hover:text-white transition-colors shadow-[0_0_10px_rgba(255,0,207,0.2)]">
                        {checkingSlot === slot.id ? (
                          <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                        ) : (
                          <ChevronRight size={16} strokeWidth={3} />
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}