import adminSupabase from "./supabase.ts";

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

export async function fetchUserProfileForAttendee(opts: {
  phone?: string | null;
  google_sub?: string | null;
}) {
  const phone = opts.phone;
  const google_sub = opts.google_sub;
  if (phone) {
    const { data, error } = await adminSupabase
      .from("users")
      .select("*")
      .eq("phone_number", phone)
      .maybeSingle();
    if (error) throw error;
    return data;
  }
  if (google_sub) {
    const { data, error } = await adminSupabase
      .from("users")
      .select("*")
      .eq("google_sub", google_sub)
      .maybeSingle();
    if (error) throw error;
    return data;
  }
  return null;
}
