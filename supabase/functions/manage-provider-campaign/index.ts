import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

import { decryptCredentials } from "./encryption.ts"
import {
  MailerLiteCampaignProvider,
  type CampaignAudience,
  type CampaignProviderResult,
  type CampaignReportsResult,
  type DraftCampaignInput,
} from "./MailerLiteCampaignProvider.ts"
import { ResendCampaignProvider } from "./ResendCampaignProvider.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
}
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })

const EXPERIENCE_BASE_URL = "https://enterprise.musicdibs.com"
const AI_STUDIO = "Powered by AI Music Studio"

type AudienceType = "list" | "segment" | "automation"
type CampaignProviderType = "mailerlite" | "resend"

const PROVIDER_LABEL: Record<CampaignProviderType, string> = {
  mailerlite: "MailerLite",
  resend: "Resend",
}

/**
 * Provider-specific merge tags for personalization at send time.
 * - MailerLite v2 uses {$name} and {$unsubscribe}.
 * - Resend uses {{{FIRST_NAME|fallback}}} and {{{RESEND_UNSUBSCRIBE_URL}}}.
 */
const MERGE_TAGS: Record<CampaignProviderType, { name: string; unsubscribe: string }> = {
  mailerlite: { name: "{$name}", unsubscribe: "{$unsubscribe}" },
  resend: { name: "{{{FIRST_NAME|}}}", unsubscribe: "{{{RESEND_UNSUBSCRIBE_URL}}}" },
}

interface CampaignProvider {
  createDraftCampaign(input: DraftCampaignInput): Promise<CampaignProviderResult>
  updateDraftCampaign(id: string, input: DraftCampaignInput): Promise<CampaignProviderResult>
  getCampaignStatus(id: string): Promise<CampaignProviderResult>
  scheduleCampaign(id: string): Promise<CampaignProviderResult>
  getCampaignReports(id: string): Promise<CampaignReportsResult>
}

function makeProvider(type: CampaignProviderType, key: string): CampaignProvider {
  return type === "resend"
    ? new ResendCampaignProvider(key)
    : new MailerLiteCampaignProvider(key)
}

