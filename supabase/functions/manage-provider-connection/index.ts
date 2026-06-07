import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

import { encryptCredentials, decryptCredentials } from "./encryption.ts"
import { MailerLiteConnector } from "./MailerLiteConnector.ts"
import { ResendConnector } from "./ResendConnector.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })

type ProviderType = "mailerlite" | "brevo" | "resend"
const PROVIDER_TYPES: ProviderType[] = ["mailerlite", "brevo", "resend"]

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

    // ── sync_audiences ─────────────────────────────────────────────────────────
    // Pulls AUDIENCE METADATA ONLY (id, name, count, type) from the provider and
    // upserts it into provider_audiences. NEVER fetches/stores subscriber PII.
    if (action === "sync_audiences") {
      const { data: conn, error: connErr } = await supabase
        .from("provider_connections")
        .select("id, encrypted_credentials, status")
        .eq("tenant_id", profile.tenant_id)
        .eq("provider_type", providerType)
        .maybeSingle()
      if (connErr) throw connErr
      if (!conn) return json({ error: "Provider no conectado" }, 404)

      const creds = decryptCredentials(conn.encrypted_credentials)
      const apiKey = typeof creds?.apiKey === "string" ? creds.apiKey : ""
      if (!apiKey) return json({ error: "Credenciales no disponibles" }, 400)

      // Only MailerLite has a real integration in TASK 002.
      if (providerType !== "mailerlite") {
        return json({ error: "Sincronización no disponible para este proveedor todavía" }, 400)
      }

      const connector = new MailerLiteConnector(apiKey)

      const validation = await connector.validateCredentials()
      if (!validation.valid) {
        await supabase
          .from("provider_connections")
          .update({ status: "error" })
          .eq("id", conn.id)
        return json({ error: validation.message ?? "Credenciales inválidas" }, 400)
      }

      const audiences = await connector.syncAudiences()
      const now = new Date().toISOString()

      // Upsert metadata-only rows (no PII fields are ever written).
      if (audiences.length > 0) {
        const rows = audiences.map((a) => ({
          tenant_id: profile.tenant_id,
          provider_connection_id: conn.id,
          external_id: a.external_id,
          name: a.name,
          audience_type: a.audience_type,
          contacts_count: a.contacts_count,
          last_sync_at: now,
        }))
        const { error: upsertErr } = await supabase
          .from("provider_audiences")
          .upsert(rows, { onConflict: "provider_connection_id,external_id" })
        if (upsertErr) throw upsertErr
      }

      // Remove audiences that no longer exist upstream (metadata hygiene).
      const keepIds = audiences.map((a) => a.external_id)
      let staleQuery = supabase
        .from("provider_audiences")
        .delete()
        .eq("provider_connection_id", conn.id)
      if (keepIds.length > 0) {
        staleQuery = staleQuery.not(
          "external_id",
          "in",
          `(${keepIds.map((id) => `"${id}"`).join(",")})`,
        )
      }
      const { error: delErr } = await staleQuery
      if (delErr) throw delErr

      // Mark connection as freshly synced & healthy.
      await supabase
        .from("provider_connections")
        .update({ status: "connected", last_sync_at: now })
        .eq("id", conn.id)

      return json({
        success: true,
        provider_type: providerType,
        synced_count: audiences.length,
        last_sync_at: now,
      })
    }

    return json({ error: "Invalid action" }, 400)
  } catch (err) {
    // Never log credentials; only a generic message.
    console.error("manage-provider-connection error:", err instanceof Error ? err.message : "unknown")
    return json({ error: err instanceof Error ? err.message : String(err) }, 500)
  }
})
