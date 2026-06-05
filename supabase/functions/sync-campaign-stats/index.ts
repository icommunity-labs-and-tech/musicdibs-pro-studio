import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

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

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" },
  })
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" } })

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!)

    let filterTenantId: string | null = null
    if (req.method === "POST") {
      try { const b = await req.json(); filterTenantId = b?.tenant_id ?? null } catch { /* ok */ }
    }

    let query = supabase.from("campaigns").select("id, tenant_id, total_contacts, mailerlite_campaign_id").eq("status", "sent").not("mailerlite_campaign_id", "is", null)
    if (filterTenantId) query = query.eq("tenant_id", filterTenantId)

    const { data: campaigns, error: campErr } = await query
    if (campErr) throw new Error(`Failed to fetch campaigns: ${campErr.message}`)
    if (!campaigns?.length) return json({ ok: true, synced: 0, message: "No sent campaigns with external id" })

    const tenantIds = [...new Set(campaigns.map(c => c.tenant_id))]
    const { data: settingsRows } = await supabase.from("tenant_settings").select("tenant_id, api_keys").in("tenant_id", tenantIds)

    type ProviderConfig = { provider: string; apiKey: string }
    const configMap = new Map<string, ProviderConfig>()
    for (const row of settingsRows ?? []) {
      const keys = row.api_keys as any
      const provider: string = keys?.mailing_provider ?? "mailerlite"
      const apiKey: string | undefined = provider === "brevo" ? keys?.brevo : keys?.mailerlite
      if (apiKey) configMap.set(row.tenant_id, { provider, apiKey })
    }

    let synced = 0, errors = 0
    const results: string[] = []

    for (const campaign of campaigns) {
      const config = configMap.get(campaign.tenant_id)
      if (!config) { results.push(`${campaign.id}: skipped (no API key)`); continue }

      let stats: Stats | null = null
      try {
        stats = config.provider === "brevo"
          ? await fetchBrevoStats(config.apiKey, campaign.mailerlite_campaign_id)
          : await fetchMailerliteStats(config.apiKey, campaign.mailerlite_campaign_id)
      } catch (e) { results.push(`${campaign.id}: fetch error — ${e}`); errors++; continue }

      if (!stats) { results.push(`${campaign.id}: provider returned no stats`); errors++; continue }

      const { error: upsertErr } = await supabase.from("campaign_stats").upsert({
        campaign_id: campaign.id, tenant_id: campaign.tenant_id,
        emails_sent: stats.emailsSent, emails_opened: stats.emailsOpened,
        emails_clicked: stats.emailsClicked, unsubscribes: stats.unsubscribes,
        cost_actual: stats.emailsSent * 0.19, updated_at: new Date().toISOString(),
      }, { onConflict: "campaign_id" })

      if (upsertErr) { results.push(`${campaign.id}: upsert error — ${upsertErr.message}`); errors++ }
      else { results.push(`${campaign.id}: ok sent=${stats.emailsSent} opens=${stats.emailsOpened}`); synced++ }
    }

    return json({ ok: true, synced, errors, results }, 200)
  } catch (err) {
    console.error("sync-campaign-stats error:", err)
    return json({ error: err instanceof Error ? err.message : "Internal error" }, 500)
  }
})
