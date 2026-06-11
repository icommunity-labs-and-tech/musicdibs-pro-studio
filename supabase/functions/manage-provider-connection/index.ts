import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

import { encryptCredentials, decryptCredentials } from "./encryption.ts"
import { MailerLiteConnector } from "./MailerLiteConnector.ts"
import { ResendConnector } from "./ResendConnector.ts"
import { TwilioConnector } from "./TwilioConnector.ts"
import { WhatsAppCloudConnector } from "./WhatsAppCloudConnector.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })

type ProviderType = "mailerlite" | "brevo" | "resend" | "twilio" | "whatsapp"
const PROVIDER_TYPES: ProviderType[] = ["mailerlite", "brevo", "resend", "twilio", "whatsapp"]

// Canales aditivos (WhatsApp/SMS): conviven con el proveedor de email activo y
// NO entran en la lógica de "un único conector activo".
const ADDITIVE_PROVIDERS: ProviderType[] = ["twilio", "whatsapp"]

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
      // ── Twilio: flujo separado (credenciales de Account SID / Auth Token /
      // números de origen, no un "api_key" único) ─────────────────────────
      if (providerType === "twilio") {
        const accountSid   = typeof body.account_sid   === "string" ? body.account_sid.trim()   : ""
        const authToken    = typeof body.auth_token    === "string" ? body.auth_token.trim()    : ""
        const whatsappFrom = typeof body.whatsapp_from === "string" ? body.whatsapp_from.trim() : ""
        const smsFrom      = typeof body.sms_from      === "string" ? body.sms_from.trim()      : ""

        const { data: existingTw } = await supabase
          .from("provider_connections")
          .select("encrypted_credentials")
          .eq("tenant_id", profile.tenant_id)
          .eq("provider_type", "twilio")
          .maybeSingle()

        const existingTwCreds: Record<string, unknown> =
          existingTw?.encrypted_credentials
            ? (decryptCredentials(existingTw.encrypted_credentials) ?? {})
            : {}

        const finalSid   = accountSid || (existingTwCreds.accountSid as string | undefined) || ""
        const finalToken = authToken  || (existingTwCreds.authToken  as string | undefined) || ""

        if (!finalSid || !finalToken) {
          return json({ error: "Account SID y Auth Token son requeridos" }, 400)
        }

        const validation = await new TwilioConnector({ accountSid: finalSid, authToken: finalToken }).validateCredentials()
        if (!validation.valid) {
          return json({ error: validation.message ?? "Credenciales de Twilio inválidas" }, 400)
        }

        const encrypted = encryptCredentials({
          ...existingTwCreds,
          accountSid: finalSid,
          authToken: finalToken,
          whatsappFrom: whatsappFrom || existingTwCreds.whatsappFrom || "",
          smsFrom: smsFrom || existingTwCreds.smsFrom || "",
        })

        const { error: upsertErr } = await supabase.from("provider_connections").upsert(
          {
            tenant_id: profile.tenant_id,
            provider_type: "twilio",
            status: "connected",
            encrypted_credentials: encrypted,
            last_sync_at: null,
          },
          { onConflict: "tenant_id,provider_type" },
        )
        if (upsertErr) throw upsertErr

        // Twilio es un canal adicional (WhatsApp/SMS), NO reemplaza al
        // proveedor de email activo (Resend/MailerLite/Brevo) — ambos pueden
        // estar 'connected' simultáneamente, a diferencia del resto de
        // proveedores que son mutuamente excluyentes.
        return json({ success: true, provider_type: "twilio", status: "connected" })
      }

      // ── WhatsApp Business (Cloud API de Meta): flujo separado con Access
      // Token + Phone Number ID + WABA ID + plantilla aprobada ─────────────
      if (providerType === "whatsapp") {
        const accessToken      = typeof body.access_token       === "string" ? body.access_token.trim()       : ""
        const phoneNumberId    = typeof body.phone_number_id    === "string" ? body.phone_number_id.trim()    : ""
        const wabaId           = typeof body.waba_id            === "string" ? body.waba_id.trim()            : ""
        const templateName     = typeof body.template_name      === "string" ? body.template_name.trim()      : ""
        const templateLanguage = typeof body.template_language  === "string" ? body.template_language.trim()  : ""

        const { data: existingWa } = await supabase
          .from("provider_connections")
          .select("encrypted_credentials")
          .eq("tenant_id", profile.tenant_id)
          .eq("provider_type", "whatsapp")
          .maybeSingle()

        const existingWaCreds: Record<string, unknown> =
          existingWa?.encrypted_credentials
            ? (decryptCredentials(existingWa.encrypted_credentials) ?? {})
            : {}

        const finalToken = accessToken   || (existingWaCreds.accessToken   as string | undefined) || ""
        const finalPhone = phoneNumberId || (existingWaCreds.phoneNumberId as string | undefined) || ""

        if (!finalToken || !finalPhone) {
          return json({ error: "Access Token y Phone Number ID son requeridos" }, 400)
        }

        const validation = await new WhatsAppCloudConnector({
          accessToken: finalToken,
          phoneNumberId: finalPhone,
        }).validateCredentials()
        if (!validation.valid) {
          return json({ error: validation.message ?? "Credenciales de WhatsApp inválidas" }, 400)
        }

        const encrypted = encryptCredentials({
          ...existingWaCreds,
          accessToken: finalToken,
          phoneNumberId: finalPhone,
          wabaId: wabaId || existingWaCreds.wabaId || "",
          templateName: templateName || existingWaCreds.templateName || "",
          templateLanguage: templateLanguage || existingWaCreds.templateLanguage || "es",
        })

        const { error: upsertErr } = await supabase.from("provider_connections").upsert(
          {
            tenant_id: profile.tenant_id,
            provider_type: "whatsapp",
            status: "connected",
            encrypted_credentials: encrypted,
            last_sync_at: null,
          },
          { onConflict: "tenant_id,provider_type" },
        )
        if (upsertErr) throw upsertErr

        // WhatsApp Business es un canal adicional como Twilio: convive con el
        // proveedor de email activo.
        return json({ success: true, provider_type: "whatsapp", status: "connected" })
      }


      const apiKey = typeof body.api_key === "string" ? body.api_key.trim() : ""

      // Load any previously stored credentials for this provider.
      // We use a MERGE pattern: decrypt existing → spread → add new apiKey →
      // re-encrypt. This preserves other fields (e.g. webhookSecret) that may
      // have been stored in a separate step, even if the user is just
      // re-entering or rotating their API key.
      const { data: existing } = await supabase
        .from("provider_connections")
        .select("encrypted_credentials")
        .eq("tenant_id", profile.tenant_id)
        .eq("provider_type", providerType)
        .maybeSingle()

      let encrypted: string
      if (apiKey) {
        const check = validateApiKey(apiKey)
        if (!check.valid) return json({ error: check.message }, 400)

        // MERGE: keep any other stored credentials (e.g. webhookSecret) intact.
        const existingCreds: Record<string, unknown> =
          existing?.encrypted_credentials
            ? (decryptCredentials(existing.encrypted_credentials) ?? {})
            : {}
        encrypted = encryptCredentials({ ...existingCreds, apiKey })
      } else if (existing?.encrypted_credentials) {
        // No new key provided → reconnect with the stored key (user doesn't
        // need to paste it again).
        encrypted = existing.encrypted_credentials
      } else {
        return json({ error: "API key requerida" }, 400)
      }

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

      // Single active connector: connecting one disconnects the others.
      // We KEEP their encrypted_credentials so they can reconnect without
      // re-entering the API key.
      const { data: otherConns, error: otherErr } = await supabase
        .from("provider_connections")
        .select("id")
        .eq("tenant_id", profile.tenant_id)
        .neq("provider_type", providerType)
        .not("provider_type", "in", `(${ADDITIVE_PROVIDERS.map((p) => `"${p}"`).join(",")})`)
      if (otherErr) throw otherErr

      if (otherConns && otherConns.length > 0) {
        const otherIds = otherConns.map((c) => c.id)
        const { error: audDelErr } = await supabase
          .from("provider_audiences")
          .delete()
          .in("provider_connection_id", otherIds)
        if (audDelErr) throw audDelErr

        const { error: deactErr } = await supabase
          .from("provider_connections")
          .update({ status: "disconnected" })
          .in("id", otherIds)
        if (deactErr) throw deactErr
      }

      return json({ success: true, provider_type: providerType, status: "connected" })
    }

    // ── disconnect ───────────────────────────────────────────────────────────
    if (action === "disconnect") {
      // Keep credentials on file → user can reconnect later without re-entering key.
      const { error } = await supabase
        .from("provider_connections")
        .update({ status: "disconnected" })
        .eq("tenant_id", profile.tenant_id)
        .eq("provider_type", providerType)
      if (error) throw error

      return json({ success: true, provider_type: providerType, status: "disconnected" })
    }

    // ── update_webhook_secret ─────────────────────────────────────────────
    // Stores a Resend webhook signing secret (whsec_...) in the provider's
    // encrypted_credentials alongside the existing apiKey. This is required for
    // the per-tenant resend-webhook Edge Function to verify incoming events.
    //
    // Clients must:
    //  1. Connect Resend first (to have a row in provider_connections).
    //  2. Register the webhook in Resend dashboard (URL: resend-webhook?t=<tenant_id>).
    //  3. Copy the signing secret and call this action to persist it.
    if (action === "update_webhook_secret") {
      const webhookSecret =
        typeof body.webhook_secret === "string" ? body.webhook_secret.trim() : ""

      if (!webhookSecret) {
        return json({ error: "webhook_secret requerido" }, 400)
      }
      if (!webhookSecret.startsWith("whsec_")) {
        return json(
          { error: "Formato inválido. El signing secret debe comenzar con whsec_" },
          400,
        )
      }

      const { data: conn, error: connErr } = await supabase
        .from("provider_connections")
        .select("encrypted_credentials")
        .eq("tenant_id", profile.tenant_id)
        .eq("provider_type", providerType)
        .maybeSingle()
      if (connErr) throw connErr
      if (!conn) {
        return json(
          { error: `Conecta ${providerType} primero antes de configurar el webhook` },
          400,
        )
      }

      // MERGE: preserve apiKey (and any other fields) already stored.
      const existingCreds: Record<string, unknown> =
        conn.encrypted_credentials
          ? (decryptCredentials(conn.encrypted_credentials) ?? {})
          : {}

      const updated = encryptCredentials({ ...existingCreds, webhookSecret })

      const { error: updateErr } = await supabase
        .from("provider_connections")
        .update({ encrypted_credentials: updated })
        .eq("tenant_id", profile.tenant_id)
        .eq("provider_type", providerType)
      if (updateErr) throw updateErr

      return json({ success: true, provider_type: providerType, webhook_configured: true })
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

      const creds = decryptCredentials(conn.encrypted_credentials)

      if (providerType === "twilio") {
        const sid = typeof creds?.accountSid === "string" ? creds.accountSid : ""
        const tok = typeof creds?.authToken === "string" ? creds.authToken : ""
        const check = await new TwilioConnector({ accountSid: sid, authToken: tok }).validateCredentials()
        return json({
          success: check.valid,
          provider_type: providerType,
          message: check.valid ? "Conexión válida" : (check.message ?? "Credenciales inválidas"),
        })
      }

      if (providerType === "whatsapp") {
        const accessToken   = typeof creds?.accessToken   === "string" ? creds.accessToken   : ""
        const phoneNumberId = typeof creds?.phoneNumberId === "string" ? creds.phoneNumberId : ""
        const check = await new WhatsAppCloudConnector({ accessToken, phoneNumberId }).validateCredentials()
        return json({
          success: check.valid,
          provider_type: providerType,
          message: check.valid ? "Conexión válida" : (check.message ?? "Credenciales inválidas"),
        })
      }

      const check = validateApiKey(creds?.apiKey)

      return json({
        success: check.valid,
        provider_type: providerType,
        message: check.valid ? "Conexión válida" : "Credenciales inválidas",
        webhook_configured: typeof creds?.webhookSecret === "string" && (creds.webhookSecret as string).length > 0,
      })
    }

    // ── get_connection_status ─────────────────────────────────────────────
    // Returns lightweight metadata (no credentials) for the provider card UI.
    // Includes whether webhookSecret is configured (needed for Resend stats badge).
    if (action === "get_connection_status") {
      const { data: conn, error } = await supabase
        .from("provider_connections")
        .select("status, last_sync_at, encrypted_credentials")
        .eq("tenant_id", profile.tenant_id)
        .eq("provider_type", providerType)
        .maybeSingle()
      if (error) throw error
      if (!conn) return json({ connected: false })

      const creds = decryptCredentials(conn.encrypted_credentials)

      if (providerType === "twilio") {
        return json({
          connected: conn.status === "connected",
          status: conn.status,
          last_sync_at: conn.last_sync_at,
          has_api_key: typeof creds?.accountSid === "string" && (creds.accountSid as string).length > 0,
          whatsapp_from: typeof creds?.whatsappFrom === "string" ? creds.whatsappFrom : "",
          sms_from: typeof creds?.smsFrom === "string" ? creds.smsFrom : "",
        })
      }

      if (providerType === "whatsapp") {
        return json({
          connected: conn.status === "connected",
          status: conn.status,
          last_sync_at: conn.last_sync_at,
          has_api_key: typeof creds?.accessToken === "string" && (creds.accessToken as string).length > 0,
          phone_number_id: typeof creds?.phoneNumberId === "string" ? creds.phoneNumberId : "",
          waba_id: typeof creds?.wabaId === "string" ? creds.wabaId : "",
          template_name: typeof creds?.templateName === "string" ? creds.templateName : "",
          template_language: typeof creds?.templateLanguage === "string" ? creds.templateLanguage : "es",
        })
      }


      return json({
        connected: conn.status === "connected",
        status: conn.status,
        last_sync_at: conn.last_sync_at,
        has_api_key: typeof creds?.apiKey === "string" && (creds.apiKey as string).length > 0,
        webhook_configured: typeof creds?.webhookSecret === "string" && (creds.webhookSecret as string).length > 0,
      })
    }

    // ── sync_audiences ─────────────────────────────────────────────────────────
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

      // ── Twilio / WhatsApp: "audiencias" = contact_lists locales con teléfono ─
      if (providerType === "twilio" || providerType === "whatsapp") {
        const now = new Date().toISOString()

        const { data: lists, error: listsErr } = await supabase
          .from("contact_lists")
          .select("id, name")
          .eq("tenant_id", profile.tenant_id)
        if (listsErr) throw listsErr

        const rows: Array<{
          tenant_id: string
          provider_connection_id: string
          external_id: string
          name: string
          audience_type: string
          contacts_count: number
          last_sync_at: string
        }> = []

        for (const list of lists ?? []) {
          const { count, error: countErr } = await supabase
            .from("contacts")
            .select("id", { count: "exact", head: true })
            .eq("tenant_id", profile.tenant_id)
            .eq("list_id", list.id)
            .eq("status", "active")
            .not("phone", "is", null)
            .neq("phone", "")
          if (countErr) throw countErr

          if ((count ?? 0) > 0) {
            rows.push({
              tenant_id: profile.tenant_id,
              provider_connection_id: conn.id,
              external_id: list.id,
              name: list.name,
              audience_type: "list",
              contacts_count: count ?? 0,
              last_sync_at: now,
            })
          }
        }

        if (rows.length > 0) {
          const { error: upsertErr } = await supabase
            .from("provider_audiences")
            .upsert(rows, { onConflict: "provider_connection_id,external_id" })
          if (upsertErr) throw upsertErr
        }

        const keepIds = rows.map((r) => r.external_id)
        let staleQuery = supabase
          .from("provider_audiences")
          .delete()
          .eq("provider_connection_id", conn.id)
        if (keepIds.length > 0) {
          staleQuery = staleQuery.not("external_id", "in", `(${keepIds.map((id) => `"${id}"`).join(",")})`)
        }
        const { error: delErr } = await staleQuery
        if (delErr) throw delErr

        await supabase
          .from("provider_connections")
          .update({ status: "connected", last_sync_at: now })
          .eq("id", conn.id)

        return json({
          success: true,
          provider_type: providerType,
          synced_count: rows.length,
          last_sync_at: now,
        })
      }

      const apiKey = typeof creds?.apiKey === "string" ? creds.apiKey : ""
      if (!apiKey) return json({ error: "Credenciales no disponibles" }, 400)

      if (providerType !== "mailerlite" && providerType !== "resend") {
        return json({ error: "Sincronización no disponible para este proveedor todavía" }, 400)
      }

      const connector = providerType === "resend"
        ? new ResendConnector(apiKey)
        : new MailerLiteConnector(apiKey)

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
    console.error("manage-provider-connection error:", err instanceof Error ? err.message : "unknown")
    return json({ error: err instanceof Error ? err.message : String(err) }, 500)
  }
})
