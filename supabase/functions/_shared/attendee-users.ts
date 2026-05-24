import adminSupabase from "./supabase.ts";
import {
  COLLEGE_PLACEHOLDER,
  parseCollegeDisplayFromBookingDetails,
} from "./college.ts";

export async function upsertUser(phone: string) {
  await adminSupabase
    .from("users")
    .upsert([{ phone_number: phone }], { onConflict: "phone_number", ignoreDuplicates: true });
}

export async function upsertGoogleUser(opts: {
  google_sub: string;
  email: string | null;
  full_name: string | null;
}) {
  const { error } = await adminSupabase.from("users").upsert(
    [
      {
        google_sub: opts.google_sub,
        email: opts.email ?? null,
        full_name: opts.full_name ?? null,
      },
    ],
    { onConflict: "google_sub" },
  );
  if (error) throw error;
}

export async function linkPhoneAfterOtp(phone: string, googleSubFromToken: string | null) {
  if (!googleSubFromToken) {
    await upsertUser(phone);
    return;
  }

  const { data: byGoogle, error: eg } = await adminSupabase
    .from("users")
    .select("id")
    .eq("google_sub", googleSubFromToken)
    .maybeSingle();
  if (eg) throw eg;

  const { data: byPhone, error: ep } = await adminSupabase
    .from("users")
    .select("id")
    .eq("phone_number", phone)
    .maybeSingle();
  if (ep) throw ep;

  if (byGoogle && byPhone) {
    if (byGoogle.id === byPhone.id) return;
    await adminSupabase.from("users").delete().eq("id", byGoogle.id);
    const { error: uErr } = await adminSupabase
      .from("users")
      .update({ google_sub: googleSubFromToken })
      .eq("id", byPhone.id);
    if (uErr) throw uErr;
    return;
  }

  if (byGoogle && !byPhone) {
    const { error } = await adminSupabase
      .from("users")
      .update({ phone_number: phone })
      .eq("google_sub", googleSubFromToken);
    if (error) throw error;
    return;
  }

  await upsertUser(phone);
  const { error: linkErr } = await adminSupabase
    .from("users")
    .update({ google_sub: googleSubFromToken })
    .eq("phone_number", phone);
  if (linkErr) throw linkErr;
}

async function fetchLatestTicketCollege(phone: string): Promise<string | null> {
  const { data, error } = await adminSupabase
    .from("tickets")
    .select("college")
    .eq("phone", phone)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data?.college ?? null;
}

async function enrichUserProfileCollege(
  user: Record<string, unknown> | null,
  phone: string | null | undefined,
) {
  if (!user) return null;

  let display = (user.college as string | null)?.trim() || null;
  const parsedStored = parseCollegeDisplayFromBookingDetails(display);
  if (parsedStored) {
    display = parsedStored;
  } else if (display?.includes("Gender:")) {
    display = null;
  } else if (display && display.length > 120) {
    display = null;
  }

  if (!display && phone) {
    const ticketCollege = await fetchLatestTicketCollege(phone);
    if (ticketCollege) {
      display = parseCollegeDisplayFromBookingDetails(ticketCollege);
    }
  }

  return { ...user, college: display || COLLEGE_PLACEHOLDER };
}

export async function updateUserCollegeByPhone(phone: string, collegeName: string) {
  const trimmed = collegeName?.trim();
  if (!phone || !trimmed || trimmed.length > 120) return;
  const { error } = await adminSupabase
    .from("users")
    .update({ college: trimmed })
    .eq("phone_number", phone);
  if (error) throw error;
}

export async function fetchUserProfileForAttendee(opts: {
  phone?: string | null;
  google_sub?: string | null;
}) {
  const phone = opts.phone;
  const google_sub = opts.google_sub;
  let user: Record<string, unknown> | null = null;

  if (phone) {
    const { data, error } = await adminSupabase
      .from("users")
      .select("*")
      .eq("phone_number", phone)
      .maybeSingle();
    if (error) throw error;
    user = data;
  } else if (google_sub) {
    const { data, error } = await adminSupabase
      .from("users")
      .select("*")
      .eq("google_sub", google_sub)
      .maybeSingle();
    if (error) throw error;
    user = data;
  }

  return enrichUserProfileCollege(user, phone);
}
