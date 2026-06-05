import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } })

async function hmacSign(secret: string, body: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"])
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body))
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("")
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok")
  try {
    const authHeader = req.headers.get("Authorization")
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    if (!authHeader || authHeader.replace("Bearer ", "") !== serviceKey) return json({ error: "Forbidden" }, 403)

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, serviceKey)
    const { tenant_id, event, payload } = await req.json()
    if (!tenant_id || !event) return json({ error: "tenant_id and event required" }, 400)

    const { data: webhooks } = await supabase.from("tenant_webhooks").select("id, url, secret, events").eq("tenant_id", tenant_id).eq("active", true)
    if (!webhooks?.length) return json({ message: "No active webhooks for tenant", dispatched: 0 })

    const matching = webhooks.filter(w => Array.isArray(w.events) && (w.events.includes(event) || w.events.includes("*")))
    if (!matching.length) return json({ message: `No webhooks subscribed to event '${event}'`, dispatched: 0 })

    const results = await Promise.allSettled(matching.map(async (webhook) => {
      const body = JSON.stringify({ event, timestamp: new Date().toISOString(), tenant_id, data: payload ?? {} })
      const signature = webhook.secret ? `sha256=${await hmacSign(webhook.secret, body)}` : undefined
      const headers: Record<string, string> = { "Content-Type": "application/json", "User-Agent": "MusicDibs-Webhooks/1.0", "X-MusicDibs-Event": event }
      if (signature) headers["X-MusicDibs-Signature"] = signature

      const start = Date.now()
      let statusCode: number | null = null, responseBody: string | null = null, success = false
      try {
        const res = await fetch(webhook.url, { method: "POST", headers, body })
        statusCode = res.status; responseBody = await res.text().catch(() => null); success = res.ok
      } catch (err) { responseBody = err instanceof Error ? err.message : String(err) }

      await supabase.from("webhook_deliveries").insert({ webhook_id: webhook.id, tenant_id, event, payload: payload ?? {}, status_code: statusCode, response_body: responseBody?.slice(0, 2000), duration_ms: Date.now() - start, success })
      return { webhook_id: webhook.id, success, status_code: statusCode }
    }))

    const succeeded = results.filter(r => r.status === "fulfilled" && (r as any).value?.success).length
    return json({ event, dispatched: matching.length, succeeded, failed: matching.length - succeeded })
  } catch (err) {
    console.error("webhook-dispatcher error:", err)
    return json({ error: err instanceof Error ? err.message : String(err) }, 500)
  }
})