interface ExperienceBranding {
  logo_url?: string | null
  primary_color?: string | null
  cta_text?: string | null
  cta_url?: string | null
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

/**
 * Build the email HTML.
 *
 * - Greeting uses the provider's name merge tag, personalised at send time.
 * - emailBody is configured in Campaign Builder → Step Email
 *   (campaign_generation_configs). Falls back to generic copy when null.
 * - emailSubject is only used for the <title> tag; the real subject is set on
 *   the campaign object.
 */
function buildHtml(opts: {
  title: string
  playUrl: string
  coverUrl: string | null
  branding: ExperienceBranding
  emailBody: string | null
  emailSubject: string | null
  nameTag: string
  unsubscribeTag: string
}): string {
  const { title, playUrl, coverUrl, branding, emailBody, nameTag, unsubscribeTag } = opts
  const accent = branding.primary_color || "#C9973A"
  const ctaText = branding.cta_text || "Escuchar la canción"
  const safeTitle = escapeHtml(title)
  const safeBody = escapeHtml(
    emailBody?.trim() ||
      "Hemos preparado esta experiencia musical especialmente para ti. Esperamos que la disfrutes.",
  )
  const cover = coverUrl
    ? `<tr><td style="padding:0 0 24px;"><a href="${playUrl}"><img src="${coverUrl}" alt="${safeTitle}" width="560" style="display:block;width:100%;max-width:560px;border-radius:16px;" /></a></td></tr>`
    : ""
  const logo = branding.logo_url
    ? `<tr><td align="center" style="padding:0 0 24px;"><img src="${branding.logo_url}" alt="logo" height="40" style="display:block;height:40px;" /></td></tr>`
    : ""
  return `<!doctype html><html><head><meta charset="utf-8"><title>${safeTitle}</title></head>
<body style="margin:0;padding:0;background:#f6f6f8;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f6f8;padding:32px 0;">
<tr><td align="center">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:20px;padding:32px;font-family:Arial,Helvetica,sans-serif;color:#111827;">
${logo}
${cover}
<tr><td style="font-size:22px;font-weight:bold;padding:0 0 16px;">${safeTitle}</td></tr>
<tr><td style="font-size:15px;line-height:1.6;color:#374151;padding:0 0 4px;">Hola ${nameTag},</td></tr>
<tr><td style="font-size:15px;line-height:1.6;color:#374151;padding:0 0 24px;">${safeBody}</td></tr>
<tr><td style="padding:0 0 28px;"><a href="${playUrl}" style="display:inline-block;background:${accent};color:#ffffff;text-decoration:none;font-weight:bold;font-size:15px;padding:14px 28px;border-radius:999px;">${escapeHtml(ctaText)}</a></td></tr>
<tr><td style="font-size:12px;color:#9ca3af;border-top:1px solid #e5e7eb;padding:16px 0 0;">${AI_STUDIO} · <a href="${unsubscribeTag}" style="color:#9ca3af;">Darse de baja</a></td></tr>
</table>
</td></tr>
</table>
</body></html>`
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

    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""))
    if (authErr || !user) return json({ error: "Unauthorized" }, 401)

    const { data: profile } = await supabase
      .from("profiles")
      .select("tenant_id")
      .eq("id", user.id)
      .single()
    if (!profile?.tenant_id) return json({ error: "Profile not found" }, 404)

    const tenantId = profile.tenant_id as string
    const body = await req.json().catch(() => ({}))
    const action = body.action as string | undefined

    // ── Shared helpers ────────────────────────────────────────────────────────

    /** Resolve a specific provider's API key (must be currently connected). */
    async function getProviderKey(
      providerType: CampaignProviderType,
    ): Promise<{ key: string } | { error: string; status: number }> {
      const { data: conn } = await supabase
        .from("provider_connections")
        .select("encrypted_credentials, status")
        .eq("tenant_id", tenantId)
        .eq("provider_type", providerType)
        .maybeSingle()
      if (!conn || conn.status !== "connected") {
        return { error: `${PROVIDER_LABEL[providerType]} no está conectado.`, status: 400 }
      }
      const creds = decryptCredentials(conn.encrypted_credentials)
      const key = typeof creds?.apiKey === "string" ? creds.apiKey : ""
      if (!key) return { error: "Credenciales no disponibles.", status: 400 }
      return { key }
    }

    /** Resolve the single currently-connected campaign provider. */
    async function getActiveProvider(): Promise<
      { providerType: CampaignProviderType; key: string } | { error: string; status: number }
    > {
      const { data: conns } = await supabase
        .from("provider_connections")
        .select("provider_type, encrypted_credentials, status")
        .eq("tenant_id", tenantId)
        .eq("status", "connected")
      const conn = (conns ?? []).find(
        (c) => c.provider_type === "mailerlite" || c.provider_type === "resend",
      )
      if (!conn) {
        return {
          error: "No hay ningún proveedor de envío conectado. Conecta MailerLite o Resend en Ajustes → Proveedores.",
          status: 400,
        }
      }
      const creds = decryptCredentials(conn.encrypted_credentials)
      const key = typeof creds?.apiKey === "string" ? creds.apiKey : ""
      if (!key) return { error: "Credenciales no disponibles.", status: 400 }
      return { providerType: conn.provider_type as CampaignProviderType, key }
    }

    /**
     * Resolve the existing provider_campaign row for an experience page and the
     * API key of the provider it belongs to.
     */
    async function resolveProviderCampaign(experiencePageId: string) {
      const { data: pc } = await supabase
        .from("provider_campaigns")
        .select("id, provider_type, provider_campaign_id, provider_campaign_name, provider_campaign_status")
        .eq("experience_page_id", experiencePageId)
        .eq("tenant_id", tenantId)
        .maybeSingle()
      if (!pc) {
        return { error: "No se encontró campaña para esta experiencia. Crea el borrador primero.", status: 404 }
      }
      const providerType = (pc.provider_type as CampaignProviderType) ?? "mailerlite"
      const keyRes = await getProviderKey(providerType)
      if ("error" in keyRes) return keyRes
      return { pc, providerType, key: keyRes.key }
    }

    /**
     * Fetch email_subject + email_body from campaign_generation_configs
     * given a campaign_id (linked from experience_pages).
     */
    async function fetchEmailConfig(campaignId: string) {
      const { data: cfg } = await supabase
        .from("campaign_generation_configs")
        .select("email_subject, email_body")
        .eq("campaign_id", campaignId)
        .maybeSingle()
      return {
        emailSubject: cfg?.email_subject ?? null,
        emailBody: cfg?.email_body ?? null,
      }
    }

    // ── create_draft ──────────────────────────────────────────────────────────
    if (action === "create_draft") {
      const experiencePageId = body.experience_page_id as string | undefined
      const audienceExternalId = body.audience_external_id as string | undefined
      const audienceType = body.audience_type as AudienceType | undefined
      const audienceName = (body.audience_name as string | undefined) ?? ""

      if (!experiencePageId) return json({ error: "experience_page_id requerido" }, 400)
      if (!audienceExternalId || !audienceType) {
        return json({ error: "Selecciona una audiencia." }, 400)
      }
      if (audienceType === "automation") {
        return json(
          { error: "Las automatizaciones no son compatibles como destino de campaña. Elige una lista o un segmento." },
          400,
        )
      }

      // Resolve the active provider (MailerLite or Resend).
      const activeRes = await getActiveProvider()
      if ("error" in activeRes) return json({ error: activeRes.error }, activeRes.status)
      const { providerType, key } = activeRes

      // Sender configuration (required).
      const { data: settings } = await supabase
        .from("tenant_settings")
        .select("sender_name, sender_email, reply_to_email")
        .eq("tenant_id", tenantId)
        .maybeSingle()
      const senderName = settings?.sender_name?.trim() ?? ""
      const senderEmail = settings?.sender_email?.trim() ?? ""
      if (!senderName || !senderEmail) {
        return json(
          { error: "Configura el remitente antes de crear la campaña.", code: "sender_missing" },
          400,
        )
      }

      // Experience page must be published and belong to tenant.
      const { data: exp } = await supabase
        .from("experience_pages")
        .select("id, tenant_id, campaign_id, title, status, experience_token, branding, audio_asset_id, cover_asset_id")
        .eq("id", experiencePageId)
        .eq("tenant_id", tenantId)
        .maybeSingle()
      if (!exp) return json({ error: "Experiencia no encontrada." }, 404)
      if (exp.status !== "published") {
        return json({ error: "Publica la experiencia antes de crear la campaña." }, 400)
      }

      // Cover image (best-effort).
      let coverUrl: string | null = null
      if (exp.cover_asset_id) {
        const { data: cover } = await supabase
          .from("generation_assets")
          .select("public_url")
          .eq("id", exp.cover_asset_id)
          .maybeSingle()
        coverUrl = cover?.public_url ?? null
      }
      if (!coverUrl && exp.audio_asset_id) {
        const { data: audio } = await supabase
          .from("generation_assets")
          .select("metadata")
          .eq("id", exp.audio_asset_id)
          .maybeSingle()
        const coverPath = (audio?.metadata as Record<string, unknown> | null)?.["cover_path"]
        if (typeof coverPath === "string") {
          coverUrl = `${Deno.env.get("SUPABASE_URL")}/storage/v1/object/public/campaign-audio/${coverPath}`
        }
      }

      // Email content from campaign_generation_configs.
      const { emailSubject, emailBody } = await fetchEmailConfig(exp.campaign_id)

      const playUrl = `${EXPERIENCE_BASE_URL}/play/${exp.experience_token}`
      const branding = (exp.branding as ExperienceBranding | null) ?? {}
      const tags = MERGE_TAGS[providerType]
      const html = buildHtml({
        title: exp.title,
        playUrl,
        coverUrl,
        branding,
        emailBody,
        emailSubject,
        nameTag: tags.name,
        unsubscribeTag: tags.unsubscribe,
      })

      const subject = emailSubject?.trim() || exp.title
      const draft: DraftCampaignInput = {
        name: `${exp.title} — Music Experience`,
        subject,
        fromName: senderName,
        fromEmail: senderEmail,
        replyTo: settings?.reply_to_email?.trim() || null,
        html,
        audience: {
          externalId: audienceExternalId,
          audienceType: audienceType === "segment" ? "segment" : "list",
        } satisfies CampaignAudience,
      }

      const provider = makeProvider(providerType, key)
      const result = await provider.createDraftCampaign(draft)
      if (!result.ok || !result.campaignId) {
        return json({ error: result.error ?? `No se pudo crear el borrador en ${PROVIDER_LABEL[providerType]}.` }, 502)
      }

      const { data: row, error: insErr } = await supabase
        .from("provider_campaigns")
        .insert({
          tenant_id: tenantId,
          experience_page_id: experiencePageId,
          provider_type: providerType,
          provider_campaign_id: result.campaignId,
          provider_campaign_name: result.campaignName || draft.name,
          provider_campaign_status: result.campaignStatus ?? "draft",
        })
        .select("*")
        .single()
      if (insErr) throw insErr

      return json({ success: true, campaign: row, audience_name: audienceName })
    }

    // ── update_draft ──────────────────────────────────────────────────────────
    // Regenerates the email HTML with the latest email_body/subject and
    // pushes the update to the provider. Safe to call multiple times.
    if (action === "update_draft") {
      const experiencePageId = body.experience_page_id as string | undefined
      if (!experiencePageId) return json({ error: "experience_page_id requerido" }, 400)

      const resolved = await resolveProviderCampaign(experiencePageId)
      if ("error" in resolved) return json({ error: resolved.error }, resolved.status)
      const { pc, providerType, key } = resolved

      if (pc.provider_campaign_status === "sent") {
        return json({ error: "No se puede actualizar una campaña ya enviada." }, 422)
      }

      // Re-fetch sender, experience page, cover and email config.
      const [settingsRes, expRes] = await Promise.all([
        supabase.from("tenant_settings").select("sender_name, sender_email, reply_to_email").eq("tenant_id", tenantId).maybeSingle(),
        supabase.from("experience_pages").select("campaign_id, title, experience_token, branding, audio_asset_id, cover_asset_id").eq("id", experiencePageId).maybeSingle(),
      ])

      const settings = settingsRes.data
      const exp = expRes.data
      if (!exp) return json({ error: "Experiencia no encontrada." }, 404)

      const senderName = settings?.sender_name?.trim() ?? ""
      const senderEmail = settings?.sender_email?.trim() ?? ""
      if (!senderName || !senderEmail) {
        return json({ error: "Configura el remitente antes de actualizar.", code: "sender_missing" }, 400)
      }

      let coverUrl: string | null = null
      if (exp.cover_asset_id) {
        const { data: cover } = await supabase.from("generation_assets").select("public_url").eq("id", exp.cover_asset_id).maybeSingle()
        coverUrl = cover?.public_url ?? null
      }

      const { emailSubject, emailBody } = await fetchEmailConfig(exp.campaign_id)

      const playUrl = `${EXPERIENCE_BASE_URL}/play/${exp.experience_token}`
      const branding = (exp.branding as ExperienceBranding | null) ?? {}
      const tags = MERGE_TAGS[providerType]
      const html = buildHtml({
        title: exp.title,
        playUrl,
        coverUrl,
        branding,
        emailBody,
        emailSubject,
        nameTag: tags.name,
        unsubscribeTag: tags.unsubscribe,
      })
      const subject = emailSubject?.trim() || exp.title

      const draft: DraftCampaignInput = {
        name: `${exp.title} — Music Experience`,
        subject,
        fromName: senderName,
        fromEmail: senderEmail,
        replyTo: settings?.reply_to_email?.trim() || null,
        html,
        // Audience is fixed at creation; updateDraftCampaign ignores it.
        audience: { externalId: "", audienceType: "list" },
      }

      const provider = makeProvider(providerType, key)
      const result = await provider.updateDraftCampaign(pc.provider_campaign_id, draft)
      if (!result.ok) {
        return json({ error: result.error ?? `No se pudo actualizar el borrador en ${PROVIDER_LABEL[providerType]}.` }, 502)
      }

      // Touch updated_at so frontend can detect the change.
      await supabase.from("provider_campaigns").update({ updated_at: new Date().toISOString() }).eq("id", pc.id)

      return json({ success: true, message: `Borrador actualizado en ${PROVIDER_LABEL[providerType]}.` })
    }

    // ── send_now ──────────────────────────────────────────────────────────────
    // Sends the draft campaign immediately. Option A: user sends from MEC
    // without opening the provider's dashboard.
    if (action === "send_now") {
      const experiencePageId = body.experience_page_id as string | undefined
      if (!experiencePageId) return json({ error: "experience_page_id requerido" }, 400)

      const resolved = await resolveProviderCampaign(experiencePageId)
      if ("error" in resolved) return json({ error: resolved.error }, resolved.status)
      const { pc, providerType, key } = resolved

      if (pc.provider_campaign_status === "sent") {
        return json({ error: "Esta campaña ya fue enviada." }, 422)
      }

      const provider = makeProvider(providerType, key)
      const sendRes = await provider.scheduleCampaign(pc.provider_campaign_id)
      if (!sendRes.ok) {
        return json({ error: sendRes.error ?? `${PROVIDER_LABEL[providerType]} rechazó el envío.` }, 502)
      }

      const now = new Date().toISOString()

      // Get campaign_id from experience_page for campaigns table update.
      const { data: exp } = await supabase
        .from("experience_pages")
        .select("campaign_id, title")
        .eq("id", experiencePageId)
        .single()

      // Update provider_campaigns status.
      await supabase.from("provider_campaigns")
        .update({ provider_campaign_status: "sent", updated_at: now })
        .eq("id", pc.id)

      // Sync campaign status (best-effort — don't throw if it fails).
      if (exp?.campaign_id) {
        await supabase.from("campaigns")
          .update({ status: "sent", sent_at: now })
          .eq("id", exp.campaign_id)
          .eq("tenant_id", tenantId)

        // Notification.
        await supabase.from("notifications").insert({
          tenant_id: tenantId,
          type: "campaign_sent",
          title: "Campaña enviada",
          body: `"${exp.title}" se está enviando a través de ${PROVIDER_LABEL[providerType]}.`,
          link: `/campaigns/${exp.campaign_id}`,
        }).throwOnError().catch(() => { /* non-critical */ })

        // Webhook (fire-and-forget).
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!
        const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
        fetch(`${supabaseUrl}/functions/v1/webhook-dispatcher`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${serviceKey}` },
          body: JSON.stringify({
            tenant_id: tenantId,
            event: "campaign.sent",
            payload: {
              campaign_id: exp.campaign_id,
              campaign_name: exp.title,
              provider_type: providerType,
              provider_campaign_id: pc.provider_campaign_id,
              sent_at: now,
              source: "mec_send_now",
            },
          }),
        }).catch((e: unknown) => console.warn("[send_now] webhook fire failed:", e))
      }

      return json({ success: true, sent_at: now })
    }

    // ── sync ──────────────────────────────────────────────────────────────────
    // Fetches the provider campaign status (+ stats where supported) and updates
    // the DB. Used by the "Sincronizar stats" button and status polling.
    if (action === "sync") {
      const experiencePageId = body.experience_page_id as string | undefined
      if (!experiencePageId) return json({ error: "experience_page_id requerido" }, 400)

      const resolved = await resolveProviderCampaign(experiencePageId)
      if ("error" in resolved) return json({ error: resolved.error }, resolved.status)
      const { pc, providerType, key } = resolved

      const provider = makeProvider(providerType, key)

      // 1. Get current provider campaign status.
      const statusResult = await provider.getCampaignStatus(pc.provider_campaign_id)
      if (!statusResult.ok) {
        return json({ error: statusResult.error ?? `No se pudo contactar ${PROVIDER_LABEL[providerType]}.` }, 502)
      }

      const remoteStatus = statusResult.campaignStatus ?? "draft"
      const statusChanged = remoteStatus !== pc.provider_campaign_status

      // Persist any status change (catches Option B: user sent from provider).
      if (statusChanged) {
        await supabase.from("provider_campaigns")
          .update({ provider_campaign_status: remoteStatus, updated_at: new Date().toISOString() })
          .eq("id", pc.id)

        if (remoteStatus === "sent" && pc.provider_campaign_status === "draft") {
          const { data: exp } = await supabase
            .from("experience_pages").select("campaign_id, title").eq("id", experiencePageId).single()

          if (exp?.campaign_id) {
            await supabase.from("campaigns")
              .update({ status: "sent", sent_at: new Date().toISOString() })
              .eq("id", exp.campaign_id)
              .eq("tenant_id", tenantId)
          }
        }
      }

      // 2. Fetch stats (only meaningful once sent, and only where supported).
      const statsResult = await provider.getCampaignReports(pc.provider_campaign_id)

      let statsUpserted = false
      if (statsResult.ok && statsResult.stats) {
        const s = statsResult.stats
        const { data: exp } = await supabase
          .from("experience_pages").select("campaign_id").eq("id", experiencePageId).single()

        if (exp?.campaign_id) {
          await supabase.from("campaign_stats").upsert({
            campaign_id: exp.campaign_id,
            tenant_id: tenantId,
            emails_sent: s.sent,
            emails_opened: s.opens,
            emails_clicked: s.clicks,
            unsubscribes: s.unsubscribes,
            cost_actual: s.sent * 0.19,
            updated_at: new Date().toISOString(),
          }, { onConflict: "campaign_id" })
          statsUpserted = true
        }
      }

      return json({
        success: true,
        provider_campaign_status: remoteStatus,
        status_changed: statusChanged,
        stats: statsResult.stats ?? null,
        stats_upserted: statsUpserted,
      })
    }

    // ── sync_status (legacy — kept for backwards compat) ──────────────────────
    if (action === "sync_status") {
      const id = body.provider_campaign_row_id as string | undefined
      if (!id) return json({ error: "provider_campaign_row_id requerido" }, 400)

      const { data: row } = await supabase
        .from("provider_campaigns")
        .select("id, tenant_id, provider_campaign_id, provider_type, experience_page_id")
        .eq("id", id)
        .eq("tenant_id", tenantId)
        .maybeSingle()
      if (!row) return json({ error: "Campaña no encontrada." }, 404)

      const providerType = (row.provider_type as CampaignProviderType) ?? "mailerlite"
      const keyRes = await getProviderKey(providerType)
      if ("error" in keyRes) return json({ error: keyRes.error }, keyRes.status)

      const provider = makeProvider(providerType, keyRes.key)
      const result = await provider.getCampaignStatus(row.provider_campaign_id)
      if (!result.ok) {
        return json({ error: result.error ?? "No se pudo sincronizar el estado." }, 502)
      }

      const { data: updated, error: updErr } = await supabase
        .from("provider_campaigns")
        .update({ provider_campaign_status: result.campaignStatus ?? "draft", provider_campaign_name: result.campaignName || row.provider_campaign_id })
        .eq("id", row.id)
        .select("*")
        .single()
      if (updErr) throw updErr

      return json({ success: true, campaign: updated })
    }

    return json({ error: `Unknown action: ${action}` }, 400)
  } catch (err) {
    console.error("manage-provider-campaign error:", err instanceof Error ? err.message : "unknown")
    return json({ error: err instanceof Error ? err.message : String(err) }, 500)
  }
})
