import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

import { encryptCredentials, decryptCredentials } from "./encryption.ts"
import { MailerLiteConnector } from "./MailerLiteConnector.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })

type ProviderType = "mailerlite" | "brevo"
const PROVIDER_TYPES: ProviderType[] = ["mailerlite", "brevo"]

/**
 * Validate credentials against the (still mocked) provider rules.
 * No real outbound API calls yet — accept any non-empty key.
 * NEVER log the key itself.
 */
function validateApiKey(apiKey: unknown): { valid: boolean; message?: string } {
  if (typeof apiKey !== "string" || apiKey.trim().length === 0) {
    return { valid: false, message: "API key requerida" }
  }
  if (apiKey.trim().length < 8) {
    return { valid: false, message: "La API key parece demasiado corta" }
  }
  return { valid: true }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })

  try {
    const authHeader = req.headers.get("Authorization")
    if (!authHeader) return json({ error: "Missing authorization" }, 401)

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    )

    const { data: { user }, error: authErr } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", ""),
    )
    if (authErr || !user) return json({ error: "Unauthorized" }, 401)

    const { data: profile } = await supabase
      .from("profiles")
      .select("tenant_id, role")
      .eq("id", user.id)
      .single()
    if (!profile?.tenant_id) return json({ error: "Profile not found" }, 404)

    const body = await req.json().catch(() => ({}))
    const action = body.action as string | undefined
    const providerType = body.provider_type as ProviderType | undefined

    if (!providerType || !PROVIDER_TYPES.includes(providerType)) {
      return json({ error: "Invalid provider_type" }, 400)
    }

    // ── connect ────────────────────────────────────────────────────────────
    if (action === "connect") {
      const apiKey = typeof body.api_key === "string" ? body.api_key.trim() : ""
      const check = validateApiKey(apiKey)
      if (!check.valid) return json({ error: check.message }, 400)

      // Encrypt server-side BEFORE persistence. Plaintext never stored.
      const encrypted = encryptCredentials({ apiKey })

      const { error } = await supabase.from("provider_connections").upsert(
        {
          tenant_id: profile.tenant_id,
          provider_type: providerType,
          status: "connected",
          encrypted_credentials: encrypted,
          last_sync_at: null,
        },
        { onConflict: "tenant_id,provider_type" },
      )
      if (error) throw error

      // Response NEVER includes credentials.
      return json({ success: true, provider_type: providerType, status: "connected" })
    }

    // ── disconnect ───────────────────────────────────────────────────────────
    if (action === "disconnect") {
      const { error } = await supabase
        .from("provider_connections")
        .update({ status: "disconnected", encrypted_credentials: null })
        .eq("tenant_id", profile.tenant_id)
        .eq("provider_type", providerType)
      if (error) throw error

      return json({ success: true, provider_type: providerType, status: "disconnected" })
    }

    // ── test_connection ──────────────────────────────────────────────────────
    if (action === "test_connection") {
      const { data: conn, error } = await supabase
        .from("provider_connections")
        .select("encrypted_credentials, status")
        .eq("tenant_id", profile.tenant_id)
        .eq("provider_type", providerType)
        .maybeSingle()
      if (error) throw error
      if (!conn) return json({ error: "Provider no conectado" }, 404)

      // Decrypt server-side only; used for the (mocked) test. Never returned.
      const creds = decryptCredentials(conn.encrypted_credentials)
      const check = validateApiKey(creds?.apiKey)

      return json({
        success: check.valid,
        provider_type: providerType,
        message: check.valid ? "Conexión válida" : "Credenciales inválidas",
      })
    }

    return json({ error: "Invalid action" }, 400)
  } catch (err) {
    // Never log credentials; only a generic message.
    console.error("manage-provider-connection error:", err instanceof Error ? err.message : "unknown")
    return json({ error: err instanceof Error ? err.message : String(err) }, 500)
  }
})
