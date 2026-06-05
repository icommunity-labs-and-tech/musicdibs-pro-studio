import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" }
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } })

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })
  try {
    const authHeader = req.headers.get("Authorization")
    if (!authHeader) return json({ error: "Missing authorization" }, 401)

    const supabaseAdmin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!)
    const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(authHeader.replace("Bearer ", ""))
    if (authErr || !user) return json({ error: "Unauthorized" }, 401)

    const { data: profile } = await supabaseAdmin.from("profiles").select("is_superadmin").eq("id", user.id).single()
    if (!profile?.is_superadmin) return json({ error: "Forbidden: superadmin required" }, 403)

    const { tenant_id } = await req.json()
    if (!tenant_id) return json({ error: "tenant_id required" }, 400)

    let { data: targetProfile } = await supabaseAdmin.from("profiles").select("id").eq("tenant_id", tenant_id).eq("role", "admin").limit(1).single()
    if (!targetProfile) {
      const { data: anyProfile } = await supabaseAdmin.from("profiles").select("id").eq("tenant_id", tenant_id).limit(1).single()
      if (!anyProfile) return json({ error: "No users found in this tenant" }, 404)
      targetProfile = anyProfile
    }

    const { data: { user: targetUser } } = await supabaseAdmin.auth.admin.getUserById(targetProfile.id)
    if (!targetUser?.email) return json({ error: "Could not retrieve target user" }, 500)

    const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink", email: targetUser.email,
      options: { redirectTo: `${Deno.env.get("SITE_URL") ?? "https://enterprise.musicdibs.com"}/dashboard` },
    })
    if (linkErr || !linkData) return json({ error: `Link generation failed: ${linkErr?.message}` }, 500)

    await supabaseAdmin.from("audit_logs").insert({ tenant_id, user_id: user.id, actor_email: user.email, action: "superadmin.impersonate", resource_type: "tenant", resource_id: tenant_id, resource_name: `Impersonating ${targetUser.email}`, metadata: { impersonated_user_id: targetProfile.id } })

    return json({ magic_link: linkData.properties?.action_link, impersonated_email: targetUser.email })
  } catch (err) {
    console.error("impersonate-tenant error:", err)
    return json({ error: err instanceof Error ? err.message : String(err) }, 500)
  }
})
