import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } })

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok")

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!)

  const { data: secretRow } = await supabase.from("platform_settings").select("value").eq("key", "cron_secret").single()
  const expectedSecret = secretRow?.value
  const providedSecret = req.headers.get("X-Cron-Secret")
  if (!expectedSecret || providedSecret !== expectedSecret) return json({ error: "Unauthorized" }, 401)

  const { data: cfgRows } = await supabase.from("platform_settings").select("key,value").in("key", ["job_max_attempts"])
  const cfg: Record<string, string> = {}
  for (const r of cfgRows ?? []) cfg[r.key] = r.value ?? ""
  const maxAttempts = parseInt(cfg["job_max_attempts"] || "3", 10)

  const { data: jobs } = await supabase.from("generation_jobs").select("id, campaign_id, attempts").eq("status", "queued").lt("attempts", maxAttempts).order("created_at", { ascending: true }).limit(5)
  if (!jobs?.length) return json({ message: "No queued jobs found", processed: 0 })

  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!

  const dispatchAll = Promise.allSettled(jobs.map(async (job) => {
    const res = await fetch(`${supabaseUrl}/functions/v1/generate-campaign`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${serviceRoleKey}` },
      body: JSON.stringify({ job_id: job.id }),
    })
    if (!res.ok) throw new Error(await res.text().catch(() => "unknown error"))
    return job.id
  }))

  // @ts-ignore
  if (typeof EdgeRuntime !== "undefined") EdgeRuntime.waitUntil(dispatchAll)

  return json({ message: "Dispatched", processed: jobs.length, job_ids: jobs.map(j => j.id) })
})
