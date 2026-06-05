// ============================================================================
// ai-music-studio-lyrics-callback  (PUBLIC — verify_jwt = false)
//
// KIE posts here when lyrics generation finishes. We validate the signed
// callback, store the lyrics asset (MVP: always variant data[0]) and then
// AUTOMATICALLY trigger music generation. Music is never started without
// lyrics first.
// ============================================================================

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

import { json, log, verifyCallback } from "../_shared/ai-studio.ts";
import { parseLyricsCallback } from "../_shared/kie.ts";
import { loadConfig, startMusicForJob } from "../_shared/orchestrator.ts";

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const url = new URL(req.url);
    const jobId = url.searchParams.get("job") ?? "";
    const token = url.searchParams.get("token");

    if (!(await verifyCallback(jobId, "lyrics", token))) {
      log("lyrics_cb", "invalid_token", { jobId });
      return new Response("Unauthorized", { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const parsed = parseLyricsCallback(body);
    log("lyrics_cb", "received", {
      jobId,
      taskId: parsed.taskId,
      ok: parsed.ok,
      variants: parsed.variants.length,
    });

    const { data: job } = await supabase
      .from("generation_jobs")
      .select("*")
      .eq("id", jobId)
      .maybeSingle();
    if (!job) return json({ ok: true, ignored: "job not found" });

    // Match the task id we stored to avoid stale / spoofed callbacks.
    if (
      job.external_lyrics_task_id &&
      parsed.taskId &&
      job.external_lyrics_task_id !== parsed.taskId
    ) {
      log("lyrics_cb", "task_mismatch", { jobId });
      return json({ ok: true, ignored: "task mismatch" });
    }

    // ── Failure path ─────────────────────────────────────────────────────────
    if (!parsed.ok) {
      await markFailed(supabase, job, parsed.errorMessage ?? "Lyrics failed", "lyrics");
      return json({ ok: true, status: "failed" });
    }

    // MVP rule: always use the first variant, ignore the rest.
    const variant = parsed.variants[0];

    // Idempotency: skip if a lyrics asset already exists for this job.
    const { data: existing } = await supabase
      .from("generation_assets")
      .select("id")
      .eq("generation_job_id", jobId)
      .eq("asset_type", "lyrics")
      .limit(1)
      .maybeSingle();

    if (!existing) {
      const { error: assetErr } = await supabase.from("generation_assets").insert({
        tenant_id: job.tenant_id,
        generation_job_id: job.id,
        campaign_id: job.campaign_id,
        asset_type: "lyrics",
        status: "ready",
        lyrics_content: variant.text,
        metadata: { title: variant.title },
        provider_metadata: { task_id: parsed.taskId, variant_index: 0 },
      });
      if (assetErr) throw assetErr;
    }

    await supabase
      .from("generation_jobs")
      .update({
        lyrics_status: "completed",
        lyrics_title: variant.title,
        selected_variant: 0,
        updated_at: new Date().toISOString(),
      })
      .eq("id", job.id);

    log("lyrics_cb", "stored", { jobId, title: variant.title });

    // ── Auto-trigger music generation ────────────────────────────────────────
    try {
      const config = await loadConfig(supabase, job.campaign_id);
      await startMusicForJob(supabase, job, config, variant.text, variant.title);
    } catch (musicErr) {
      log("lyrics_cb", "music_trigger_failed", {
        jobId,
        message: musicErr instanceof Error ? musicErr.message : "unknown",
      });
      await markFailed(
        supabase,
        job,
        musicErr instanceof Error ? musicErr.message : "Music start failed",
        "music",
      );
      return json({ ok: true, status: "music_start_failed" });
    }

    return json({ ok: true, status: "lyrics_completed" });
  } catch (err) {
    log("lyrics_cb", "error", { message: err instanceof Error ? err.message : "unknown" });
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});

// deno-lint-ignore no-explicit-any
async function markFailed(supabase: any, job: any, message: string, stage: "lyrics" | "music") {
  const patch: Record<string, unknown> = {
    status: "failed",
    error_message: message,
    updated_at: new Date().toISOString(),
  };
  patch[stage === "lyrics" ? "lyrics_status" : "music_status"] = "failed";
  await supabase.from("generation_jobs").update(patch).eq("id", job.id);

  if (job.generation_batch_id) {
    await supabase
      .from("generation_batches")
      .update({ status: "failed", failed_jobs: 1, updated_at: new Date().toISOString() })
      .eq("id", job.generation_batch_id);
  }
  await supabase
    .from("campaigns")
    .update({ status: "failed", updated_at: new Date().toISOString() })
    .eq("id", job.campaign_id);
}
