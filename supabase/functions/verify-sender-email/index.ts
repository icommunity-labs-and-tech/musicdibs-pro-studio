import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" }
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } })

async function checkMailerlite(apiKey: string) {
  const res = await fetch("https://connect.mailerlite.com/api/senders", { headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" } })
  if (!res.ok) return { verified: false, email: null, name: null }
  const data = await res.json()
  const senders: any[] = data?.data ?? []
  const verified = senders.find(s => s.is_verified === true || s.status === "active")
  return { verified: !!verified, email: verified?.email ?? senders[0]?.email ?? null, name: verified?.name ?? senders[0]?.name ?? null }
}

async function checkBrevo(apiKey: string) {
  const res = await fetch("https://api.brevo.com/v3/senders", { headers: { "api-key": apiKey, "Content-Type": "application/json" } })
  if (!res.ok) return { verified: false, email: null, name: null }
  const data = await res.json()
  const senders: any[] = data?.senders ?? []
  const verified = senders.find(s => s.active === true)
  return { verified: !!verified, email: verified?.email ?? senders[0]?.fromEmail ?? null, name: verified?.name ?? senders[0]?.fromName ?? null }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })
  try {
    const authHeader = req.headers.get("Authorization")
    if (!authHeader) return json({ error: "Missing authorization" }, 401)

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!)
    const { data: { user }, error: authErr } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""))
    if (authErr || !user) return json({ error: "Unauthorized" }, 401)

    const { data: profile } = await supabase.from("profiles").select("tenant_id").eq("id", user.id).single()
    if (!profile?.tenant_id) return json({ error: "Profile not found" }, 404)

    const { data: settings } = await supabase.from("tenant_settings").select("api_keys").eq("tenant_id", profile.tenant_id).maybeSingle()
    const apiKeys: Record<string, string> = (settings?.api_keys as any) ?? {}

    const provider = apiKeys.mailing_provider ?? "mailerlite"
    const activeKey = provider === "brevo" ? apiKeys.brevo : apiKeys.mailerlite
    if (!activeKey) return json({ verified: false, email: null, name: null, provider, error: "api_key_missing", message: `No hay API key configurada para ${provider}` })

    const result = provider === "brevo" ? await checkBrevo(activeKey) : await checkMailerlite(activeKey)
    return json({ ...result, provider, message: result.verified ? `Sender verificado: ${result.email}` : `No hay sender verificado en ${provider}` })
  } catch (err) {
    console.error("verify-sender-email error:", err)
    return json({ error: err instanceof Error ? err.message : String(err) }, 500)
  }
})
