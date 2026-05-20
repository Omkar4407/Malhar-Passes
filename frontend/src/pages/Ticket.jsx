import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import QRCode from "qrcode";
import Header from "../components/Header";
import { Ticket as TicketIcon, Calendar, Clock, MapPin, Download, ChevronDown, ChevronUp } from "lucide-react";

const API = import.meta.env.VITE_BACKEND_URL;

function authHeader() {
  return { Authorization: `Bearer ${localStorage.getItem("userToken")}` };
}

export function bustTicketsCache() {}

export default function Ticket() {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await axios.get(`${API}/my-tickets`, {
        headers: authHeader(),
      });
      setTickets(data.tickets || []);
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.removeItem("userToken");
        localStorage.removeItem("userPhone");
        navigate("/", { replace: true });
      } else {
        setError("Failed to load tickets. Please refresh.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", position: "relative" }}>
      <Header />

      {/* Ambient Glow */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#00abff] rounded-full blur-[150px] opacity-[0.08] pointer-events-none -z-10" />

      <div className="max-w-xl mx-auto px-5 py-8 space-y-6 relative z-10">
        
        <div className="flex items-center justify-between">
          <h1 className="text-5xl font-black text-[#eedcff] tracking-wide" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
            My Tickets
          </h1>
          {!loading && tickets.length > 0 && (
            <span className="px-4 py-1.5 rounded-full bg-[#6f24bb]/20 border border-[#dab8ff]/20 text-[#dab8ff] text-xs font-bold uppercase tracking-wider">
              {tickets.length} Ticket{tickets.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {error && (
          <div className="bg-[#93000a]/20 border border-[#ffb4ab]/30 text-[#ffb4ab] p-4 rounded-xl text-sm">
            {error}
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center p-16 glass-card">
            <div className="w-10 h-10 border-4 border-[#ff00cf]/20 border-t-[#ff00cf] rounded-full animate-spin mb-4" />
            <p className="text-[#a78899] font-medium">Loading your passes...</p>
          </div>
        )}

        {!loading && tickets.length === 0 && !error && (
          <div className="flex flex-col items-center justify-center p-16 glass-card text-center space-y-4">
            <div className="w-20 h-20 rounded-full bg-[#ff00cf]/10 flex items-center justify-center text-[#ffaddf] mb-2">
              <TicketIcon size={40} strokeWidth={1.5} />
            </div>
            <p className="text-[#eedcff] font-semibold text-lg">No tickets found</p>
            <p className="text-[#a78899] text-sm max-w-[250px]">You haven't booked any passes yet. Browse events to secure your spot.</p>
            <button 
              onClick={() => navigate("/events")}
              className="mt-4 px-8 py-3 bg-gradient-to-r from-[#ff00cf] to-[#6f24bb] rounded-xl font-bold text-white shadow-[0_0_20px_rgba(255,0,207,0.3)] hover:shadow-[0_0_30px_rgba(255,0,207,0.5)] transition-all"
            >
              Explore Events
            </button>
          </div>
        )}

        <div className="space-y-6">
          {tickets.map((ticket) => (
            <TicketCard key={ticket.id} ticket={ticket} />
          ))}
        </div>
      </div>
    </div>
  );
}

function TicketCard({ ticket }) {
  const [qr, setQr]             = useState("");
  const [qrError, setQrError]   = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    QRCode.toDataURL(
      JSON.stringify({ ticket_id: ticket.id }),
      { width: 250, margin: 2, color: { dark: '#0b011c', light: '#ffffff' } }
    )
      .then(setQr)
      .catch(() => setQrError(true));
  }, [ticket.id]);

  const isPaid      = ticket.payment_status === "paid";
  const isRejected  = ticket.rejected === true;
  const isCheckedIn = ticket.checked_in === true;

  return (
    <div className="glass-card overflow-hidden group">
      {/* Top Banner section */}
      <div className="relative p-6 bg-gradient-to-br from-[#261938] to-[#140725] border-b border-white/5">
        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-[#00abff] via-[#ff00cf] to-[#ff6b00]" />
        
        <div className="flex justify-between items-start mb-4">
          <div>
            <p className="text-[10px] font-bold text-[#a78899] uppercase tracking-[0.2em] mb-1">Event Pass</p>
            <h2 className="text-2xl font-black text-[#eedcff] uppercase tracking-wide font-['Bebas_Neue']">
              {ticket.slots?.events?.name || "MALHAR"}
            </h2>
          </div>
          <StatusBadge isRejected={isRejected} isCheckedIn={isCheckedIn} />
        </div>

        {ticket.slots && (
          <div className="flex flex-wrap gap-2 mt-4">
            {ticket.slots.name && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0b011c]/50 border border-white/5 text-[#dab8ff] text-xs font-semibold">
                <MapPin size={12} className="text-[#ff00cf]" /> {ticket.slots.name}
              </div>
            )}
            {ticket.slots.date && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0b011c]/50 border border-white/5 text-[#dab8ff] text-xs font-semibold">
                <Calendar size={12} className="text-[#00abff]" /> {ticket.slots.date}
              </div>
            )}
            {ticket.slots.time && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0b011c]/50 border border-white/5 text-[#dab8ff] text-xs font-semibold">
                <Clock size={12} className="text-[#ff6b00]" /> {ticket.slots.time}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Perforation Line */}
      <div className="relative h-6 bg-[#1a0d2b]">
        <div className="absolute top-1/2 left-0 w-full h-[1px] border-t-2 border-dashed border-[#a78899]/20" />
        <div className="absolute top-1/2 left-[-12px] w-6 h-6 bg-[#0b011c] rounded-full -translate-y-1/2 shadow-inner" />
        <div className="absolute top-1/2 right-[-12px] w-6 h-6 bg-[#0b011c] rounded-full -translate-y-1/2 shadow-inner" />
      </div>

      {/* Body section */}
      <div className="p-6 bg-[#1a0d2b]/50">
        <div className="flex items-center gap-4 mb-6">
          <div className="relative">
            {ticket.photo_url ? (
              <img
                src={ticket.photo_url}
                alt={ticket.name}
                className="w-16 h-16 rounded-2xl object-cover border-2 border-[#ff00cf]/30 shadow-[0_0_15px_rgba(255,0,207,0.15)]"
                onError={(e) => { e.target.style.display = "none"; }}
              />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#6f24bb] to-[#ff00cf] text-white font-black text-2xl flex items-center justify-center shadow-[0_0_15px_rgba(255,0,207,0.2)]">
                {ticket.name?.[0]?.toUpperCase() || "?"}
              </div>
            )}
            {isPaid && (
              <div className="absolute -bottom-2 -right-2 bg-[#16a34a] text-white text-[9px] font-bold px-2 py-0.5 rounded-md border border-[#0b011c] shadow-lg">
                PAID
              </div>
            )}
          </div>
          
          <div>
            <p className="text-lg font-bold text-[#eedcff] mb-0.5">{ticket.name}</p>
            <p className="text-sm text-[#a78899] font-medium">{ticket.college}</p>
            <p className="text-xs text-[#a78899]/70 mt-1 font-mono">{ticket.phone}</p>
          </div>
        </div>

        <button 
          onClick={() => setExpanded(!expanded)} 
          className="w-full flex items-center justify-center gap-2 py-3 bg-[#261938]/50 hover:bg-[#312443]/80 border border-[#a78899]/10 rounded-xl text-[#ffaddf] text-sm font-bold transition-colors"
        >
          {expanded ? (
             <><ChevronUp size={16} /> Hide QR Code</>
          ) : (
             <><ChevronDown size={16} /> Reveal QR Code</>
          )}
        </button>

        {expanded && (
          <div className="mt-4 pt-4 border-t border-white/5 flex flex-col items-center animate-in slide-in-from-top-2 duration-300">
            <div className="p-4 bg-white rounded-2xl shadow-[0_0_30px_rgba(255,255,255,0.1)] mb-4">
              {qrError ? (
                <p className="text-red-500 text-sm font-bold p-8">Failed to generate QR</p>
              ) : qr ? (
                <img src={qr} alt="QR Code" className="w-48 h-48" />
              ) : (
                <div className="w-48 h-48 flex items-center justify-center text-gray-400">Generating...</div>
              )}
            </div>
            
            <div className="flex items-center justify-between w-full max-w-[240px]">
              <p className="text-[10px] text-[#a78899] font-mono tracking-wider">ID: {ticket.id.slice(0,12)}...</p>
              {qr && (
                <a
                  href={qr}
                  download={`ticket-${ticket.id}.png`}
                  className="flex items-center gap-1.5 text-xs font-bold text-[#00abff] hover:text-[#92ccff] transition-colors"
                >
                  <Download size={14} /> Save Image
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ isRejected, isCheckedIn }) {
  if (isRejected) {
    return (
      <span className="px-3 py-1 rounded-full bg-[#93000a]/20 border border-[#ffb4ab]/30 text-[#ffb4ab] text-[10px] font-bold uppercase tracking-wider shadow-[0_0_10px_rgba(147,0,10,0.2)]">
        🚫 Rejected
      </span>
    );
  }
  if (isCheckedIn) {
    return (
      <span className="px-3 py-1 rounded-full bg-[#16a34a]/20 border border-[#16a34a]/30 text-[#16a34a] text-[10px] font-bold uppercase tracking-wider shadow-[0_0_10px_rgba(22,163,74,0.2)]">
        ✓ Checked In
      </span>
    );
  }
  return (
    <span className="px-3 py-1 rounded-full bg-[#f59e0b]/10 border border-[#f59e0b]/20 text-[#f59e0b] text-[10px] font-bold uppercase tracking-wider">
      Active
    </span>
  );
}