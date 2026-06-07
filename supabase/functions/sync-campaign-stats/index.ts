import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

interface Stats {
  emailsSent: number
  emailsOpened: number
  emailsClicked: number
  unsubscribes: number
}

async function fetchMailerliteStats(apiKey: string, mlCampaignId: string): Promise<Stats | null> {
  const res = await fetch(`https://connect.mailerlite.com/api/campaigns/${mlCampaignId}/reports`, {
    headers: { "Authorization": `Bearer ${apiKey}`, "Accept": "application/json" },
  })
  if (!res.ok) { console.error(`MailerLite reports ${mlCampaignId}: ${res.status}`); return null }
  const data = await res.json()
  const s = data?.data?.stats ?? {}
  return {
    emailsSent:    s.sent               ?? 0,
    emailsOpened:  s.unique_opens_count  ?? s.opens_count         ?? 0,
    emailsClicked: s.unique_clicks_count ?? s.clicks_count        ?? 0,
    unsubscribes:  s.unsubscribes_count  ?? 0,
  }
}

async function fetchBrevoStats(apiKey: string, brevoCampaignId: string): Promise<Stats | null> {
  const res = await fetch(`https://api.brevo.com/v3/emailCampaigns/${brevoCampaignId}`, {
    headers: { "api-key": apiKey, "Accept": "application/json" },
  })
  if (!res.ok) { console.error(`Brevo campaign ${brevoCampaignId}: ${res.status}`); return null }
  const data = await res.json()
  const s = data?.statistics?.globalStats ?? data?.globalStats ?? {}
  return {
    emailsSent:    s.delivered     ?? s.sent      ?? 0,
    emailsOpened:  s.uniqueViews   ?? s.trackableViews ?? 0,
    emailsClicked: s.uniqueClicks  ?? s.clickers  ?? 0,
    unsubscribes:  s.unsubscriptions ?? 0,
  }
}

/**
 * Minimal inline credential decryption — mirrors manage-provider-campaign/encryption.ts.
 * provider_connections stores credentials as base64-encoded JSON envelope { data: string }.
 */
function decryptProviderCredentials(envelope: unknown): Record<string, unknown> | null {
  try {
    if (!envelope || typeof (envelope as Record<string,unknown>).data !== "string") return null
    const json = decodeURIComponent(escape(atob((envelope as {data:string}).data)))
    return JSON.parse(json)
  } catch {
    return null
  }
}

