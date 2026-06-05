import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } })
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 })
  try {
    const webhookSecret = Deno.env.get("MAILERLITE_WEBHOOK_SECRET")
    if (webhookSecret) {
      const sig = req.headers.get("X-MailerLite-Signature") ?? new URL(req.url).searchParams.get("secret")
      if (sig !== webhookSecret) return new Response("Unauthorized", { status: 401 })
    }

    const payload = await req.json()
    const eventType: string = payload.type ?? ""
    const data = payload.data ?? {}
    const mlCampaignId: string | undefined = data.campaign_id

    if (!mlCampaignId) return json({ ok: true, ignored: true, reason: "no campaign_id" })

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!)
    const { data: campaign } = await supabase.from("campaigns").select("id, tenant_id").eq("mailerlite_campaign_id", mlCampaignId).single()
    if (!campaign) return json({ ok: true, ignored: true, reason: "campaign not found" })

    if (eventType === "subscriber.unsubscribed" || eventType === "subscriber.spam_reported") {
      await supabase.rpc("increment_campaign_stat", { p_campaign_id: campaign.id, p_tenant_id: campaign.tenant_id, p_field: "unsubscribes" })
    }

    return json({ ok: true, event: eventType, campaign_id: campaign.id })
  } catch (err) {
    console.error("mailerlite-webhook error:", err)
    return json({ error: err instanceof Error ? err.message : "Internal error" }, 500)
  }
})
