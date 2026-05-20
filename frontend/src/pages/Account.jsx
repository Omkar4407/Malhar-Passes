import { useEffect, useState, useRef } from "react";
import { supabase } from "../lib/supabase";
import { lsCached, lsBust } from "../lib/cache";
import Header from "../components/Header";
import { Camera, Save, User, Mail, GraduationCap, Phone, Loader2 } from "lucide-react";

const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const PROFILE_TTL = 5 * 60_000;

export default function Account() {
  const phone = localStorage.getItem("userPhone");

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const [form, setForm] = useState({
    full_name: "",
    email: "",
    college: "",
  });

  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const fileInputRef = useRef();

  useEffect(() => { fetchUser(); }, []);

  const fetchUser = async () => {
    try {
      const data = await lsCached(`profile:${phone}`, PROFILE_TTL, async () => {
        const { data: row, error } = await supabase
          .from("users")
          .select("*")
          .eq("phone_number", phone)
          .maybeSingle();
        if (error) throw error;
        return row;
      });
      if (data) {
        setUser(data);
        setForm({
          full_name: data.full_name || "",
          email: data.email || "",
          college: data.college || "",
        });
      }
    } catch (err) {
      console.error("Fetch error:", err);
    }
    setLoading(false);
  };

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      showToast("error", "Only JPEG, PNG, or WebP images are allowed.");
      e.target.value = "";
      return;
    }

    if (file.size > MAX_SIZE_BYTES) {
      showToast("error", "Photo must be smaller than 5MB.");
      e.target.value = "";
      return;
    }

    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleUpdate = async () => {
    setSaving(true);
    let photoUrl = user?.photo_url;

    if (photo) {
      const fileName = `${Date.now()}-${photo.name}`;
      const { error: uploadErr } = await supabase.storage
        .from("photos")
        .upload(fileName, photo);

      if (uploadErr) {
        showToast("error", "Photo upload failed. Please try again.");
        setSaving(false);
        return;
      }

      const { data } = supabase.storage
        .from("photos")
        .getPublicUrl(fileName);

      photoUrl = data.publicUrl;
    }

    const { error: updateErr } = await supabase
      .from("users")
      .update({
        full_name: form.full_name,
        email: form.email,
        college: form.college,
        photo_url: photoUrl,
      })
      .eq("phone_number", phone);

    if (updateErr) {
      showToast("error", "Update failed. Please try again.");
    } else {
      lsBust(`profile:${phone}`);
      showToast("success", "Profile updated successfully!");
      fetchUser();
      setPhoto(null);
      setPhotoPreview(null);
    }
    setSaving(false);
  };

  const avatarSrc = photoPreview || user?.photo_url || null;
  const initials = (form.full_name || phone || "?")[0].toUpperCase();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b011c] text-[#eedcff] font-['Montserrat']">
        <Header />
        <div className="flex flex-col items-center justify-center pt-32 space-y-4">
          <div className="w-12 h-12 border-4 border-[#ff00cf]/20 border-t-[#ff00cf] rounded-full animate-spin" />
          <p className="text-[#a78899] font-medium tracking-wide">Loading Profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b011c] text-[#eedcff] font-['Montserrat'] relative overflow-x-hidden pb-24">
      <Header />

      {/* Ambient Glow */}
      <div className="absolute top-[20%] left-[50%] w-[500px] h-[500px] bg-[#6f24bb] rounded-full blur-[150px] opacity-[0.08] pointer-events-none -translate-x-1/2 -z-10" />

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-24 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full text-sm font-bold shadow-2xl z-50 flex items-center gap-2 animate-in slide-in-from-top-4 border ${
          toast.type === "success" 
            ? "bg-[#16a34a]/90 text-white border-[#16a34a] shadow-[0_0_20px_rgba(22,163,74,0.4)]" 
            : "bg-[#93000a]/90 text-white border-[#ffb4ab]/50 shadow-[0_0_20px_rgba(147,0,10,0.4)]"
        }`}>
          <span>{toast.type === "success" ? "✓" : "⚠️"}</span>
          {toast.msg}
        </div>
      )}

      <div className="relative z-10 max-w-md mx-auto px-5 py-8 space-y-8">

        {/* ── Avatar Section ── */}
        <div className="flex flex-col items-center">
          <div 
            onClick={() => fileInputRef.current.click()}
            className="relative w-32 h-32 rounded-full cursor-pointer group mb-4 shadow-[0_0_30px_rgba(255,0,207,0.15)] transition-transform hover:scale-105"
          >
            {/* Glowing ring */}
            <div className="absolute inset-[-4px] rounded-full bg-gradient-to-br from-[#ff00cf] to-[#00abff] opacity-70 group-hover:opacity-100 transition-opacity" />
            <div className="absolute inset-[2px] rounded-full bg-[#0b011c] z-0" />
            
            <div className="absolute inset-[4px] rounded-full overflow-hidden bg-[#261938] flex items-center justify-center z-10">
              {avatarSrc ? (
                <img src={avatarSrc} alt="profile" className="w-full h-full object-cover" />
              ) : (
                <span className="text-5xl font-black text-[#ffaddf]">{initials}</span>
              )}
              
              <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <Camera size={28} className="text-white mb-1" />
                <span className="text-[10px] font-bold text-white uppercase tracking-wider">Edit</span>
              </div>
            </div>
          </div>
          
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handlePhotoChange}
            className="hidden"
          />
          <h2 className="text-2xl font-bold text-[#eedcff] mb-1 font-['Bebas_Neue'] tracking-wider text-center">
            {form.full_name || "Guest User"}
          </h2>
          <p className="text-[#a78899] font-mono text-sm">{phone}</p>
        </div>

        {/* ── Form Card ── */}
        <div className="glass-card p-6 space-y-5">
          <div className="flex items-center gap-2 pb-2 border-b border-white/5">
            <User size={16} className="text-[#ff00cf]" />
            <h3 className="text-[11px] font-bold text-[#a78899] uppercase tracking-[0.15em] m-0">Personal Info</h3>
          </div>

          <Field
            icon={<User size={16} />}
            label="Full Name"
            value={form.full_name}
            placeholder="Enter your full name"
            onChange={(v) => setForm({ ...form, full_name: v })}
            activeColor="#ff00cf"
          />
          
          <Field
            icon={<Mail size={16} />}
            label="Email Address"
            value={form.email}
            placeholder="Enter your email"
            type="email"
            onChange={(v) => setForm({ ...form, email: v })}
            activeColor="#00abff"
          />
          
          <Field
            icon={<GraduationCap size={16} />}
            label="College Name"
            value={form.college}
            placeholder="Enter your college"
            onChange={(v) => setForm({ ...form, college: v })}
            activeColor="#ff6b00"
          />

          <div className="pt-2">
            <label className="text-[11px] font-bold text-[#a78899] uppercase tracking-wider block mb-2">Registered Phone</label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#a78899]/50">
                <Phone size={16} />
              </div>
              <input
                value={phone}
                disabled
                className="w-full bg-[#0b011c]/50 border border-[#a78899]/10 rounded-xl px-4 py-3.5 pl-11 text-[#a78899]/70 font-mono text-sm cursor-not-allowed"
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-[#16a34a] bg-[#16a34a]/10 px-2 py-1 rounded">
                VERIFIED
              </div>
            </div>
          </div>
        </div>

        {/* ── Save Button ── */}
        <button
          onClick={handleUpdate}
          disabled={saving}
          className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all ${
            saving 
              ? "bg-[#261938] text-[#a78899] cursor-wait border border-[#a78899]/20" 
              : "bg-gradient-to-r from-[#ff00cf] to-[#6f24bb] text-white shadow-[0_0_20px_rgba(255,0,207,0.3)] hover:shadow-[0_0_30px_rgba(255,0,207,0.5)] hover:-translate-y-1"
          }`}
        >
          {saving ? (
            <><Loader2 size={20} className="animate-spin" /> Saving Changes...</>
          ) : (
            <><Save size={20} /> Save Profile</>
          )}
        </button>

      </div>
    </div>
  );
}

// ── Reusable Field Component ──
function Field({ icon, label, value, onChange, placeholder, type = "text", activeColor = "#ff00cf" }) {
  const [focused, setFocused] = useState(false);
  
  return (
    <div>
      <label className="text-[11px] font-bold text-[#a78899] uppercase tracking-wider block mb-2">{label}</label>
      <div className="relative">
        <div className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-300 ${focused ? `text-[${activeColor}]` : "text-[#a78899]/60"}`}>
          {icon}
        </div>
        <input
          type={type}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="w-full bg-[#140725]/80 border rounded-xl px-4 py-3.5 pl-11 text-[#eedcff] placeholder:text-[#a78899]/40 outline-none transition-all duration-300 font-medium"
          style={{
            borderColor: focused ? activeColor : "rgba(167, 136, 153, 0.2)",
            boxShadow: focused ? `0 0 0 1px ${activeColor}30, 0 0 15px ${activeColor}20` : "none"
          }}
        />
      </div>
    </div>
  );
}