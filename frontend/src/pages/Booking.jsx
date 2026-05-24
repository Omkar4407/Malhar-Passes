import { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import Menu from "../components/Menu";
import { bustSlotsCache } from "./Events";
import { lsBust } from "../lib/cache";
import { bustTicketsCache } from "../lib/tickets";
import {
  buildCollegeString,
  getCollegeDisplayName,
} from "../lib/college";

function bustProfileCache() {
  const token = localStorage.getItem("userToken");
  lsBust(`profile:${token?.slice(-24) || "anon"}`);
}

const API = import.meta.env.VITE_BACKEND_URL;
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png"];
const ALLOWED_EXT = /\.(jpe?g|png)$/i;
const MAX_SIZE_BYTES = 250 * 1024;

const TERMS_SECTIONS = [
  {
    title: "1. Right of Admission Reserved",
    body: "Malhar reserves the sole and absolute right to admit or deny entry to any individual, without the obligation to provide a reason.",
  },
  {
    title: "2. Agreement to Terms",
    body: "By entering the premises or participating in Malhar events, you acknowledge that you have read, understood, and agree to be bound by these Terms & Conditions.",
  },
  {
    title: "3. Entry Requirements",
    body: "A photograph is being taken at the time of registration for identification and verification purposes, without which entry won't be granted.",
  },
  {
    title: "4. Use of Collected Information",
    body: "The photograph will be used solely for identity verification, security, and admission management purposes. This data will be stored securely and handled in accordance with applicable data protection laws.",
  },
  {
    title: "5. Consent",
    body: "By agreeing to these Terms & Conditions, you explicitly consent to:",
    bullets: [
      "Your photograph being taken and stored.",
      "The collection and processing of other details like full name, gender, date of birth and college related identification details.",
    ],
  },
];

function validatePhotoFile(file) {
  if (!file) return "Please select a photo.";
  const nameOk = ALLOWED_EXT.test(file.name);
  const typeOk = !file.type || ALLOWED_TYPES.includes(file.type);
  if (!nameOk || !typeOk) {
    return "Only JPG or PNG images are allowed.";
  }
  if (file.size > MAX_SIZE_BYTES) {
    return "Photo must be 250 KB or smaller.";
  }
  return null;
}
const COLLEGE_MAX_LEN = 450;
const JC_STREAMS = ["Science", "Commerce", "Arts"];
const GENDERS = ["Male", "Female", "Other", "Prefer not to say"];

const sanitizePhone = (val) => val.replace(/\D/g, "").slice(0, 10);
const sanitizeOtp = (val) => val.replace(/\D/g, "").slice(0, 6);
const isValidPhone = (p) => /^[6-9]\d{9}$/.test(p);
const isValidOtp = (o) => /^\d{4,6}$/.test(o);

function authHeader() {
  const token = localStorage.getItem("userToken");
  return { Authorization: `Bearer ${token}` };
}

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

function YesNoQuestion({ label, value, onChange, name, disabled }) {
  return (
    <div style={{ ...styles.questionBlock, opacity: disabled ? 0.5 : 1 }}>
      <p style={styles.questionLabel}>{label}</p>
      <div style={styles.radioRow}>
        <label style={styles.radioOption}>
          <input
            type="radio"
            name={name}
            checked={value === true}
            onChange={() => onChange(true)}
            disabled={disabled}
          />
          <span>Yes</span>
        </label>
        <label style={styles.radioOption}>
          <input
            type="radio"
            name={name}
            checked={value === false}
            onChange={() => onChange(false)}
            disabled={disabled}
          />
          <span>No</span>
        </label>
      </div>
    </div>
  );
}

function XavierCollegeLevelQuestion({ value, onChange, disabled }) {
  return (
    <div style={{ ...styles.questionBlock, opacity: disabled ? 0.5 : 1 }}>
      <p style={styles.questionLabel}>Select your college level *</p>
      <div style={styles.radioRow}>
        <label style={styles.radioOption}>
          <input
            type="radio"
            name="xavier-college-level"
            checked={value === "junior"}
            onChange={() => onChange("junior")}
            disabled={disabled}
          />
          <span>Junior College</span>
        </label>
        <label style={styles.radioOption}>
          <input
            type="radio"
            name="xavier-college-level"
            checked={value === "senior"}
            onChange={() => onChange("senior")}
            disabled={disabled}
          />
          <span>Senior College</span>
        </label>
      </div>
    </div>
  );
}

export default function Booking() {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpStep, setOtpStep] = useState(1);
  const [otpLoading, setOtpLoading] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);
  const [devOtp, setDevOtp] = useState(null);
  const countdownRef = useRef(null);

  const [name, setName] = useState("");
  const [gender, setGender] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoUrl, setPhotoUrl] = useState(null);
  const [uploading, setUploading] = useState(false);

  const [xavieriteNa, setXavieriteNa] = useState(false);
  const [isXavierite, setIsXavierite] = useState(null);
  const [xavierCollegeLevel, setXavierCollegeLevel] = useState(null);
  const [rollGrNumber, setRollGrNumber] = useState("");
  const [jcStream, setJcStream] = useState("");
  const [division, setDivision] = useState("");
  const [institutionYearJc, setInstitutionYearJc] = useState("");
  const [uid, setUid] = useState("");
  const [rollNumber, setRollNumber] = useState("");
  const [degreeCourse, setDegreeCourse] = useState("");
  const [yearDegree, setYearDegree] = useState("");
  const [institutionName, setInstitutionName] = useState("");
  const [course, setCourse] = useState("");
  const [institutionYear, setInstitutionYear] = useState("");

  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [phoneVerified, setPhoneVerified] = useState(null);

  const navigate = useNavigate();
  const location = useLocation();
  const slot = location.state?.slot;
  const event = location.state?.event;

  const clearError = () => {
    if (error) setError("");
  };

  const resetJuniorFields = () => {
    setRollGrNumber("");
    setJcStream("");
    setDivision("");
    setInstitutionYearJc("");
  };

  const resetDegreeFields = () => {
    setUid("");
    setRollNumber("");
    setDegreeCourse("");
    setYearDegree("");
  };

  const resetExternalFields = () => {
    setInstitutionName("");
    setCourse("");
    setInstitutionYear("");
  };

  const resetAllAcademic = () => {
    setIsXavierite(null);
    setXavierCollegeLevel(null);
    resetJuniorFields();
    resetDegreeFields();
    resetExternalFields();
  };

  const handleXavieriteNaChange = (checked) => {
    setXavieriteNa(checked);
    resetAllAcademic();
    clearError();
  };

  const handleXavieriteChange = (val) => {
    setIsXavierite(val);
    setXavierCollegeLevel(null);
    resetJuniorFields();
    resetDegreeFields();
    resetExternalFields();
    clearError();
  };

  const sanitizeUid = (val) => val.replace(/\D/g, "");

  const academicFields = () => ({
    xavieriteNa,
    isXavierite,
    xavierCollegeLevel,
    rollGrNumber,
    jcStream,
    division,
    institutionYearJc,
    uid,
    rollNumber,
    degreeCourse,
    yearDegree,
    institutionName,
    course,
    institutionYear,
    gender,
    dateOfBirth,
  });

  const validatePersonal = () => {
    if (!name.trim()) return "Please enter your name.";
    if (name.trim().length > 100) return "Name must be 100 characters or fewer.";
    if (!gender) return "Please select your gender.";
    if (!dateOfBirth) return "Please enter your date of birth.";
    const dob = new Date(dateOfBirth);
    if (Number.isNaN(dob.getTime())) return "Please enter a valid date of birth.";
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (dob >= today) return "Date of birth must be in the past.";
    if (!photoUrl) {
      if (photo) return "Please upload your picture using the button below.";
      return "Please upload your picture.";
    }
    return null;
  };

  const handleXavierCollegeLevelChange = (level) => {
    setXavierCollegeLevel(level);
    resetJuniorFields();
    resetDegreeFields();
    clearError();
  };

  const startResendCooldown = () => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    setResendCountdown(30);
    countdownRef.current = setInterval(() => {
      setResendCountdown((v) => {
        if (v <= 1) {
          clearInterval(countdownRef.current);
          return 0;
        }
        return v - 1;
      });
    }, 1000);
  };

  useEffect(() => () => {
    if (countdownRef.current) clearInterval(countdownRef.current);
  }, []);

  useEffect(() => {
    if (!slot || !event) return;
    const token = localStorage.getItem("userToken");
    if (!token) {
      setPhoneVerified(false);
      return;
    }
    const stored = localStorage.getItem("userPhone");
    if (stored) setPhone(stored);

    axios
      .post(`${API}/verify-token`, { token })
      .then(({ data }) => {
        const verified = Boolean(data.valid && data.payload?.phone);
        setPhoneVerified(verified);
        if (verified && data.payload?.phone) {
          setPhone(data.payload.phone);
          localStorage.setItem("userPhone", data.payload.phone);
        }
      })
      .catch(() => setPhoneVerified(false));
  }, [slot, event]);

  const sendOtp = async () => {
    setError("");
    const cleanPhone = sanitizePhone(phone);
    if (!isValidPhone(cleanPhone)) {
      setError("Enter a valid 10-digit Indian mobile number.");
      return;
    }
    setOtpLoading(true);
    try {
      const { data } = await axios.post(`${API}/send-otp`, { phone: cleanPhone });
      setPhone(cleanPhone);
      setDevOtp(data.dev_otp || null);
      setOtpStep(2);
      setOtp("");
      startResendCooldown();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to send OTP. Please try again.");
    } finally {
      setOtpLoading(false);
    }
  };

  const resendOtp = async () => {
    if (resendCountdown > 0 || otpLoading) return;
    setOtp("");
    setError("");
    setOtpLoading(true);
    try {
      const { data } = await axios.post(`${API}/send-otp`, { phone });
      setDevOtp(data.dev_otp || null);
      startResendCooldown();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to resend OTP.");
    } finally {
      setOtpLoading(false);
    }
  };

  const verifyOtp = async () => {
    setError("");
    const cleanOtp = sanitizeOtp(otp);
    if (!isValidOtp(cleanOtp)) {
      setError("Enter the 6-digit OTP sent to your number.");
      return;
    }
    setOtpLoading(true);
    try {
      const token = localStorage.getItem("userToken");
      const { data } = await axios.post(
        `${API}/verify-otp`,
        { phone, otp: cleanOtp },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      localStorage.setItem("userToken", data.token);
      localStorage.setItem("userPhone", phone);
      axios.defaults.headers.common["Authorization"] = `Bearer ${data.token}`;
      setPhoneVerified(true);
      setOtpStep(1);
      setOtp("");
    } catch (err) {
      setError(err.response?.data?.error || "Verification failed. Please try again.");
    } finally {
      setOtpLoading(false);
    }
  };

  const handleOtpBack = () => {
    setOtpStep(1);
    setOtp("");
    if (countdownRef.current) clearInterval(countdownRef.current);
    setResendCountdown(0);
  };

  const validateAcademic = () => {
    if (xavieriteNa) {
      const collegeStr = buildCollegeString(academicFields());
      if (collegeStr.length > COLLEGE_MAX_LEN) {
        return "Details are too long. Please shorten your entries.";
      }
      return null;
    }
    if (isXavierite === null) return "Please answer: Are you a Xavierite?";
    if (isXavierite) {
      if (!xavierCollegeLevel) return "Please select Junior College or Senior College.";
      if (xavierCollegeLevel === "junior") {
        if (!rollGrNumber.trim()) return "Please enter your Roll Number / GR Number.";
        if (!jcStream) return "Please select your Stream (Science / Commerce / Arts).";
        if (!division.trim()) return "Please enter your Division.";
        if (!institutionYearJc) return "Please select your Institution Year (FYJC / SYJC).";
      } else {
        if (!uid.trim()) return "Please enter your UID.";
        if (!/^\d+$/.test(uid.trim())) return "Please enter a valid UID.";
        if (!rollNumber.trim()) return "Please enter your Roll Number.";
        if (!degreeCourse.trim()) return "Please enter your Course.";
        if (!yearDegree) return "Please select your Year (FY / SY / TY).";
      }
    } else {
      if (!institutionName.trim()) return "Please enter your Institution Name.";
      if (!course.trim()) return "Please enter your Course.";
      if (!institutionYear.trim()) return "Please enter your Institution Year.";
    }
    const collegeStr = buildCollegeString(academicFields());
    if (collegeStr.length > COLLEGE_MAX_LEN) {
      return "Academic details are too long. Please shorten your entries.";
    }
    return null;
  };

  const getCollegeValue = () => buildCollegeString(academicFields());
  const getCollegeNameValue = () => getCollegeDisplayName(academicFields());

  const validate = () => {
    if (!phoneVerified) return "Verify your mobile number above to continue.";
    const personalError = validatePersonal();
    if (personalError) return personalError;
    const academicError = validateAcademic();
    if (academicError) return academicError;
    if (!termsAccepted) return "Please accept the Terms & Conditions to continue.";
    return null;
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const validationError = validatePhotoFile(file);
    if (validationError) {
      setError(validationError);
      e.target.value = "";
      return;
    }
    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
    setPhotoUrl(null);
    clearError();
  };

  const handleUploadPhoto = async () => {
    if (!photo) return;
    const validationError = validatePhotoFile(photo);
    if (validationError) {
      setError(validationError);
      return;
    }
    setUploading(true);
    setError("");
    try {
      const ext = photo.name.match(ALLOWED_EXT)?.[1]?.toLowerCase() || "jpg";
      const safeExt = ext === "jpeg" ? "jpg" : ext;
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${safeExt}`;
      const contentType = safeExt === "png" ? "image/png" : "image/jpeg";
      const { error: uploadError } = await supabase.storage
        .from("photos")
        .upload(fileName, photo, { contentType, upsert: false });

      if (uploadError) {
        setError("Photo upload failed. Please try again.");
        return;
      }

      const { data: urlData } = supabase.storage.from("photos").getPublicUrl(fileName);
      setPhotoUrl(urlData.publicUrl);
    } catch {
      setError("Photo upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleBooking = async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const { data } = await axios.post(
        `${API}/book-free`,
        {
          name: name.trim(),
          college: getCollegeValue(),
          college_name: getCollegeNameValue(),
          slot_id: slot.id,
          event_id: event.id,
          photo_url: photoUrl,
        },
        { headers: authHeader() }
      );
      bustSlotsCache(event.id);
      bustTicketsCache();
      bustProfileCache();
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
    if (validationError) {
      setError(validationError);
      return;
    }

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
                college: getCollegeValue(),
                college_name: getCollegeNameValue(),
                slot_id: slot.id,
                event_id: event.id,
                photo_url: photoUrl,
              },
              { headers: authHeader() }
            );

            if (verify.data.success) {
              bustSlotsCache(event.id);
              bustTicketsCache();
              bustProfileCache();
              navigate("/ticket", { state: { ticket: verify.data.ticket } });
            } else {
              setError("Payment verification failed. Please contact support.");
              setLoading(false);
            }
          } catch (err) {
            const msg = err.response?.data?.error;
            if (err.response?.status === 409) {
              setError("Slot sold out after payment. Please contact support for a refund.");
            } else {
              setError(msg || "Payment verification failed. Please contact support.");
            }
            setLoading(false);
          }
        } else {
          setLoading(false);
        }
      });
    } catch (err) {
      const msg = err.response?.data?.error;
      if (err.response?.status === 409) {
        if (err.response?.data?.code === "DUPLICATE_TICKET") {
          setError("You already have a ticket for this slot. You can book a different slot for this event.");
        } else {
          setError("This slot just sold out. Please go back and pick another.");
        }
      } else {
        setError(msg || "Could not initiate payment. Please try again.");
      }
      setLoading(false);
    }
  };

  if (!slot || !event) {
    return (
      <>
        <Menu />
        <div style={styles.page}>
          <div style={styles.errorBox}>
            Invalid booking session. Please go back and select an event.
          </div>
          <button
            type="button"
            style={styles.backLink}
            onClick={() => navigate("/events")}
          >
            ← Back to events
          </button>
        </div>
      </>
    );
  }

  if (phoneVerified === null) {
    return (
      <>
        <Menu />
        <div style={styles.page}>
          <p style={{ textAlign: "center", color: "#888" }}>Loading…</p>
        </div>
      </>
    );
  }

  const isPhotoReady = !!photoUrl;
  const isPersonalReady = validatePersonal() === null;
  const isAcademicReady = validateAcademic() === null;
  const canBook = phoneVerified && isPersonalReady && isAcademicReady && termsAccepted;

  const payLabel = () => {
    if (loading) return "Please wait…";
    if (!phoneVerified) return "Verify mobile number to continue";
    if (!isPersonalReady) return "Complete personal details to continue";
    if (!xavieriteNa && !isAcademicReady) return "Complete academic section to continue";
    if (!termsAccepted) return "Accept Terms & Conditions to continue";
    return event.price > 0 ? `Pay ₹${event.price}` : "Book Free Pass";
  };

  const renderAcademicFields = () => {
    if (xavieriteNa) return null;
    if (isXavierite === null) return null;

    if (isXavierite) {
      return (
        <>
          <XavierCollegeLevelQuestion
            value={xavierCollegeLevel}
            onChange={handleXavierCollegeLevelChange}
          />
          {xavierCollegeLevel === "junior" && (
            <>
              <label style={styles.label} htmlFor="roll-gr">Roll Number / GR Number *</label>
              <input
                id="roll-gr"
                value={rollGrNumber}
                onChange={(e) => { setRollGrNumber(e.target.value); clearError(); }}
                style={styles.input}
                maxLength={40}
                placeholder="e.g. 12345"
              />
              <label style={styles.label} htmlFor="jc-stream">Stream (Science / Commerce / Arts) *</label>
              <select
                id="jc-stream"
                value={jcStream}
                onChange={(e) => { setJcStream(e.target.value); clearError(); }}
                style={styles.input}
              >
                <option value="">Select stream</option>
                {JC_STREAMS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <label style={styles.label} htmlFor="division">Division *</label>
              <input
                id="division"
                value={division}
                onChange={(e) => { setDivision(e.target.value); clearError(); }}
                style={styles.input}
                maxLength={20}
                placeholder="e.g. A"
              />
              <label style={styles.label} htmlFor="jc-year">Institution Year *</label>
              <select
                id="jc-year"
                value={institutionYearJc}
                onChange={(e) => { setInstitutionYearJc(e.target.value); clearError(); }}
                style={styles.input}
              >
                <option value="">Select year</option>
                <option value="FYJC">FYJC</option>
                <option value="SYJC">SYJC</option>
              </select>
            </>
          )}
          {xavierCollegeLevel === "senior" && (
            <>
              <label style={styles.label} htmlFor="uid">UID *</label>
              <input
                id="uid"
                type="tel"
                inputMode="numeric"
                value={uid}
                onChange={(e) => { setUid(sanitizeUid(e.target.value)); clearError(); }}
                style={styles.input}
                maxLength={20}
                placeholder="e.g. 1234567890"
              />
              <label style={styles.label} htmlFor="degree-roll">Roll Number *</label>
              <input
                id="degree-roll"
                value={rollNumber}
                onChange={(e) => { setRollNumber(e.target.value); clearError(); }}
                style={styles.input}
                maxLength={40}
                placeholder="e.g. 12345"
              />
              <label style={styles.label} htmlFor="degree-course">Course *</label>
              <input
                id="degree-course"
                value={degreeCourse}
                onChange={(e) => { setDegreeCourse(e.target.value); clearError(); }}
                style={styles.input}
                maxLength={80}
                placeholder="e.g. BSc.IT"
              />
              <label style={styles.label} htmlFor="degree-year">Year *</label>
              <select
                id="degree-year"
                value={yearDegree}
                onChange={(e) => { setYearDegree(e.target.value); clearError(); }}
                style={styles.input}
              >
                <option value="">Select year</option>
                <option value="FY">FY</option>
                <option value="SY">SY</option>
                <option value="TY">TY</option>
              </select>
            </>
          )}
        </>
      );
    }

    return (
      <>
        <label style={styles.label} htmlFor="institution">Institution Name *</label>
        <input
          id="institution"
          value={institutionName}
          onChange={(e) => { setInstitutionName(e.target.value); clearError(); }}
          style={styles.input}
          maxLength={100}
          placeholder="e.g. Mumbai University College"
        />
        <label style={styles.label} htmlFor="ext-course">Course *</label>
        <input
          id="ext-course"
          value={course}
          onChange={(e) => { setCourse(e.target.value); clearError(); }}
          style={styles.input}
          maxLength={80}
          placeholder="e.g. B.Sc Computer Science"
        />
        <label style={styles.label} htmlFor="ext-year">Institution Year *</label>
        <input
          id="ext-year"
          value={institutionYear}
          onChange={(e) => { setInstitutionYear(e.target.value); clearError(); }}
          style={styles.input}
          maxLength={40}
          placeholder="e.g. 2nd Year, FY, SY"
        />
      </>
    );
  };

  return (
    <>
      <Menu />
      <div style={styles.page}>
        <div style={styles.hero}>
          <div style={styles.badge}>Booking</div>
          <h1 style={styles.title}>Book Your Pass</h1>
          <p style={styles.eventName}>{event.name}</p>
          <div style={styles.slotPill}>
            🕐 {slot.name}{slot.time ? ` — ${slot.time}` : ""}
          </div>
        </div>

        <div style={styles.card}>
          {error && <div style={styles.errorBox}>{error}</div>}

          <p style={styles.sectionTitle}>Mobile verification</p>
          {phoneVerified ? (
            <div style={styles.verifiedBadge}>✅ Verified: +91 {phone}</div>
          ) : otpStep === 1 ? (
            <>
              <label style={styles.label} htmlFor="booking-phone">Mobile number *</label>
              <div style={styles.phoneRow}>
                <span style={styles.countryCode}>+91</span>
                <input
                  id="booking-phone"
                  type="tel"
                  inputMode="numeric"
                  placeholder="98765 43210"
                  value={phone}
                  maxLength={10}
                  onChange={(e) => setPhone(sanitizePhone(e.target.value))}
                  style={{ ...styles.input, marginBottom: 0, borderRadius: "0 8px 8px 0", borderLeft: "none" }}
                  disabled={otpLoading}
                />
              </div>
              <button
                type="button"
                onClick={sendOtp}
                disabled={otpLoading || phone.length < 10}
                style={{
                  ...styles.otpBtn,
                  opacity: otpLoading || phone.length < 10 ? 0.6 : 1,
                }}
              >
                {otpLoading ? "Sending…" : "Send OTP"}
              </button>
            </>
          ) : (
            <>
              <label style={styles.label}>OTP sent to +91 {phone}</label>
              {devOtp && (
                <div style={styles.devOtpBox}>DEV MODE — OTP: <strong>{devOtp}</strong></div>
              )}
              <input
                type="tel"
                inputMode="numeric"
                placeholder="6-digit OTP"
                value={otp}
                maxLength={6}
                onChange={(e) => setOtp(sanitizeOtp(e.target.value))}
                style={styles.input}
                disabled={otpLoading}
              />
              <button
                type="button"
                onClick={verifyOtp}
                disabled={otpLoading || otp.length < 6}
                style={{
                  ...styles.otpBtn,
                  opacity: otpLoading || otp.length < 6 ? 0.6 : 1,
                }}
              >
                {otpLoading ? "Verifying…" : "Verify OTP"}
              </button>
              <button
                type="button"
                onClick={resendOtp}
                disabled={resendCountdown > 0 || otpLoading}
                style={styles.resendBtn}
              >
                {resendCountdown > 0 ? `Resend OTP in ${resendCountdown}s` : "Resend OTP"}
              </button>
              <button type="button" onClick={handleOtpBack} style={styles.changePhone}>
                ← Change number
              </button>
            </>
          )}

          <div style={styles.sectionDivider} />

          <p style={styles.sectionTitle}>Personal details</p>

          <label style={styles.label} htmlFor="booking-name">Full name *</label>
          <input
            id="booking-name"
            placeholder="e.g. Omkar Sharma"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              clearError();
            }}
            style={styles.input}
            maxLength={100}
          />

          <label style={styles.label} htmlFor="booking-gender">Gender *</label>
          <select
            id="booking-gender"
            value={gender}
            onChange={(e) => { setGender(e.target.value); clearError(); }}
            style={styles.input}
          >
            <option value="">Select gender</option>
            {GENDERS.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>

          <label style={styles.label} htmlFor="booking-dob">Date of birth *</label>
          <input
            id="booking-dob"
            type="date"
            value={dateOfBirth}
            max={new Date().toISOString().slice(0, 10)}
            onChange={(e) => { setDateOfBirth(e.target.value); clearError(); }}
            style={styles.input}
          />

          <label style={styles.label}>Upload your picture *</label>
          <p style={styles.photoGuidelines}>
            JPG or PNG only · Max 250 KB · Clear face, solo photo (no group, blur, or obstructed face)
          </p>
          <img
            src="/photo-guidance.png"
            alt="Valid vs invalid photo examples"
            style={styles.photoGuideImage}
          />
          <label htmlFor="booking-photo" style={styles.fileLabel}>
            {photoPreview ? (
              <img src={photoPreview} alt="Preview" style={styles.photoPreview} />
            ) : (
              <div style={styles.filePlaceholder}>
                <span style={styles.fileIcon}>📷</span>
                <span style={styles.fileText}>Tap to select photo (JPG / PNG, max 250 KB)</span>
              </div>
            )}
          </label>
          <input
            id="booking-photo"
            type="file"
            accept="image/jpeg,image/png"
            capture="user"
            onChange={handlePhotoChange}
            style={{ display: "none" }}
          />

          {photo && !isPhotoReady && (
            <button
              type="button"
              onClick={handleUploadPhoto}
              disabled={uploading}
              style={{ ...styles.uploadBtn, opacity: uploading ? 0.7 : 1 }}
            >
              {uploading ? "Uploading…" : "Upload picture"}
            </button>
          )}

          {isPhotoReady && <div style={styles.uploadedBadge}>✅ Picture uploaded</div>}

          {photoPreview && !isPhotoReady && !uploading && (
            <button
              type="button"
              onClick={() => {
                setPhoto(null);
                setPhotoPreview(null);
                setPhotoUrl(null);
              }}
              style={styles.removePhoto}
            >
              Remove picture
            </button>
          )}

          <div style={styles.sectionDivider} />

          <p style={styles.sectionTitle}>Academic section</p>

          <YesNoQuestion
            label="Are you a Xavierite?"
            name="xavierite"
            value={isXavierite}
            onChange={handleXavieriteChange}
            disabled={xavieriteNa}
          />

          <label style={styles.checkboxRow}>
            <input
              type="checkbox"
              checked={xavieriteNa}
              onChange={(e) => handleXavieriteNaChange(e.target.checked)}
            />
            <span>Not Applicable (For external participants / others)</span>
          </label>

          {xavieriteNa && (
            <p style={styles.hintText}>
              Academic details skipped. Continue to Terms &amp; Conditions below.
            </p>
          )}

          {renderAcademicFields()}

          <div style={styles.sectionDivider} />

          <p style={styles.sectionTitle}>Terms &amp; Conditions</p>
          <div style={styles.termsBox}>
            {TERMS_SECTIONS.map((section) => (
              <div key={section.title} style={styles.termsSection}>
                <p style={styles.termsHeading}>{section.title}</p>
                <p style={styles.termsBody}>{section.body}</p>
                {section.bullets && (
                  <ul style={styles.termsList}>
                    {section.bullets.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
          <label style={styles.checkboxRow}>
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={(e) => {
                setTermsAccepted(e.target.checked);
                clearError();
              }}
            />
            <span>
              I have read and agree to the Terms &amp; Conditions above, including consent for my photograph and personal details to be collected and used as described.
            </span>
          </label>
        </div>

        <button
          type="button"
          style={{ ...styles.btn, opacity: loading || !canBook ? 0.6 : 1 }}
          disabled={loading || !canBook}
          onClick={event.price > 0 ? handlePayment : handleBooking}
        >
          {payLabel()}
        </button>
      </div>
    </>
  );
}

const styles = {
  page: {
    padding: "24px 20px",
    maxWidth: "480px",
    margin: "0 auto",
    fontFamily: "'Segoe UI', system-ui, sans-serif",
    color: "#1a1a1a",
  },
  hero: {
    background: "#1A0A00",
    borderRadius: "16px",
    padding: "28px 24px",
    marginBottom: "16px",
  },
  badge: {
    display: "inline-block",
    background: "rgba(255,92,26,0.2)",
    color: "#FF5C1A",
    fontSize: "11px",
    fontWeight: 700,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    padding: "3px 10px",
    borderRadius: "20px",
    border: "1px solid rgba(255,92,26,0.35)",
    marginBottom: "10px",
  },
  title: {
    color: "#FF5C1A",
    fontSize: "26px",
    fontWeight: 800,
    margin: "0 0 6px 0",
    letterSpacing: "-0.02em",
  },
  eventName: { color: "rgba(255,255,255,0.75)", fontSize: "15px", margin: "0 0 10px 0" },
  slotPill: {
    display: "inline-block",
    background: "rgba(255,255,255,0.08)",
    color: "rgba(255,255,255,0.6)",
    fontSize: "12px",
    padding: "4px 10px",
    borderRadius: "20px",
    border: "1px solid rgba(255,255,255,0.12)",
  },
  card: {
    background: "#fff",
    padding: "20px",
    borderRadius: "12px",
    border: "1px solid #eee",
    boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
    marginBottom: "0",
  },
  sectionTitle: {
    fontSize: "13px",
    fontWeight: 800,
    color: "#1a1a1a",
    margin: "0 0 12px 0",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  sectionDivider: {
    height: "1px",
    background: "#eee",
    margin: "20px 0",
  },
  label: {
    display: "block",
    fontSize: "12px",
    fontWeight: 700,
    color: "#555",
    marginBottom: "6px",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  },
  questionBlock: { marginBottom: "16px" },
  questionLabel: {
    fontSize: "13px",
    fontWeight: 700,
    color: "#333",
    margin: "0 0 8px 0",
  },
  radioRow: { display: "flex", gap: "16px" },
  radioOption: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "14px",
    fontWeight: 600,
    cursor: "pointer",
  },
  checkboxRow: {
    display: "flex",
    alignItems: "flex-start",
    gap: "10px",
    fontSize: "13px",
    color: "#444",
    lineHeight: 1.5,
    cursor: "pointer",
    marginBottom: "4px",
  },
  hintText: {
    fontSize: "12px",
    color: "#777",
    margin: "0 0 12px 0",
    fontStyle: "italic",
  },
  phoneRow: {
    display: "flex",
    alignItems: "stretch",
    border: "1px solid #ddd",
    borderRadius: "8px",
    overflow: "hidden",
    marginBottom: "10px",
  },
  countryCode: {
    padding: "10px 10px",
    background: "#f5f5f5",
    fontSize: "14px",
    fontWeight: 600,
    color: "#555",
    borderRight: "1px solid #ddd",
    display: "flex",
    alignItems: "center",
  },
  input: {
    width: "100%",
    padding: "10px 12px",
    marginBottom: "14px",
    borderRadius: "8px",
    border: "1px solid #ddd",
    fontSize: "14px",
    outline: "none",
    boxSizing: "border-box",
  },
  otpBtn: {
    width: "100%",
    padding: "11px",
    background: "#1A0A00",
    color: "white",
    border: "none",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: 700,
    cursor: "pointer",
    marginBottom: "8px",
  },
  resendBtn: {
    width: "100%",
    background: "none",
    border: "1px solid #ddd",
    borderRadius: "8px",
    color: "#FF5C1A",
    fontSize: "13px",
    fontWeight: 600,
    cursor: "pointer",
    padding: "8px",
    marginBottom: "6px",
  },
  changePhone: {
    background: "none",
    border: "none",
    color: "#FF5C1A",
    fontSize: "13px",
    fontWeight: 600,
    cursor: "pointer",
    padding: "4px 0 8px",
  },
  verifiedBadge: {
    fontSize: "13px",
    color: "#16a34a",
    fontWeight: 600,
    padding: "8px 12px",
    background: "#f0fdf4",
    borderRadius: "8px",
    border: "1px solid #bbf7d0",
    marginBottom: "4px",
  },
  devOtpBox: {
    background: "#fffbe6",
    border: "1px solid #ffe58f",
    color: "#7c5800",
    fontSize: "13px",
    padding: "8px 12px",
    borderRadius: "7px",
    marginBottom: "10px",
  },
  photoGuidelines: {
    fontSize: "12px",
    color: "#666",
    margin: "0 0 10px 0",
    lineHeight: 1.45,
  },
  photoGuideImage: {
    width: "100%",
    borderRadius: "10px",
    marginBottom: "12px",
    display: "block",
    border: "1px solid #eee",
  },
  fileLabel: { display: "block", cursor: "pointer", marginBottom: "8px" },
  filePlaceholder: {
    border: "2px dashed #ddd",
    borderRadius: "10px",
    padding: "24px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "8px",
    background: "#fafafa",
  },
  fileIcon: { fontSize: "28px" },
  fileText: { fontSize: "13px", color: "#aaa", textAlign: "center" },
  photoPreview: {
    width: "100%",
    maxHeight: "200px",
    objectFit: "cover",
    borderRadius: "10px",
    display: "block",
  },
  uploadBtn: {
    width: "100%",
    padding: "10px",
    background: "#1A0A00",
    color: "white",
    border: "none",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: 700,
    cursor: "pointer",
    marginBottom: "6px",
  },
  uploadedBadge: {
    fontSize: "13px",
    color: "#16a34a",
    fontWeight: 600,
    padding: "6px 0",
  },
  removePhoto: {
    background: "none",
    border: "none",
    color: "#d0312d",
    fontSize: "12px",
    cursor: "pointer",
    padding: "0 0 12px 0",
    textDecoration: "underline",
  },
  termsBox: {
    maxHeight: "220px",
    overflowY: "auto",
    padding: "12px 14px",
    marginBottom: "14px",
    background: "#fafafa",
    border: "1px solid #eee",
    borderRadius: "8px",
    fontSize: "12px",
    color: "#444",
    lineHeight: 1.5,
  },
  termsSection: { marginBottom: "12px" },
  termsHeading: {
    fontSize: "12px",
    fontWeight: 700,
    color: "#333",
    margin: "0 0 4px 0",
  },
  termsBody: { margin: "0 0 4px 0" },
  termsList: { margin: "4px 0 0 0", paddingLeft: "18px" },
  btn: {
    width: "100%",
    padding: "14px",
    background: "#FF5C1A",
    color: "white",
    border: "none",
    borderRadius: "10px",
    marginTop: "14px",
    fontWeight: 700,
    fontSize: "16px",
    cursor: "pointer",
  },
  errorBox: {
    background: "#fff0f0",
    border: "1px solid #fdd",
    color: "#d0312d",
    fontSize: "13px",
    padding: "8px 12px",
    borderRadius: "7px",
    marginBottom: "14px",
  },
  backLink: {
    marginTop: "12px",
    background: "none",
    border: "none",
    color: "#FF5C1A",
    fontWeight: 600,
    cursor: "pointer",
    fontSize: "14px",
  },
};
