import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

// ============================================================================
// resend-webhook — Resend broadcast event receiver
//
// Captures broadcast metrics that Resend does NOT expose via polling API:
//   broadcast.sent     → marks campaign sent, sets emails_sent count
//   email.opened       → increments unique opens (deduped per email)
//   email.clicked      → increments unique clicks (deduped per email)
//   email.unsubscribed → increments unsubscribes
//   email.bounced      → logged only (dedup table, no counter yet)
//
// Deduplication (two layers):
//   1. svix_id UNIQUE  — handles Resend delivery retries (exact-once)
//   2. (email_id, event_type) UNIQUE INDEX — handles repeat opens/clicks
//      from the same recipient (only first open/click counts)
//
// Signature: Svix HMAC-SHA256, secret = RESEND_WEBHOOK_SECRET env var
// ============================================================================

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, svix-id, svix-timestamp, svix-signature",
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  })
}

async function verifySignature(
  rawBody: string,
  svixId: string,
  svixTimestamp: string,
  svixSignature: string,
  secret: string,
): Promise<boolean> {
  try {
    const keyBase64 = secret.startsWith("whsec_") ? secret.slice(6) : secret
    const keyBytes = Uint8Array.from(atob(keyBase64), (c) => c.charCodeAt(0))
    const key = await crypto.subtle.importKey(
      "raw", keyBytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
    )
    const signedContent = `${svixId}.${svixTimestamp}.${rawBody}`
    const sigBytes = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(signedContent))
    const computed = btoa(String.fromCharCode(...new Uint8Array(sigBytes)))
    const expectedSigs = svixSignature.split(" ").filter((s) => s.startsWith("v1,")).map((s) => s.slice(3))
    return expectedSigs.some((sig) => sig === computed)
  } catch (e) {
    console.error("[resend-webhook] signature error:", e)
    return false
  }
}

function isTimestampFresh(svixTimestamp: string): boolean {
  const ts = parseInt(svixTimestamp, 10)
  if (isNaN(ts)) return false
  return Math.abs(Date.now() / 1000 - ts) < 300
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS })
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405)

  const rawBody = await req.text()

  const webhookSecret = Deno.env.get("RESEND_WEBHOOK_SECRET") ?? ""
  if (!webhookSecret) {
    console.error("[resend-webhook] RESEND_WEBHOOK_SECRET not set")
    return json({ error: "Webhook secret not configured" }, 500)
  }

  const svixId        = req.headers.get("svix-id") ?? ""
  const svixTimestamp = req.headers.get("svix-timestamp") ?? ""
  const svixSignature = req.headers.get("svix-signature") ?? ""

  if (!svixId || !svixTimestamp || !svixSignature) return json({ error: "Missing Svix headers" }, 400)
  if (!isTimestampFresh(svixTimestamp)) return json({ error: "Webhook timestamp too old" }, 400)

  const valid = await verifySignature(rawBody, svixId, svixTimestamp, svixSignature, webhookSecret)
  if (!valid) {
    console.warn("[resend-webhook] invalid signature", svixId)
    return json({ error: "Invalid signature" }, 401)
  }

  let event: { type?: string; created_at?: string; data?: Record<string, unknown> }
  try { event = JSON.parse(rawBody) } catch { return json({ error: "Invalid JSON" }, 400) }

  const eventType   = event.type ?? ""
  const data        = event.data ?? {}
  const broadcastId = (data.broadcast_id ?? data.id) as string | undefined
  const emailId     = data.email_id as string | undefined

  console.log(`[resend-webhook] ${eventType} broadcast=${broadcastId ?? "none"} email=${emailId ?? "none"}`)

  const HANDLED_EVENTS = [
    "broadcast.sent", "email.sent",
    "email.opened", "email.clicked", "email.unsubscribed", "email.bounced",
  ] as const

  if (!HANDLED_EVENTS.includes(eventType as typeof HANDLED_EVENTS[number])) {
    return json({ ok: true, skipped: true, reason: `event '${eventType}' not handled` })
  }
  if (!broadcastId) {
    return json({ ok: true, skipped: true, reason: "no broadcast_id (transactional email)" })
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  )

  const { data: pc } = await supabase
    .from("provider_campaigns")
    .select("id, tenant_id, experience_page_id, provider_campaign_status")
    .eq("provider_campaign_id", broadcastId)
    .eq("provider_type", "resend")
    .maybeSingle()

  if (!pc) return json({ ok: true, skipped: true, reason: "broadcast not in provider_campaigns" })

  const { data: exp } = await supabase
    .from("experience_pages").select("campaign_id").eq("id", pc.experience_page_id).single()

  const campaignId = exp?.campaign_id as string | undefined
  if (!campaignId) return json({ ok: true, skipped: true, reason: "campaign_id not found" })

  const tenantId = pc.tenant_id as string

  // Dedup insert — handles both svix_id retries and repeat opens
  const { error: dedupErr } = await supabase.from("resend_webhook_events").insert({
    svix_id: svixId, event_type: eventType,
    broadcast_id: broadcastId, email_id: emailId ?? null, tenant_id: tenantId,
  })

  if (dedupErr) {
    if (dedupErr.code === "23505") {
      console.log(`[resend-webhook] duplicate skipped: ${svixId}`)
      return json({ ok: true, skipped: true, reason: "duplicate" })
    }
    console.error("[resend-webhook] dedup insert error:", dedupErr.message)
    return json({ error: "Database error" }, 500)
  }

  // broadcast.sent / email.sent → mark campaign sent + set emails_sent
  if (eventType === "broadcast.sent" || eventType === "email.sent") {
    const sentCount = (data.sent_count as number | undefined) ?? 0
    const now = new Date().toISOString()

    await supabase.from("provider_campaigns")
      .update({ provider_campaign_status: "sent", updated_at: now }).eq("id", pc.id)
    await supabase.from("campaigns")
      .update({ status: "sent", sent_at: now }).eq("id", campaignId).eq("tenant_id", tenantId)

    if (sentCount > 0) {
      await supabase.from("campaign_stats").upsert(
        { campaign_id: campaignId, tenant_id: tenantId, emails_sent: sentCount, cost_actual: sentCount * 0.19, updated_at: now },
        { onConflict: "campaign_id", ignoreDuplicates: false },
      )
    }
    return json({ ok: true, event: eventType, emails_sent: sentCount })
  }

  // Per-email engagement → atomic increment
  const incrementMap: Record<string, string> = {
    "email.opened":       "emails_opened",
    "email.clicked":      "emails_clicked",
    "email.unsubscribed": "unsubscribes",
  }

  const column = incrementMap[eventType]
  if (!column) return json({ ok: true, event: eventType, note: "logged only" })

  // Ensure row exists
  await supabase.from("campaign_stats").upsert(
    { campaign_id: campaignId, tenant_id: tenantId, updated_at: new Date().toISOString() },
    { onConflict: "campaign_id", ignoreDuplicates: true },
  )

  const { error: rpcErr } = await supabase.rpc("increment_campaign_stat", {
    p_campaign_id: campaignId, p_column: column,
  })

  if (rpcErr) {
    console.warn("[resend-webhook] rpc fallback:", rpcErr.message)
    const { data: existing } = await supabase.from("campaign_stats").select(column).eq("campaign_id", campaignId).single()
    const current = (existing as Record<string, number> | null)?.[column] ?? 0
    await supabase.from("campaign_stats")
      .update({ [column]: current + 1, updated_at: new Date().toISOString() })
      .eq("campaign_id", campaignId)
  }

  return json({ ok: true, event: eventType, incremented: column })
})
