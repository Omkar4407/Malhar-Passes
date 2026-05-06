import { handleCors, json, requireAdminToken } from "../_shared/http.ts";
import adminSupabase from "../_shared/supabase.ts";

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    await requireAdminToken(req);
  } catch (err: unknown) {
    const e = err as { status?: number; message?: string };
    return json(req, { error: e.message }, e.status ?? 401);
  }

  try {
    const { slot_id, is_released } = await req.json();
    if (!slot_id || typeof is_released !== "boolean")
      return json(req, { error: "slot_id and is_released (boolean) are required." }, 400);

    const { data, error } = await adminSupabase
      .from("slots")
      .update({ is_released })
      .eq("id", slot_id)
      .select()
      .single();

    if (error) throw error;
    return json(req, { success: true, slot: data });
  } catch (err) {
    console.error("toggle-release-slot error:", err);
    return json(req, { error: "Failed to update slot." }, 500);
  }
});
