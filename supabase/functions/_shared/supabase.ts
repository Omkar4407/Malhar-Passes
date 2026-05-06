import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Single service-role client — same pattern as your supabase.service.js
const adminSupabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

export default adminSupabase;
