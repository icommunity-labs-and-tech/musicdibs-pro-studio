import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

import { decryptCredentials } from "./encryption.ts"
import {
  MailerLiteCampaignProvider,
  type CampaignAudience,
  type DraftCampaignInput,
} from "./MailerLiteCampaignProvider.ts"

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
 * Build the MailerLite email HTML.
 *
 * - Greeting uses {$name}, the MailerLite v2 merge tag for subscriber name.
 *   This personalises at send time both for Option A (Send Now from MEC)
 *   and Option B (user edits draft in ML then sends from there).
 * - emailBody is configured in Campaign Builder → Step Email (campaign_generation_configs).
 *   Falls back to generic copy when null.
 * - emailSubject is only used for the <title> tag; the real subject is set on
 *   the ML campaign object via DraftCampaignInput.subject.
 */
function buildHtml(opts: {
  title: string
  playUrl: string
  coverUrl: string | null
  branding: ExperienceBranding
  emailBody: string | null
  emailSubject: string | null
}): string {
  const { title, playUrl, coverUrl, branding, emailBody } = opts
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
<tr><td style="font-size:15px;line-height:1.6;color:#374151;padding:0 0 4px;">Hola {$name},</td></tr>
<tr><td style="font-size:15px;line-height:1.6;color:#374151;padding:0 0 24px;">${safeBody}</td></tr>
<tr><td style="padding:0 0 28px;"><a href="${playUrl}" style="display:inline-block;background:${accent};color:#ffffff;text-decoration:none;font-weight:bold;font-size:15px;padding:14px 28px;border-radius:999px;">${escapeHtml(ctaText)}</a></td></tr>
<tr><td style="font-size:12px;color:#9ca3af;border-top:1px solid #e5e7eb;padding:16px 0 0;">${AI_STUDIO} · <a href="{$unsubscribe}" style="color:#9ca3af;">Darse de baja</a></td></tr>
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

    /** Resolve the tenant's MailerLite API key from provider_connections. */
    async function getMailerliteKey(): Promise<
      { key: string } | { error: string; status: number }
    > {
      const { data: conn } = await supabase
        .from("provider_connections")
        .select("encrypted_credentials, status")
        .eq("tenant_id", tenantId)
        .eq("provider_type", "mailerlite")
        .maybeSingle()
      if (!conn || conn.status !== "connected") {
        return { error: "MailerLite no está conectado.", status: 400 }
      }
      const creds = decryptCredentials(conn.encrypted_credentials)
      const key = typeof creds?.apiKey === "string" ? creds.apiKey : ""
      if (!key) return { error: "Credenciales no disponibles.", status: 400 }
      return { key }
    }

    /**
     * Resolve the existing provider_campaign row for an experience page.
     * Returns error object or { pc, keyRes }.
     */
    async function resolveProviderCampaign(experiencePageId: string) {
      const { data: pc } = await supabase
        .from("provider_campaigns")
        .select("id, provider_campaign_id, provider_campaign_name, provider_campaign_status")
        .eq("experience_page_id", experiencePageId)
        .eq("tenant_id", tenantId)
        .maybeSingle()
      if (!pc) {
        return { error: "No se encontró campaña en MailerLite para esta experiencia. Crea el draft primero.", status: 404 }
      }
      const keyRes = await getMailerliteKey()
      if ("error" in keyRes) return keyRes
      return { pc, key: keyRes.key }
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
          { error: "Configura el remitente antes de publicar en MailerLite.", code: "sender_missing" },
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

      const keyRes = await getMailerliteKey()
      if ("error" in keyRes) return json({ error: keyRes.error }, keyRes.status)

      const playUrl = `${EXPERIENCE_BASE_URL}/play/${exp.experience_token}`
      const branding = (exp.branding as ExperienceBranding | null) ?? {}
      const html = buildHtml({ title: exp.title, playUrl, coverUrl, branding, emailBody, emailSubject })

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

      const provider = new MailerLiteCampaignProvider(keyRes.key)
      const result = await provider.createDraftCampaign(draft)
      if (!result.ok || !result.campaignId) {
        return json({ error: result.error ?? "No se pudo crear el draft en MailerLite." }, 502)
      }

      const { data: row, error: insErr } = await supabase
        .from("provider_campaigns")
        .insert({
          tenant_id: tenantId,
          experience_page_id: experiencePageId,
          provider_type: "mailerlite",
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
    // pushes the update to MailerLite. Safe to call multiple times.
    if (action === "update_draft") {
      const experiencePageId = body.experience_page_id as string | undefined
      if (!experiencePageId) return json({ error: "experience_page_id requerido" }, 400)

      const resolved = await resolveProviderCampaign(experiencePageId)
      if ("error" in resolved) return json({ error: resolved.error }, resolved.status)
      const { pc, key } = resolved

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
      const html = buildHtml({ title: exp.title, playUrl, coverUrl, branding, emailBody, emailSubject })
      const subject = emailSubject?.trim() || exp.title

      // We don't re-set audience on update — keep whatever was set at creation.
      // ML PUT /campaigns/{id} accepts partial updates; we send emails[] only.
      const mlRes = await fetch(`https://connect.mailerlite.com/api/campaigns/${pc.provider_campaign_id}`, {
        method: "PUT",
        headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify({
          name: `${exp.title} — Music Experience`,
          emails: [{
            subject,
            from_name: senderName,
            from: senderEmail,
            reply_to: settings?.reply_to_email?.trim() || undefined,
            content: html,
          }],
        }),
      })

      if (!mlRes.ok) {
        const errText = await mlRes.text().catch(() => "")
        console.error("update_draft ML error:", mlRes.status, errText)
        // Graceful degradation: if content is rejected (plan limitation), retry without it.
        if (mlRes.status === 422) {
          const retryRes = await fetch(`https://connect.mailerlite.com/api/campaigns/${pc.provider_campaign_id}`, {
            method: "PUT",
            headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json", "Accept": "application/json" },
            body: JSON.stringify({
              name: `${exp.title} — Music Experience`,
              emails: [{ subject, from_name: senderName, from: senderEmail }],
            }),
          })
          if (!retryRes.ok) {
            return json({ error: `MailerLite rechazó la actualización (${retryRes.status}).` }, 502)
          }
        } else {
          return json({ error: `MailerLite respondió con error ${mlRes.status}.` }, 502)
        }
      }

      // Touch updated_at so frontend can detect the change.
      await supabase.from("provider_campaigns").update({ updated_at: new Date().toISOString() }).eq("id", pc.id)

      return json({ success: true, message: "Draft actualizado en MailerLite." })
    }

    // ── send_now ──────────────────────────────────────────────────────────────
    // Schedules the MailerLite draft campaign for immediate delivery.
    // Option A: user sends from MEC without opening MailerLite.
    if (action === "send_now") {
      const experiencePageId = body.experience_page_id as string | undefined
      if (!experiencePageId) return json({ error: "experience_page_id requerido" }, 400)

      const resolved = await resolveProviderCampaign(experiencePageId)
      if ("error" in resolved) return json({ error: resolved.error }, resolved.status)
      const { pc, key } = resolved

      if (pc.provider_campaign_status === "sent") {
        return json({ error: "Esta campaña ya fue enviada." }, 422)
      }

      // Call MailerLite schedule API.
      const scheduleRes = await fetch(
        `https://connect.mailerlite.com/api/campaigns/${pc.provider_campaign_id}/schedule`,
        {
          method: "POST",
          headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json", "Accept": "application/json" },
          body: JSON.stringify({ delivery: "instant" }),
        },
      )

      if (!scheduleRes.ok) {
        const errText = await scheduleRes.text().catch(() => "")
        console.error("send_now ML schedule error:", scheduleRes.status, errText)
        const mlErrMap: Record<number, string> = {
          401: "La API key de MailerLite no es válida.",
          403: "No tienes permisos para enviar esta campaña en MailerLite.",
          404: "La campaña no existe en MailerLite. Puede que haya sido eliminada.",
          422: "MailerLite rechazó el envío. Verifica que el remitente esté verificado y la audiencia tenga suscriptores.",
          429: "MailerLite está limitando las peticiones. Inténtalo en unos minutos.",
        }
        return json({ error: mlErrMap[scheduleRes.status] ?? `MailerLite respondió con error ${scheduleRes.status}.` }, 502)
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
          body: `"${exp.title}" se está enviando a través de MailerLite.`,
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
              mailerlite_campaign_id: pc.provider_campaign_id,
              sent_at: now,
              source: "mec_send_now",
            },
          }),
        }).catch((e: unknown) => console.warn("[send_now] webhook fire failed:", e))
      }

      return json({ success: true, sent_at: now })
    }

    // ── sync ──────────────────────────────────────────────────────────────────
    // Fetches ML campaign status + stats and updates the DB.
    // Used by: "Sincronizar stats" button (Option A) and
    //          polling to detect ML-side sends (Option B).
    if (action === "sync") {
      const experiencePageId = body.experience_page_id as string | undefined
      if (!experiencePageId) return json({ error: "experience_page_id requerido" }, 400)

      const resolved = await resolveProviderCampaign(experiencePageId)
      if ("error" in resolved) return json({ error: resolved.error }, resolved.status)
      const { pc, key } = resolved

      const provider = new MailerLiteCampaignProvider(key)

      // 1. Get current ML campaign status.
      const statusResult = await provider.getCampaignStatus(pc.provider_campaign_id)
      if (!statusResult.ok) {
        return json({ error: statusResult.error ?? "No se pudo contactar MailerLite." }, 502)
      }

      const mlStatus = statusResult.campaignStatus ?? "draft"
      const statusChanged = mlStatus !== pc.provider_campaign_status

      // Persist any status change (catches Option B: user sent from ML).
      if (statusChanged) {
        await supabase.from("provider_campaigns")
          .update({ provider_campaign_status: mlStatus, updated_at: new Date().toISOString() })
          .eq("id", pc.id)

        // If ML reports sent and campaign was previously draft, update campaigns table.
        if (mlStatus === "sent" && pc.provider_campaign_status === "draft") {
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

      // 2. Fetch stats (only meaningful once sent).
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
        provider_campaign_status: mlStatus,
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

      const keyRes = await getMailerliteKey()
      if ("error" in keyRes) return json({ error: keyRes.error }, keyRes.status)

      const provider = new MailerLiteCampaignProvider(keyRes.key)
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
