import { useState } from "react";

import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { bustSlotsCache } from "./Events";
import { bustTicketsCache } from "./Ticket";
import { ImagePlus, X, CreditCard, Ticket as TicketIcon, Loader2 } from "lucide-react";

const API = import.meta.env.VITE_BACKEND_URL;
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

function authHeader() {
  const token = localStorage.getItem("userToken");
  return { Authorization: `Bearer ${token}` };
}

// Load Cashfree JS SDK dynamically
function loadCashfreeSDK() {
  return new Promise((resolve, reject) => {
    if (window.Cashfree) return resolve(window.Cashfree);
    const script = document.createElement("script");
    script.src = "https://sdk.cashfree.com/js/v3/cashfree.js";
    script.onload = () => resolve(window.Cashfree);
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

export default function Booking() {
  const [name, setName]           = useState("");
  const [college, setCollege]     = useState("");
  const [photo, setPhoto]         = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoUrl, setPhotoUrl]   = useState(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");

  const navigate  = useNavigate();
  const location  = useLocation();
  const slot  = location.state?.slot;
  const event = location.state?.event;

  if (!slot || !event) {
    return (
      <div className="min-h-screen bg-[#0b011c] text-[#eedcff] font-['Montserrat']">
        <div className="max-w-md mx-auto p-6 pt-24 text-center">
          <div className="bg-[#93000a]/20 border border-[#ffb4ab]/30 text-[#ffb4ab] p-4 rounded-xl">
            Invalid booking session. Please go back and select an event.
          </div>
          <button onClick={() => navigate("/events")} className="mt-6 text-[#ff00cf] hover:underline">
            ← Back to Events
          </button>
        </div>
      </div>
    );
  }

  const validate = () => {
    if (!name.trim())         return "Please enter your name.";
    if (name.trim().length > 100) return "Name must be 100 characters or fewer.";
    if (!college.trim())      return "Please enter your college name.";
    if (college.trim().length > 150) return "College name must be 150 characters or fewer.";
    if (!photoUrl)            return "Please upload a photo first.";
    return null;
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("Only JPEG, PNG, or WebP images are allowed.");
      e.target.value = "";
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      setError("Photo must be smaller than 5MB.");
      e.target.value = "";
      return;
    }
    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
    setPhotoUrl(null);
    if (error) setError("");
  };

  const readAsBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (err) => reject(err);
    });
  };

  const handleUploadPhoto = async () => {
    if (!photo) return;
    setUploading(true);
    setError("");
    try {
      const fileData = await readAsBase64(photo);
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}-${photo.name}`;
      const { data } = await axios.post(
        `${API}/upload`,
        { fileData, fileName },
        { headers: authHeader() }
      );
      setPhotoUrl(data.publicUrl);
    } catch (err) {
      console.error("Photo upload error:", err);
      setError(err.response?.data?.error || "Photo upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleBooking = async () => {
    const validationError = validate();
    if (validationError) { setError(validationError); return; }

    setLoading(true);
    setError("");
    try {
      const { data } = await axios.post(
        `${API}/book-free`,
        { name: name.trim(), college: college.trim(), slot_id: slot.id, event_id: event.id, photo_url: photoUrl },
        { headers: authHeader() }
      );
      bustSlotsCache(event.id);
      bustTicketsCache();
      navigate("/ticket", { state: { ticket: data.ticket } });
    } catch (err) {
      const msg = err.response?.data?.error;
      if (err.response?.status === 409) {
        if (err.response?.data?.code === "DUPLICATE_TICKET") {
          setError("You already have a ticket for this slot. You can book a different slot for this event.");
        } else {
          setError("Sorry, this slot just sold out. Please go back and pick another.");
        }
      } else {
        setError(msg || "Booking failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    const validationError = validate();
    if (validationError) { setError(validationError); return; }

    setLoading(true);
    setError("");
    try {
      const { data: order } = await axios.post(
        `${API}/create-order`,
        { amount: event.price, slot_id: slot.id, event_id: event.id },
        { headers: authHeader() }
      );

      const cashfree = await loadCashfreeSDK();
      const cf = cashfree({ mode: import.meta.env.VITE_CASHFREE_ENV || "production" });

      cf.checkout({
        paymentSessionId: order.payment_session_id,
        redirectTarget: "_modal",
      }).then(async (result) => {
        if (result.error) {
          setError(result.error.message || "Payment failed. Please try again.");
          setLoading(false);
          return;
        }

        if (result.paymentDetails || result.redirect) {
          try {
            const verify = await axios.post(
              `${API}/verify-payment`,
              {
                order_id: order.order_id,
                name: name.trim(),
                college: college.trim(),
                slot_id: slot.id,
                event_id: event.id,
                photo_url: photoUrl,
              },
              { headers: authHeader() }
            );

            if (verify.data.success) {
              bustSlotsCache(event.id);
              bustTicketsCache();
              navigate("/ticket", { state: { ticket: verify.data.ticket } });
            } else {
              setError("Payment verification failed. Please contact support.");
              setLoading(false);
            }
          } catch (err) {
            if (err.response?.status === 409) {
              setError("Slot sold out after payment. Please contact support for a refund.");
            } else {
              setError(err.response?.data?.error || "Payment verification failed. Please contact support.");
            }
            setLoading(false);
          }
        } else {
          setLoading(false);
        }
      });
    } catch (err) {
      if (err.response?.status === 409) {
        if (err.response?.data?.code === "DUPLICATE_TICKET") {
          setError("You already have a ticket for this slot. You can book a different slot for this event.");
        } else {
          setError("This slot just sold out. Please go back and pick another.");
        }
      } else {
        setError(err.response?.data?.error || "Could not initiate payment. Please try again.");
      }
      setLoading(false);
    }
  };

  const isPhotoReady = !!photoUrl;
  const isFormReady  = name.trim() && college.trim() && isPhotoReady;

  return (
    <div className="min-h-screen bg-[#0b011c] text-[#eedcff] font-['Montserrat'] relative overflow-x-hidden pb-20">
      
      {/* Background Orbs */}
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-[#ff00cf] rounded-full blur-[150px] opacity-10 pointer-events-none translate-x-1/3 -translate-y-1/3" />
      <div className="absolute top-[40%] left-0 w-[300px] h-[300px] bg-[#6f24bb] rounded-full blur-[100px] opacity-10 pointer-events-none -translate-x-1/2" />

      <div className="relative z-10 max-w-md mx-auto px-5 pt-20 space-y-6">
        
        {/* Header Hero */}
        <div className="glass-card p-6 overflow-hidden relative group">
          <div className="absolute inset-0 bg-gradient-to-br from-[#ff00cf]/10 to-transparent opacity-50" />
          <div className="absolute top-0 left-0 w-1 h-full bg-[#ff00cf] shadow-[0_0_15px_#ff00cf]" />
          
          <div className="relative z-10">
            <span className="inline-block px-3 py-1 rounded-full border border-[#ffaddf]/30 bg-[#ffaddf]/10 text-[#ffaddf] text-[10px] font-bold uppercase tracking-widest mb-3">
              Booking
            </span>
            <h1 className="text-4xl font-black text-[#eedcff] mb-2 tracking-wide" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
              Secure Your Pass
            </h1>
            <p className="text-[#a78899] font-medium mb-4">
              {event.name}
            </p>
            <div className="inline-flex items-center gap-2 bg-[#140725] border border-[#ffaddf]/10 px-4 py-2 rounded-xl text-sm font-semibold text-[#dab8ff]">
              <span>🕐</span>
              {slot.name}{slot.time ? ` — ${slot.time}` : ""}
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-[#93000a]/20 border border-[#ffb4ab]/30 text-[#ffb4ab] p-4 rounded-xl text-sm flex items-start gap-3">
            <span>⚠️</span>
            <p className="leading-snug pt-0.5">{error}</p>
          </div>
        )}

        {/* Form */}
        <div className="glass-card p-6 space-y-5">
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-[#a78899] uppercase tracking-wider block">Full Name *</label>
            <input
              type="text"
              placeholder="e.g. Omkar Sharma"
              value={name}
              onChange={(e) => { setName(e.target.value); if (error) setError(""); }}
              maxLength={100}
              className="w-full bg-[#140725]/80 border border-[#a78899]/20 rounded-xl px-4 py-3.5 text-[#eedcff] placeholder:text-[#a78899]/50 focus:outline-none focus:border-[#ff00cf] focus:ring-1 focus:ring-[#ff00cf]/50 transition-all font-medium"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-bold text-[#a78899] uppercase tracking-wider block">College *</label>
            <input
              type="text"
              placeholder="e.g. St. Xavier's College"
              value={college}
              onChange={(e) => { setCollege(e.target.value); if (error) setError(""); }}
              maxLength={150}
              className="w-full bg-[#140725]/80 border border-[#a78899]/20 rounded-xl px-4 py-3.5 text-[#eedcff] placeholder:text-[#a78899]/50 focus:outline-none focus:border-[#ff00cf] focus:ring-1 focus:ring-[#ff00cf]/50 transition-all font-medium"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-bold text-[#a78899] uppercase tracking-wider block">ID Photo *</label>
            <div className="relative">
              <input
                id="booking-photo"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                capture="user"
                onChange={handlePhotoChange}
                className="hidden"
              />
              
              {photoPreview ? (
                <div className="relative rounded-xl overflow-hidden border border-[#a78899]/30 group">
                  <img src={photoPreview} alt="Preview" className="w-full h-48 object-cover" />
                  {!isPhotoReady && !uploading && (
                    <button
                      onClick={() => { setPhoto(null); setPhotoPreview(null); setPhotoUrl(null); }}
                      className="absolute top-2 right-2 w-8 h-8 bg-black/50 backdrop-blur rounded-full flex items-center justify-center text-white hover:bg-red-500/80 transition-colors"
                    >
                      <X size={16} />
                    </button>
                  )}
                  {isPhotoReady && (
                    <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-black/80 to-transparent p-3 flex items-center justify-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-[#16a34a] shadow-[0_0_8px_#16a34a]" />
                      <span className="text-xs font-bold text-[#16a34a] uppercase tracking-wider">Uploaded</span>
                    </div>
                  )}
                </div>
              ) : (
                <label 
                  htmlFor="booking-photo" 
                  className="flex flex-col items-center justify-center gap-3 w-full h-40 border-2 border-dashed border-[#a78899]/30 rounded-xl bg-[#140725]/50 hover:bg-[#140725] hover:border-[#ff00cf]/50 transition-all cursor-pointer group"
                >
                  <div className="w-12 h-12 rounded-full bg-[#ff00cf]/10 flex items-center justify-center text-[#ffaddf] group-hover:scale-110 group-hover:bg-[#ff00cf]/20 transition-all">
                    <ImagePlus size={24} />
                  </div>
                  <span className="text-sm font-medium text-[#a78899] group-hover:text-[#dab8ff] px-4 text-center">
                    Tap to upload ID photo<br/>
                    <span className="text-[10px] opacity-70 mt-1 block uppercase tracking-widest">Max 5MB • JPG/PNG/WEBP</span>
                  </span>
                </label>
              )}

              {photo && !isPhotoReady && (
                <button
                  onClick={handleUploadPhoto}
                  disabled={uploading}
                  className="w-full mt-3 py-3 rounded-xl font-bold text-sm bg-[#3c2e4e] text-white hover:bg-[#413353] transition-colors flex items-center justify-center gap-2"
                >
                  {uploading ? <Loader2 size={16} className="animate-spin" /> : "Confirm & Upload"}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Action Button */}
        <button
          disabled={loading || !isFormReady}
          onClick={event.price > 0 ? handlePayment : handleBooking}
          className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all ${
            loading || !isFormReady
              ? "bg-[#261938] text-[#a78899] cursor-not-allowed border border-[#a78899]/10"
              : "bg-gradient-to-r from-[#ff00cf] to-[#6f24bb] text-white shadow-[0_0_20px_rgba(255,0,207,0.3)] hover:shadow-[0_0_30px_rgba(255,0,207,0.5)] hover:-translate-y-1"
          }`}
        >
          {loading ? (
            <><Loader2 size={20} className="animate-spin" /> Processing...</>
          ) : !isPhotoReady ? (
            "Upload photo to continue"
          ) : event.price > 0 ? (
            <><CreditCard size={20} /> Pay ₹{event.price}</>
          ) : (
            <><TicketIcon size={20} /> Book Free Pass</>
          )}
        </button>

      </div>
    </div>
  );
}