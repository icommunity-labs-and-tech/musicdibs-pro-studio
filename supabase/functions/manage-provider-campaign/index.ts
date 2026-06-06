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

// Public domain that serves the /play/{token} experience pages.
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
 * Minimal, editable HTML body. We deliberately do NOT build an email editor —
 * this is a starting point the customer refines inside MailerLite.
 */
function buildHtml(opts: {
  title: string
  playUrl: string
  coverUrl: string | null
  branding: ExperienceBranding
}): string {
  const { title, playUrl, coverUrl, branding } = opts
  const accent = branding.primary_color || "#6366f1"
  const ctaText = branding.cta_text || "Escuchar la canción"
  const safeTitle = escapeHtml(title)
  const cover = coverUrl
    ? `<tr><td style="padding:0 0 24px;"><a href="${playUrl}"><img src="${coverUrl}" alt="${safeTitle}" width="560" style="display:block;width:100%;max-width:560px;border-radius:16px;" /></a></td></tr>`
    : ""
  const logo = branding.logo_url
    ? `<tr><td align="center" style="padding:0 0 24px;"><img src="${branding.logo_url}" alt="logo" height="40" style="display:block;height:40px;" /></td></tr>`
    : ""
  return `<!doctype html><html><body style="margin:0;padding:0;background:#f6f6f8;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f6f8;padding:32px 0;">
<tr><td align="center">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:20px;padding:32px;font-family:Arial,Helvetica,sans-serif;color:#111827;">
${logo}
${cover}
<tr><td style="font-size:22px;font-weight:bold;padding:0 0 12px;">${safeTitle}</td></tr>
<tr><td style="font-size:15px;line-height:1.6;color:#374151;padding:0 0 24px;">Hemos creado una experiencia musical única para ti. Pulsa el botón para escucharla.</td></tr>
<tr><td style="padding:0 0 28px;"><a href="${playUrl}" style="display:inline-block;background:${accent};color:#ffffff;text-decoration:none;font-weight:bold;font-size:15px;padding:14px 28px;border-radius:999px;">${escapeHtml(ctaText)}</a></td></tr>
<tr><td style="font-size:12px;color:#9ca3af;border-top:1px solid #e5e7eb;padding:16px 0 0;">${AI_STUDIO}</td></tr>
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

    // Resolve the tenant's MailerLite connection + key (server-side only).
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

    // ── create_draft ─────────────────────────────────────────────────────────
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
          {
            error:
              "Las automatizaciones no son compatibles como destino de campaña. Elige una lista o un segmento.",
          },
          400,
        )
      }

      // Sender configuration (tenant level) — required.
      const { data: settings } = await supabase
        .from("tenant_settings")
        .select("sender_name, sender_email, reply_to_email")
        .eq("tenant_id", tenantId)
        .maybeSingle()
      const senderName = settings?.sender_name?.trim() ?? ""
      const senderEmail = settings?.sender_email?.trim() ?? ""
      if (!senderName || !senderEmail) {
        return json(
          {
            error:
              "Please configure your sender settings before publishing to MailerLite.",
            code: "sender_missing",
          },
          400,
        )
      }

      // Experience page must exist, belong to tenant and be published.
      const { data: exp } = await supabase
        .from("experience_pages")
        .select(
          "id, tenant_id, title, status, experience_token, branding, audio_asset_id, cover_asset_id",
        )
        .eq("id", experiencePageId)
        .eq("tenant_id", tenantId)
        .maybeSingle()
      if (!exp) return json({ error: "Experiencia no encontrada." }, 404)
      if (exp.status !== "published") {
        return json(
          { error: "Publica la experiencia antes de crear la campaña." },
          400,
        )
      }

      // Best-effort cover image for the email body.
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
        const coverPath = (audio?.metadata as Record<string, unknown> | null)?.[
          "cover_path"
        ]
        if (typeof coverPath === "string") {
          coverUrl = `${Deno.env.get("SUPABASE_URL")}/storage/v1/object/public/campaign-audio/${coverPath}`
        }
      }

      const keyRes = await getMailerliteKey()
      if ("error" in keyRes) return json({ error: keyRes.error }, keyRes.status)

      const playUrl = `${EXPERIENCE_BASE_URL}/play/${exp.experience_token}`
      const branding = (exp.branding as ExperienceBranding | null) ?? {}
      const html = buildHtml({ title: exp.title, playUrl, coverUrl, branding })

      const draft: DraftCampaignInput = {
        name: `${exp.title} — Music Experience`,
        subject: exp.title,
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
        return json({ error: result.error ?? "Unable to create MailerLite draft campaign." }, 502)
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

    // ── sync_status ──────────────────────────────────────────────────────────
    if (action === "sync_status") {
      const id = body.provider_campaign_row_id as string | undefined
      if (!id) return json({ error: "provider_campaign_row_id requerido" }, 400)

      const { data: row } = await supabase
        .from("provider_campaigns")
        .select("id, tenant_id, provider_campaign_id, provider_type")
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
        .update({
          provider_campaign_status: result.campaignStatus ?? "draft",
          provider_campaign_name: result.campaignName || row.provider_campaign_id,
        })
        .eq("id", row.id)
        .select("*")
        .single()
      if (updErr) throw updErr

      return json({ success: true, campaign: updated })
    }

    return json({ error: "Invalid action" }, 400)
  } catch (err) {
    console.error(
      "manage-provider-campaign error:",
      err instanceof Error ? err.message : "unknown",
    )
    return json({ error: err instanceof Error ? err.message : String(err) }, 500)
  }
})
