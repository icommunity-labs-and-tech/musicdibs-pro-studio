import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" }
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } })

async function generateApiKey(): Promise<string> {
  const bytes = new Uint8Array(24); crypto.getRandomValues(bytes)
  return `mdb_live_${Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("")}`
}
async function hashKey(key: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(key))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("")
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })
  try {
    const authHeader = req.headers.get("Authorization")
    if (!authHeader) return json({ error: "Missing authorization" }, 401)

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!)
    const { data: { user }, error: authErr } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""))
    if (authErr || !user) return json({ error: "Unauthorized" }, 401)

    const { data: profile } = await supabase.from("profiles").select("tenant_id, role").eq("id", user.id).single()
    if (!profile) return json({ error: "Profile not found" }, 404)
    if (profile.role !== "admin") return json({ error: "Only admins can manage API keys" }, 403)

    const { action, key_id, name } = await req.json().catch(() => ({}))

    if (action === "create") {
      const { count } = await supabase.from("tenant_api_keys").select("*", { count: "exact", head: true }).eq("tenant_id", profile.tenant_id).is("revoked_at", null)
      if ((count ?? 0) >= 5) return json({ error: "Maximum 5 active API keys per tenant" }, 429)

      const rawKey = await generateApiKey()
      const { data: newKey, error: insertErr } = await supabase.from("tenant_api_keys").insert({
        tenant_id: profile.tenant_id, name: name ?? "API Key",
        key_hash: await hashKey(rawKey), key_prefix: rawKey.slice(0, 14), created_by: user.id,
      }).select("id, name, key_prefix, created_at").single()
      if (insertErr) throw insertErr
      return json({ ...newKey, raw_key: rawKey, warning: "Save this key now. It will not be shown again." })
    }

    if (action === "revoke") {
      if (!key_id) return json({ error: "key_id required" }, 400)
      const { error } = await supabase.from("tenant_api_keys").update({ revoked_at: new Date().toISOString() }).eq("id", key_id).eq("tenant_id", profile.tenant_id)
      if (error) throw error
      return json({ success: true, key_id })
    }

    const { data: keys } = await supabase.from("tenant_api_keys").select("id, name, key_prefix, last_used_at, created_at, revoked_at").eq("tenant_id", profile.tenant_id).order("created_at", { ascending: false })
    return json({ keys: keys ?? [] })
  } catch (err) {
    console.error("manage-api-keys error:", err)
    return json({ error: err instanceof Error ? err.message : String(err) }, 500)
  }
})
