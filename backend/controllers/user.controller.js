import adminSupabase from "../services/supabase.service.js";
import { signToken } from "../services/jwt.service.js";

// GET /auth/google-url
export function getGoogleAuthUrl(req, res) {
  const origin = req.query.origin || process.env.ALLOWED_ORIGINS.split(",")[0];
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return res.status(500).json({ error: "Supabase environment variables are missing on server." });
  }

  // Construct Supabase OAuth authorize URL
  const redirectUrl = `${origin}/auth/callback`;
  const authUrl = `${supabaseUrl}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(redirectUrl)}&apikey=${supabaseAnonKey}`;

  return res.json({ url: authUrl });
}

// GET /profile
export async function getProfile(req, res) {
  try {
    const email = req.userEmail;
    const phone = req.userPhone;

    let dbUser = null;
    if (phone) {
      const { data, error } = await adminSupabase
        .from("users")
        .select("*")
        .eq("phone_number", phone)
        .maybeSingle();
      if (!error && data) dbUser = data;
    }

    if (!dbUser && email) {
      const { data, error } = await adminSupabase
        .from("users")
        .select("*")
        .eq("email", email)
        .maybeSingle();
      if (!error && data) dbUser = data;
    }

    if (!dbUser) {
      return res.json({
        user: {
          email: email || "",
          full_name: req.userName || "",
          phone_number: "",
          college: "",
          photo_url: ""
        }
      });
    }

    return res.json({ user: dbUser });
  } catch (err) {
    console.error("getProfile error:", err);
    return res.status(500).json({ error: "Failed to fetch profile." });
  }
}

// PATCH /profile
export async function updateProfile(req, res) {
  try {
    const { full_name, email, college, photo_url, phone_number } = req.body;

    if (!phone_number || !/^[6-9]\d{9}$/.test(phone_number)) {
      return res.status(400).json({ error: "Valid 10-digit phone number is required." });
    }
    if (!full_name || full_name.trim().length > 100) {
      return res.status(400).json({ error: "Invalid full name." });
    }
    if (!college || college.trim().length > 150) {
      return res.status(400).json({ error: "Invalid college name." });
    }

    // Upsert into users table
    const { error } = await adminSupabase
      .from("users")
      .upsert({
        phone_number,
        full_name: full_name.trim(),
        email: email ? email.trim() : (req.userEmail || null),
        college: college.trim(),
        photo_url: photo_url || null
      }, { onConflict: "phone_number" });

    if (error) {
      console.error("Upsert user error:", error);
      return res.status(500).json({ error: "Failed to save profile." });
    }

    // Issue updated token with phone number
    const token = signToken({
      role: "student",
      email: email || req.userEmail,
      name: full_name,
      phone: phone_number,
      sub: req.userSub
    });

    return res.json({
      success: true,
      token,
      user: {
        phone_number,
        full_name,
        email: email || req.userEmail,
        college,
        photo_url
      }
    });
  } catch (err) {
    console.error("updateProfile error:", err);
    return res.status(500).json({ error: "Failed to update profile." });
  }
}

// POST /upload
export async function uploadPhoto(req, res) {
  try {
    const { fileData, fileName } = req.body;

    if (!fileData || !fileName) {
      return res.status(400).json({ error: "fileData and fileName are required." });
    }

    const matches = fileData.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return res.status(400).json({ error: "Invalid base64 file data." });
    }

    const mimeType = matches[1];
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, "base64");

    if (buffer.length > 5 * 1024 * 1024) {
      return res.status(400).json({ error: "File size exceeds the 5MB limit." });
    }

    const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!ALLOWED_TYPES.includes(mimeType)) {
      return res.status(400).json({ error: "Only JPEG, PNG, or WebP images are allowed." });
    }

    const { error } = await adminSupabase.storage
      .from("photos")
      .upload(fileName, buffer, {
        contentType: mimeType,
        upsert: true
      });

    if (error) {
      console.error("Supabase storage upload error:", error);
      return res.status(500).json({ error: "Failed to upload photo." });
    }

    const { data: urlData } = adminSupabase.storage
      .from("photos")
      .getPublicUrl(fileName);

    return res.json({ success: true, publicUrl: urlData.publicUrl });
  } catch (err) {
    console.error("uploadPhoto error:", err);
    return res.status(500).json({ error: "Internal server error during upload." });
  }
}
