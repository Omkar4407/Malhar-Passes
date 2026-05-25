import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, ChevronDown, Calendar, Phone, Camera, Info, AlertTriangle, User, Upload } from "lucide-react";
import { supabase } from "../lib/supabase";

export default function Onboarding() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);

  // Form State
  const [personal, setPersonal] = useState({
    firstName: "",
    lastName: "",
    gender: "",
    dob: "",
    phone: "",
    photoPreview: null,
    photoFile: null,
  });

  const fileInputRef = useRef(null);

  const [submitting, setSubmitting] = useState(false);

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 256000) {
        alert("Photo must be under 250KB.");
        return;
      }
      const previewUrl = URL.createObjectURL(file);
      setPersonal({ ...personal, photoPreview: previewUrl, photoFile: file });
    }
  };

  const [phoneVerified, setPhoneVerified] = useState(false);
  const [otp, setOtp] = useState("");
  const [showOtp, setShowOtp] = useState(false);

  const [academic, setAcademic] = useState({
    isXavierite: null, // "yes" or "no"
    isJunior: null, // "yes" or "no"
    rollNumber: "",
    uid: "",
    institutionName: "",
    course: "",
    division: "",
    year: "",
    notApplicable: false,
  });

  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const handlePhoneVerify = () => {
    // Mock OTP flow
    if (!showOtp) {
      setShowOtp(true);
      return;
    }
    if (otp === "123456") {
      setPhoneVerified(true);
      setShowOtp(false);
    } else {
      alert("Invalid OTP! Try 123456");
    }
  };

  const handleFinish = async () => {
    if (!acceptedTerms || submitting) return;
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      let photoUrl = null;

      // Upload photo to Supabase Storage
      if (personal.photoFile) {
        const fileExt = personal.photoFile.name.split(".").pop();
        const filePath = `${user.id}/avatar.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("profiles")
          .upload(filePath, personal.photoFile, { cacheControl: "3600", upsert: true });

        if (uploadError) {
          console.error("Photo upload failed:", uploadError);
        } else {
          const { data: urlData } = supabase.storage
            .from("profiles")
            .getPublicUrl(filePath);
          photoUrl = urlData.publicUrl;
        }
      }

      // Upsert profile into profiles table
      const { error: profileError } = await supabase
        .from("profiles")
        .upsert({
          id: user.id,
          email: user.email,
          first_name: personal.firstName,
          last_name: personal.lastName,
          gender: personal.gender,
          dob: personal.dob || null,
          phone: personal.phone || null,
          photo_url: photoUrl,
          is_xavierite: academic.isXavierite === "yes",
          is_junior: academic.isXavierite === "yes" ? academic.isJunior === "yes" : null,
          institution_name: academic.isXavierite === "no" ? academic.institutionName : "St. Xavier's College",
          course: academic.course || null,
          division: academic.division || null,
          year: academic.year || null,
          roll_number: academic.rollNumber || null,
          uid: academic.uid || null,
          is_onboarded: true,
        }, { onConflict: "id" });

      if (profileError) throw profileError;

      // Keep localStorage in sync as a cache
      localStorage.setItem("onboardingComplete", "true");
      localStorage.setItem("onboardingData", JSON.stringify({ personal, academic }));

      navigate("/events");
    } catch (err) {
      console.error("Onboarding save failed:", err);
      alert("Failed to save your profile. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const renderStepIcon = (stepNum) => {
    const isCompleted = currentStep > stepNum;
    const isActive = currentStep === stepNum;

    return (
      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 z-10 ${isCompleted ? "bg-[#ff00cf] text-white" :
        isActive ? "bg-white text-black" : "bg-[#261938] text-gray-400 border border-[#ff00cf]/20"
        }`}>
        {isCompleted ? <CheckCircle2 size={16} /> : stepNum}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#0b011c] text-[#eedcff] p-6 pb-20 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-[#ff00cf] blur-[150px] opacity-10"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-[#9d00ff] blur-[150px] opacity-10"></div>
      </div>

      <div className="max-w-2xl mx-auto relative z-10 pt-10">
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-white mb-2" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
            COMPLETE PROFILE
          </h1>
          <p className="text-[#a89bbc]">Almost there! Please fill in your details.</p>
        </div>

        <div className="relative pl-4 md:pl-10">
          {/* Vertical Track Line */}
          <div className="absolute left-[27px] md:left-[51px] top-4 bottom-10 w-0.5 bg-[#261938]"></div>

          {/* Step 1: Personal Details */}
          <div className="mb-12 relative">
            <div className="absolute left-[-15px] md:left-[3px] top-0">
              {renderStepIcon(1)}
            </div>
            <div className="ml-8 md:ml-12">
              <h2 className={`text-xl font-semibold mb-1 ${currentStep >= 1 ? "text-white" : "text-gray-500"}`}>Personal</h2>
              <p className="text-sm text-[#a89bbc] mb-6">These details will be used to verify your identity.</p>

              {currentStep === 1 && (
                <div className="glass-card p-6 space-y-5 animate-in fade-in slide-in-from-top-4 duration-500">
                  <div className="flex flex-col md:flex-row items-center md:items-start justify-between bg-[#1a0d2b]/40 border border-[#ff00cf]/10 rounded-xl p-5 mb-6 gap-8">
                    {/* Left side: Guidelines Image and Tooltip */}
                    <div className="flex-1 flex flex-col items-center md:items-start space-y-4">
                      <div className="w-full max-w-[280px] bg-[#261938] rounded-xl border border-white/5 overflow-hidden aspect-[2/1] relative">
                        <img
                          src="/tutorial.webp"
                          alt="Image Tutorial"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.style.display = 'none';
                            e.target.parentElement.innerHTML = '<div class="w-full h-full flex items-center justify-center text-xs text-gray-500"></div>';
                          }}
                        />
                      </div>

                      <div className="relative group/tooltip inline-block">
                        <button type="button" className="flex items-center gap-2 text-sm text-gray-300 hover:text-white transition-colors bg-[#1a0d2b] px-4 py-2.5 rounded-xl border border-white/10 hover:border-[#ff00cf]/30">
                          Image submission guidelines <Info size={16} className="text-gray-400" />
                        </button>

                        {/* Tooltip Content */}
                        <div className="absolute top-full left-1/2 -translate-x-1/2 md:left-0 md:translate-x-0 mt-3 w-72 p-4 bg-[#1a0d2b] border border-[#ff00cf]/30 rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.8)] opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all duration-200 z-50 text-xs">
                          <div className="absolute -top-2 left-1/2 -translate-x-1/2 md:left-6 md:translate-x-0 w-4 h-4 bg-[#1a0d2b] border-t border-l border-[#ff00cf]/30 rotate-45"></div>
                          <div className="relative z-10 space-y-3">
                            <p className="font-bold text-red-400 flex items-center gap-1.5 text-sm">
                              Entry Rule
                            </p>
                            <p className="text-gray-300 text-[11px] leading-relaxed">Invalid images will result in denied entry. No refunds will be issued.</p>

                            <div className="pt-3 border-t border-white/5">
                              <p className="text-green-400 font-bold mb-1.5 flex items-center gap-1">Valid Image <CheckCircle2 size={12} /></p>
                              <ul className="text-gray-300 list-disc pl-4 space-y-1 text-[11px]">
                                <li>Clearly shows your face with all features visible</li>
                                <li>Recognizable at entry</li>
                                <li>Only YOU holding the pass should be in the photo</li>
                                <li>Good lighting, no filters, no obstructions</li>
                              </ul>
                            </div>

                            <div className="pt-3 border-t border-white/5">
                              <p className="text-red-400 font-bold mb-1.5 flex items-center gap-1">Invalid Image <span className="text-lg leading-none">×</span></p>
                              <ul className="text-gray-300 list-disc pl-4 space-y-1 text-[11px]">
                                <li>Childhood or outdated photos</li>
                                <li>Covered faces (masks, sunglasses)</li>
                                <li>Poor lighting or blur</li>
                                <li>Multiple people or altered images</li>
                              </ul>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right side: Upload Area */}
                    <div className="flex flex-col items-center gap-5">
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className="w-32 h-32 rounded-full bg-[#0b011c] flex flex-col items-center justify-center text-gray-400 border-2 border-[#a89bbc]/30 border-dashed cursor-pointer overflow-hidden group hover:border-[#ff00cf] transition-all relative"
                      >
                        {personal.photoPreview ? (
                          <>
                            <img src={personal.photoPreview} alt="Preview" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <Camera size={24} className="text-white mb-1" />
                              <span className="text-[10px] font-bold text-white uppercase tracking-wider">Change</span>
                            </div>
                          </>
                        ) : (
                          <>
                            <User size={32} className="mb-2 text-[#a89bbc]/40 group-hover:text-[#ff00cf]/80 transition-colors" />
                            <span className="text-[10px] text-[#a89bbc] group-hover:text-white transition-colors">Click to upload</span>
                          </>
                        )}
                      </div>

                      <div className="flex flex-col items-center">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="flex items-center gap-2 bg-[#1a0d2b] hover:bg-[#261938] border border-white/10 hover:border-[#ff00cf]/40 text-white px-5 py-2.5 rounded-xl text-sm transition-all shadow-lg font-medium"
                        >
                          <Upload size={16} className="text-[#a89bbc]" /> Upload Picture
                        </button>
                        <p className="text-[10px] text-gray-500 mt-2 font-mono tracking-wide">JPG, PNG - <span className="text-[#ffb4ab]">Max 250KB</span></p>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        ref={fileInputRef}
                        className="hidden"
                        onChange={handlePhotoUpload}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm mb-2 text-gray-300">First Name</label>
                      <input
                        type="text"
                        value={personal.firstName}
                        onChange={(e) => setPersonal({ ...personal, firstName: e.target.value })}
                        className="w-full bg-[#1a0d2b] border border-[#ff00cf]/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#ff00cf]"
                        placeholder="e.g. John"
                      />
                    </div>
                    <div>
                      <label className="block text-sm mb-2 text-gray-300">Last Name</label>
                      <input
                        type="text"
                        value={personal.lastName}
                        onChange={(e) => setPersonal({ ...personal, lastName: e.target.value })}
                        className="w-full bg-[#1a0d2b] border border-[#ff00cf]/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#ff00cf]"
                        placeholder="e.g. Doe"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm mb-2 text-gray-300">Gender</label>
                      <div className="relative">
                        <select
                          value={personal.gender}
                          onChange={(e) => setPersonal({ ...personal, gender: e.target.value })}
                          className="w-full bg-[#1a0d2b] border border-[#ff00cf]/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#ff00cf] appearance-none"
                        >
                          <option value="" disabled>Select gender</option>
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                          <option value="other">Other</option>
                        </select>
                        <ChevronDown className="absolute right-4 top-3.5 text-gray-400 pointer-events-none" size={18} />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm mb-2 text-gray-300">Date of birth</label>
                      <div className="relative">
                        <input
                          type="date"
                          value={personal.dob}
                          onChange={(e) => setPersonal({ ...personal, dob: e.target.value })}
                          className="w-full bg-[#1a0d2b] border border-[#ff00cf]/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#ff00cf] custom-calendar-icon"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm mb-2 text-gray-300">Mobile Number</label>
                    <div className="flex gap-3">
                      <div className="relative flex-1">
                        <span className="absolute left-4 top-3.5 text-gray-400">+91</span>
                        <input
                          type="tel"
                          maxLength="10"
                          value={personal.phone}
                          onChange={(e) => setPersonal({ ...personal, phone: e.target.value.replace(/\D/g, '') })}
                          disabled={phoneVerified || showOtp}
                          className="w-full bg-[#1a0d2b] border border-[#ff00cf]/20 rounded-lg pl-12 pr-4 py-3 text-white focus:outline-none focus:border-[#ff00cf] disabled:opacity-50"
                          placeholder="9876543210"
                        />
                      </div>
                      {!phoneVerified ? (
                        <button
                          onClick={handlePhoneVerify}
                          disabled={personal.phone.length !== 10}
                          className="bg-[#ff00cf] hover:bg-[#d000a8] disabled:bg-[#ff00cf]/30 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
                        >
                          {showOtp ? "Verify" : "Send OTP"}
                        </button>
                      ) : (
                        <div className="bg-green-500/20 border border-green-500 text-green-400 flex items-center justify-center px-6 rounded-lg">
                          <CheckCircle2 size={20} className="mr-2" /> Verified
                        </div>
                      )}
                    </div>
                    {showOtp && !phoneVerified && (
                      <div className="mt-3 animate-in fade-in slide-in-from-top-2">
                        <input
                          type="text"
                          maxLength="6"
                          value={otp}
                          onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                          className="w-full bg-[#1a0d2b] border border-[#ff00cf]/50 rounded-lg px-4 py-3 text-center tracking-[0.5em] text-xl text-white focus:outline-none focus:border-[#ff00cf]"
                          placeholder="123456"
                        />
                        <p className="text-xs text-gray-400 mt-2 text-center">Use 123456 to mock verify.</p>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end pt-4 border-t border-[#ff00cf]/10">
                    <button
                      onClick={() => setCurrentStep(2)}
                      disabled={!phoneVerified || !personal.firstName || !personal.lastName || !personal.gender || !personal.dob || !personal.photoPreview}
                      className="bg-white text-black hover:bg-gray-200 disabled:opacity-50 font-semibold px-8 py-2.5 rounded-lg transition-colors"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Step 2: Academics */}
          <div className="mb-12 relative">
            <div className="absolute left-[-15px] md:left-[3px] top-0">
              {renderStepIcon(2)}
            </div>
            <div className="ml-8 md:ml-12">
              <h2 className={`text-xl font-semibold mb-1 ${currentStep >= 2 ? "text-white" : "text-gray-500"}`}>Academics</h2>
              <p className="text-sm text-[#a89bbc] mb-6">Please provide your academic details.</p>

              {currentStep === 2 && (
                <div className="glass-card p-6 space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">

                  {/* Xavierite Question */}
                  <div>
                    <label className="block text-sm mb-3 text-white">Are you a Xavierite?</label>
                    <div className="flex gap-4">
                      <button
                        onClick={() => setAcademic({ ...academic, isXavierite: "yes" })}
                        className={`flex-1 py-3 rounded-lg border transition-all ${academic.isXavierite === "yes" ? "bg-[#ff00cf]/20 border-[#ff00cf] text-white" : "bg-[#1a0d2b] border-[#ff00cf]/20 text-gray-400 hover:border-[#ff00cf]/50"}`}
                      >
                        Yes
                      </button>
                      <button
                        onClick={() => setAcademic({ ...academic, isXavierite: "no", isJunior: null })}
                        className={`flex-1 py-3 rounded-lg border transition-all ${academic.isXavierite === "no" ? "bg-[#ff00cf]/20 border-[#ff00cf] text-white" : "bg-[#1a0d2b] border-[#ff00cf]/20 text-gray-400 hover:border-[#ff00cf]/50"}`}
                      >
                        No
                      </button>
                    </div>
                  </div>

                  {/* Flowchart Conditions */}
                  {academic.isXavierite === "no" && (
                    <div className="space-y-4 pt-4 border-t border-[#ff00cf]/10 animate-in fade-in">
                      <div>
                        <label className="block text-sm mb-2 text-gray-300">Institution Name</label>
                        <input type="text" value={academic.institutionName} onChange={(e) => setAcademic({ ...academic, institutionName: e.target.value })} className="w-full bg-[#1a0d2b] border border-[#ff00cf]/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#ff00cf]" placeholder="e.g. HR College" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm mb-2 text-gray-300">Course</label>
                          <input type="text" value={academic.course} onChange={(e) => setAcademic({ ...academic, course: e.target.value })} className="w-full bg-[#1a0d2b] border border-[#ff00cf]/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#ff00cf]" placeholder="e.g. BMM" />
                        </div>
                        <div>
                          <label className="block text-sm mb-2 text-gray-300">Institution Year</label>
                          <input type="text" value={academic.year} onChange={(e) => setAcademic({ ...academic, year: e.target.value })} className="w-full bg-[#1a0d2b] border border-[#ff00cf]/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#ff00cf]" placeholder="e.g. FY" />
                        </div>
                      </div>
                    </div>
                  )}

                  {academic.isXavierite === "yes" && (
                    <div className="space-y-6 pt-4 border-t border-[#ff00cf]/10 animate-in fade-in">
                      <div>
                        <label className="block text-sm mb-3 text-white">Are you in Junior College?</label>
                        <div className="flex gap-4">
                          <button
                            onClick={() => setAcademic({ ...academic, isJunior: "yes" })}
                            className={`flex-1 py-3 rounded-lg border transition-all ${academic.isJunior === "yes" ? "bg-[#ff00cf]/20 border-[#ff00cf] text-white" : "bg-[#1a0d2b] border-[#ff00cf]/20 text-gray-400 hover:border-[#ff00cf]/50"}`}
                          >
                            Yes
                          </button>
                          <button
                            onClick={() => setAcademic({ ...academic, isJunior: "no" })}
                            className={`flex-1 py-3 rounded-lg border transition-all ${academic.isJunior === "no" ? "bg-[#ff00cf]/20 border-[#ff00cf] text-white" : "bg-[#1a0d2b] border-[#ff00cf]/20 text-gray-400 hover:border-[#ff00cf]/50"}`}
                          >
                            No
                          </button>
                        </div>
                      </div>

                      {academic.isJunior === "yes" && (
                        <div className="grid grid-cols-2 gap-4 animate-in fade-in">
                          <div>
                            <label className="block text-sm mb-2 text-gray-300">Roll Number / GR Number</label>
                            <input type="text" value={academic.rollNumber} onChange={(e) => setAcademic({ ...academic, rollNumber: e.target.value })} className="w-full bg-[#1a0d2b] border border-[#ff00cf]/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#ff00cf]" />
                          </div>
                          <div>
                            <label className="block text-sm mb-2 text-gray-300">Course / Stream</label>
                            <input type="text" value={academic.course} onChange={(e) => setAcademic({ ...academic, course: e.target.value })} className="w-full bg-[#1a0d2b] border border-[#ff00cf]/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#ff00cf]" />
                          </div>
                          <div>
                            <label className="block text-sm mb-2 text-gray-300">Division</label>
                            <input type="text" value={academic.division} onChange={(e) => setAcademic({ ...academic, division: e.target.value })} className="w-full bg-[#1a0d2b] border border-[#ff00cf]/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#ff00cf]" />
                          </div>
                          <div>
                            <label className="block text-sm mb-2 text-gray-300">Year (FYJC / SYJC)</label>
                            <input type="text" value={academic.year} onChange={(e) => setAcademic({ ...academic, year: e.target.value })} className="w-full bg-[#1a0d2b] border border-[#ff00cf]/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#ff00cf]" />
                          </div>
                        </div>
                      )}

                      {academic.isJunior === "no" && (
                        <div className="grid grid-cols-2 gap-4 animate-in fade-in">
                          <div>
                            <label className="block text-sm mb-2 text-gray-300">UID</label>
                            <input type="text" value={academic.uid} onChange={(e) => setAcademic({ ...academic, uid: e.target.value })} className="w-full bg-[#1a0d2b] border border-[#ff00cf]/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#ff00cf]" />
                          </div>
                          <div>
                            <label className="block text-sm mb-2 text-gray-300">Roll Number</label>
                            <input type="text" value={academic.rollNumber} onChange={(e) => setAcademic({ ...academic, rollNumber: e.target.value })} className="w-full bg-[#1a0d2b] border border-[#ff00cf]/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#ff00cf]" />
                          </div>
                          <div>
                            <label className="block text-sm mb-2 text-gray-300">Stream / Course</label>
                            <input type="text" value={academic.course} onChange={(e) => setAcademic({ ...academic, course: e.target.value })} className="w-full bg-[#1a0d2b] border border-[#ff00cf]/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#ff00cf]" />
                          </div>
                          <div>
                            <label className="block text-sm mb-2 text-gray-300">Year (FY / SY / TY)</label>
                            <input type="text" value={academic.year} onChange={(e) => setAcademic({ ...academic, year: e.target.value })} className="w-full bg-[#1a0d2b] border border-[#ff00cf]/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#ff00cf]" />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex justify-between pt-4 border-t border-[#ff00cf]/10">
                    <button
                      onClick={() => setCurrentStep(1)}
                      className="bg-[#261938] hover:bg-[#34234b] text-white px-8 py-2.5 rounded-lg transition-colors border border-[#ff00cf]/20"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setCurrentStep(3)}
                      disabled={academic.isXavierite === null || (academic.isXavierite === "yes" && academic.isJunior === null)}
                      className="bg-white text-black hover:bg-gray-200 disabled:opacity-50 font-semibold px-8 py-2.5 rounded-lg transition-colors"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Step 3: Terms & Conditions */}
          <div className="relative">
            <div className="absolute left-[-15px] md:left-[3px] top-0">
              {renderStepIcon(3)}
            </div>
            <div className="ml-8 md:ml-12">
              <h2 className={`text-xl font-semibold mb-1 ${currentStep >= 3 ? "text-white" : "text-gray-500"}`}>Terms & Conditions</h2>
              <p className="text-sm text-[#a89bbc] mb-6">Please read and accept the terms to continue.</p>

              {currentStep === 3 && (
                <div className="glass-card p-6 space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
                  <div className="bg-[#1a0d2b] border border-[#ff00cf]/20 rounded-lg p-5 h-48 overflow-y-auto text-sm text-gray-300 leading-relaxed custom-scrollbar">
                    <h3 className="font-bold text-white mb-2">Terms of Service & Code of Conduct</h3>
                    <p className="mb-3">
                      By registering for Malhar, you agree to abide by the festival's Code of Conduct. The organizing committee reserves the right to deny entry or expel anyone violating these rules without refund.
                    </p>
                    <p className="mb-3">
                      <strong>1. Ticket Non-Transferability:</strong> All passes are strictly non-transferable. Your ID will be checked against the name and details on the ticket at the entry gates.
                    </p>
                    <p className="mb-3">
                      <strong>2. Prohibited Items:</strong> Alcohol, drugs, weapons, outside food, and beverages are strictly prohibited. Bags will be checked at entry points.
                    </p>
                    <p className="mb-3">
                      <strong>3. Data Usage:</strong> Your phone number and academic details are collected for security and verification purposes. We will not share your data with third parties outside of event organizers and our SMS provider.
                    </p>
                    <p>
                      <strong>4. Refund Policy:</strong> Paid passes are non-refundable unless the event is canceled by the organizers.
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div
                      className={`w-6 h-6 rounded border flex items-center justify-center cursor-pointer transition-colors ${acceptedTerms ? "bg-[#ff00cf] border-[#ff00cf]" : "border-gray-500 hover:border-[#ff00cf]"}`}
                      onClick={() => setAcceptedTerms(!acceptedTerms)}
                    >
                      {acceptedTerms && <CheckCircle2 size={16} className="text-white" />}
                    </div>
                    <label className="text-sm text-gray-300 cursor-pointer select-none" onClick={() => setAcceptedTerms(!acceptedTerms)}>
                      I have read and agree to the Terms & Conditions
                    </label>
                  </div>

                  <div className="flex justify-between pt-4 border-t border-[#ff00cf]/10">
                    <button
                      onClick={() => setCurrentStep(2)}
                      className="bg-[#261938] hover:bg-[#34234b] text-white px-8 py-2.5 rounded-lg transition-colors border border-[#ff00cf]/20"
                    >
                      Previous
                    </button>
                    <button
                      onClick={handleFinish}
                      disabled={!acceptedTerms || submitting}
                      className="bg-gradient-to-r from-[#ff00cf] to-[#9d00ff] hover:opacity-90 disabled:opacity-50 text-white font-bold px-8 py-2.5 rounded-lg transition-opacity shadow-[0_0_15px_rgba(255,0,207,0.5)] flex items-center gap-2"
                    >
                      {submitting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Saving...
                        </>
                      ) : (
                        "Finish Setup"
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Quick custom scrollbar style injection for the terms box */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0,0,0,0.2);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255,0,207,0.4);
          border-radius: 10px;
        }
        input[type="date"]::-webkit-calendar-picker-indicator {
          filter: invert(1);
          opacity: 0.5;
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}
