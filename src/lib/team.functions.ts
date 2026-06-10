import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const removeTeamMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { memberId: string }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Caller profile
    const { data: caller, error: callerErr } = await supabase
      .from("profiles")
      .select("tenant_id, role, is_superadmin")
      .eq("id", userId)
      .single();

    if (callerErr || !caller) throw new Error("No autorizado");
    if (
      !caller.is_superadmin &&
      caller.role !== "admin" &&
      caller.role !== "owner"
    ) {
      throw new Error("Solo los administradores pueden eliminar miembros");
    }

    // Target profile
    const { data: target, error: targetErr } = await supabase
      .from("profiles")
      .select("tenant_id, role, id")
      .eq("id", data.memberId)
      .single();

    if (targetErr || !target) throw new Error("Miembro no encontrado");
    if (target.tenant_id !== caller.tenant_id)
      throw new Error("No autorizado");
    if (target.id === userId)
      throw new Error("No puedes eliminarte a ti mismo");
    if (target.role === "owner" && !caller.is_superadmin)
      throw new Error("No puedes eliminar al propietario");

    // Delete profile row via admin client (bypasses RLS)
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { error: delErr } = await supabaseAdmin
      .from("profiles")
      .delete()
      .eq("id", data.memberId);

    if (delErr) throw delErr;
    return { success: true };
  });
