import { createClient } from "@supabase/supabase-js";

// Created ONCE at startup — never per-request
const adminSupabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default adminSupabase;