function jsonRes(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    },
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Handler
// ─────────────────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    })
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    )

    let filterTenantId: string | null = null
    if (req.method === "POST") {
      try { const b = await req.json(); filterTenantId = b?.tenant_id ?? null } catch { /* ok */ }
    }

    let legacySynced = 0, legacyErrors = 0
    let providerSynced = 0, providerErrors = 0
    const results: string[] = []

    // ── Section 1: Legacy flow ────────────────────────────────────────────────
    // campaigns WHERE status='sent' AND mailerlite_campaign_id IS NOT NULL
    // Uses api_keys stored in tenant_settings.api_keys (old format).
    {
      let query = supabase
        .from("campaigns")
        .select("id, tenant_id, total_contacts, mailerlite_campaign_id")
        .eq("status", "sent")
        .not("mailerlite_campaign_id", "is", null)
      if (filterTenantId) query = query.eq("tenant_id", filterTenantId)

      const { data: campaigns, error: campErr } = await query
      if (campErr) throw new Error(`Failed to fetch legacy campaigns: ${campErr.message}`)

      if (campaigns?.length) {
        const tenantIds = [...new Set(campaigns.map((c: {tenant_id: string}) => c.tenant_id))]
        const { data: settingsRows } = await supabase
          .from("tenant_settings")
          .select("tenant_id, api_keys")
          .in("tenant_id", tenantIds)

        type ProviderConfig = { provider: string; apiKey: string }
        const configMap = new Map<string, ProviderConfig>()
        for (const row of settingsRows ?? []) {
          const keys = row.api_keys as Record<string, string> | null
          const provider: string = keys?.mailing_provider ?? "mailerlite"
          const apiKey: string | undefined = provider === "brevo" ? keys?.brevo : keys?.mailerlite
          if (apiKey) configMap.set(row.tenant_id, { provider, apiKey })
        }

        for (const campaign of campaigns) {
          const config = configMap.get(campaign.tenant_id)
          if (!config) { results.push(`[legacy] ${campaign.id}: skipped (no API key)`); continue }

          let stats: Stats | null = null
          try {
            stats = config.provider === "brevo"
              ? await fetchBrevoStats(config.apiKey, campaign.mailerlite_campaign_id)
              : await fetchMailerliteStats(config.apiKey, campaign.mailerlite_campaign_id)
          } catch (e) {
            results.push(`[legacy] ${campaign.id}: fetch error — ${e}`); legacyErrors++; continue
          }

          if (!stats) { results.push(`[legacy] ${campaign.id}: provider returned no stats`); legacyErrors++; continue }

          const { error: upsertErr } = await supabase.from("campaign_stats").upsert({
            campaign_id: campaign.id, tenant_id: campaign.tenant_id,
            emails_sent: stats.emailsSent, emails_opened: stats.emailsOpened,
            emails_clicked: stats.emailsClicked, unsubscribes: stats.unsubscribes,
            cost_actual: stats.emailsSent * 0.19, updated_at: new Date().toISOString(),
          }, { onConflict: "campaign_id" })

          if (upsertErr) {
            results.push(`[legacy] ${campaign.id}: upsert error — ${upsertErr.message}`); legacyErrors++
          } else {
            results.push(`[legacy] ${campaign.id}: ok sent=${stats.emailsSent} opens=${stats.emailsOpened}`)
            legacySynced++
          }
        }
      }
    }

    // ── Section 2: New provider_campaigns flow ────────────────────────────────
    // provider_campaigns WHERE provider_type='mailerlite'
    //   - For draft status: detect if ML has actually sent (Option B: user sent from ML)
    //   - For sent status: fetch ML reports → upsert campaign_stats
    // Uses encrypted_credentials from provider_connections (new format).
    {
      let query = supabase
        .from("provider_campaigns")
        .select("id, tenant_id, experience_page_id, provider_campaign_id, provider_campaign_status")
        .eq("provider_type", "mailerlite")
        .in("provider_campaign_status", ["draft", "sent"])
      if (filterTenantId) query = query.eq("tenant_id", filterTenantId)

      const { data: providerCampaigns, error: pcErr } = await query
      if (pcErr) throw new Error(`Failed to fetch provider_campaigns: ${pcErr.message}`)

      if (providerCampaigns?.length) {
        // Bulk-load provider_connections for all tenants involved.
        const pcTenantIds = [...new Set(providerCampaigns.map((pc: {tenant_id: string}) => pc.tenant_id))]
        const { data: connRows } = await supabase
          .from("provider_connections")
          .select("tenant_id, encrypted_credentials")
          .eq("provider_type", "mailerlite")
          .eq("status", "connected")
          .in("tenant_id", pcTenantIds)

        const apiKeyMap = new Map<string, string>()
        for (const conn of connRows ?? []) {
          const creds = decryptProviderCredentials(conn.encrypted_credentials)
          const key = typeof creds?.apiKey === "string" ? creds.apiKey : ""
          if (key) apiKeyMap.set(conn.tenant_id, key)
        }

        // Load campaign_id for each experience_page (needed for campaign_stats upsert).
        const expPageIds = providerCampaigns.map((pc: {experience_page_id: string}) => pc.experience_page_id)
        const { data: expPages } = await supabase
          .from("experience_pages")
          .select("id, campaign_id")
          .in("id", expPageIds)

        const expPageMap = new Map<string, string>()
        for (const ep of expPages ?? []) expPageMap.set(ep.id, ep.campaign_id)

        for (const pc of providerCampaigns) {
          const apiKey = apiKeyMap.get(pc.tenant_id)
          if (!apiKey) { results.push(`[provider] pc=${pc.id}: skipped (no API key)`); continue }

          // 1. Get current ML campaign status.
          let mlStatus: string = pc.provider_campaign_status
          try {
            const statusRes = await fetch(
              `https://connect.mailerlite.com/api/campaigns/${pc.provider_campaign_id}`,
              { headers: { "Authorization": `Bearer ${apiKey}`, "Accept": "application/json" } },
            )
            if (statusRes.ok) {
              const d = await statusRes.json()
              const raw = String(d?.data?.status ?? "").toLowerCase()
              if (raw === "sent") mlStatus = "sent"
              else if (raw === "ready" || raw === "scheduled") mlStatus = "scheduled"
              else if (raw === "draft") mlStatus = "draft"
            }
          } catch (e) {
            results.push(`[provider] pc=${pc.id}: status fetch error — ${e}`); providerErrors++; continue
          }

          // Persist status change (catches Option B: user sent from ML).
          if (mlStatus !== pc.provider_campaign_status) {
            await supabase.from("provider_campaigns")
              .update({ provider_campaign_status: mlStatus, updated_at: new Date().toISOString() })
              .eq("id", pc.id)

            // If just became sent, update campaigns table too.
            if (mlStatus === "sent") {
              const campaignId = expPageMap.get(pc.experience_page_id)
              if (campaignId) {
                await supabase.from("campaigns")
                  .update({ status: "sent", sent_at: new Date().toISOString() })
                  .eq("id", campaignId)
                  .eq("tenant_id", pc.tenant_id)
              }
            }
          }

          // 2. Sync stats only if sent.
          if (mlStatus !== "sent") {
            results.push(`[provider] pc=${pc.id}: status=${mlStatus} (no stats yet)`)
            continue
          }

          const campaignId = expPageMap.get(pc.experience_page_id)
          if (!campaignId) {
            results.push(`[provider] pc=${pc.id}: no campaign_id for experience_page`)
            continue
          }

          let stats: Stats | null = null
          try {
            stats = await fetchMailerliteStats(apiKey, pc.provider_campaign_id)
          } catch (e) {
            results.push(`[provider] pc=${pc.id}: stats fetch error — ${e}`); providerErrors++; continue
          }

          if (!stats) { results.push(`[provider] pc=${pc.id}: no stats returned`); providerErrors++; continue }

          const { error: upsertErr } = await supabase.from("campaign_stats").upsert({
            campaign_id: campaignId, tenant_id: pc.tenant_id,
            emails_sent: stats.emailsSent, emails_opened: stats.emailsOpened,
            emails_clicked: stats.emailsClicked, unsubscribes: stats.unsubscribes,
            cost_actual: stats.emailsSent * 0.19, updated_at: new Date().toISOString(),
          }, { onConflict: "campaign_id" })

          if (upsertErr) {
            results.push(`[provider] pc=${pc.id}: upsert error — ${upsertErr.message}`); providerErrors++
          } else {
            results.push(`[provider] pc=${pc.id}: ok sent=${stats.emailsSent} opens=${stats.emailsOpened}`)
            providerSynced++
          }
        }
      }
    }

    return jsonRes({
      ok: true,
      legacy: { synced: legacySynced, errors: legacyErrors },
      provider: { synced: providerSynced, errors: providerErrors },
      results,
    })
  } catch (err) {
    console.error("sync-campaign-stats error:", err)
    return jsonRes({ error: err instanceof Error ? err.message : "Internal error" }, 500)
  }
})
