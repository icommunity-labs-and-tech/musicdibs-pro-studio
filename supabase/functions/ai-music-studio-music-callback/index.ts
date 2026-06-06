// ============================================================================
// ai-music-studio-music-callback  (PUBLIC — verify_jwt = false)
//
// KIE posts here when music generation finishes. We validate the signed
// callback, copy EVERY returned track (and its cover image) into Supabase
// Storage — never relying on provider URLs — store one audio asset per track,
// then complete the job, batch and campaign.
// ============================================================================

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

import { downloadAndStore, json, log, verifyCallback } from "../_shared/ai-studio.ts";
import { parseMusicCallback } from "../_shared/kie.ts";

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

    if (!(await verifyCallback(jobId, "music", token))) {
      log("music_cb", "invalid_token", { jobId });
      return new Response("Unauthorized", { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const parsed = parseMusicCallback(body);
    log("music_cb", "received", {
      jobId,
      taskId: parsed.taskId,
      callbackType: parsed.callbackType,
      tracks: parsed.tracks.length,
    });

    const { data: job } = await supabase
      .from("generation_jobs")
      .select("*")
      .eq("id", jobId)
      .maybeSingle();
    if (!job) return json({ ok: true, ignored: "job not found" });

    if (
      job.external_music_task_id &&
      parsed.taskId &&
      job.external_music_task_id !== parsed.taskId
    ) {
      log("music_cb", "task_mismatch", { jobId });
      return json({ ok: true, ignored: "task mismatch" });
    }

    // ── Failure path ─────────────────────────────────────────────────────────
    if (!parsed.ok) {
      await markFailed(supabase, job, parsed.errorMessage ?? "Music failed");
      return json({ ok: true, status: "failed" });
    }

    // KIE sends "first" then "complete"; only finalize on the complete payload.
    if (!parsed.complete) {
      log("music_cb", "interim_ignored", { jobId, callbackType: parsed.callbackType });
      return json({ ok: true, status: "interim" });
    }

    // Idempotency: skip if audio assets already stored for this job.
    const { data: existingAudio } = await supabase
      .from("generation_assets")
      .select("id")
      .eq("generation_job_id", jobId)
      .eq("asset_type", "audio")
      .limit(1)
      .maybeSingle();

    let firstPublicUrl: string | null = null;
    let firstDuration: number | null = null;

    if (!existingAudio) {
      for (let i = 0; i < parsed.tracks.length; i++) {
        const track = parsed.tracks[i];
        const base = `${job.tenant_id}/${job.campaign_id}/${job.id}/${track.externalId || i}`;

        // Audio — always copied to our storage.
        const audio = await downloadAndStore(
          supabase,
          track.audioUrl,
          `${base}.mp3`,
          "audio/mpeg",
        );

        // Cover image — stored for future cover support (best-effort).
        let imagePath: string | null = null;
        if (track.imageUrl) {
          try {
            const img = await downloadAndStore(
              supabase,
              track.imageUrl,
              `${base}.jpg`,
              "image/jpeg",
            );
            imagePath = img.storagePath;
          } catch (imgErr) {
            log("music_cb", "image_store_failed", {
              jobId,
              message: imgErr instanceof Error ? imgErr.message : "unknown",
            });
          }
        }

        const { error: assetErr } = await supabase.from("generation_assets").insert({
          tenant_id: job.tenant_id,
          generation_job_id: job.id,
          campaign_id: job.campaign_id,
          asset_type: "audio",
          status: "ready",
          storage_path: audio.storagePath,
          public_url: audio.publicUrl,
          external_asset_id: track.externalId,
          duration_seconds: track.durationSeconds,
          generation_round: job.generation_round ?? 1,
          metadata: { variant_index: i, title: track.title, cover_path: imagePath },
          provider_metadata: { ...track.raw, task_id: parsed.taskId },
        });
        if (assetErr) throw assetErr;

        if (i === 0) {
          firstPublicUrl = audio.publicUrl;
          firstDuration = track.durationSeconds;
        }
      }
    }

    // ── Complete job, batch and campaign ─────────────────────────────────────
    await supabase
      .from("generation_jobs")
      .update({
        music_status: "completed",
        status: "completed",
        output_url: firstPublicUrl,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", job.id);

    if (job.generation_batch_id) {
      await supabase
        .from("generation_batches")
        .update({
          status: "completed",
          completed_jobs: 1,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", job.generation_batch_id);
    }

    const campaignPatch: Record<string, unknown> = {
      status: "completed",
      generated_count: 1,
      updated_at: new Date().toISOString(),
    };
    if (firstPublicUrl) campaignPatch.audio_url = firstPublicUrl;
    if (firstDuration) campaignPatch.duration_seconds = Math.round(firstDuration);
    await supabase.from("campaigns").update(campaignPatch).eq("id", job.campaign_id);

    log("music_cb", "completed", { jobId, tracks: parsed.tracks.length });
    return json({ ok: true, status: "completed", tracks: parsed.tracks.length });
  } catch (err) {
    log("music_cb", "error", { message: err instanceof Error ? err.message : "unknown" });
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});

// deno-lint-ignore no-explicit-any
async function markFailed(supabase: any, job: any, message: string) {
  await supabase
    .from("generation_jobs")
    .update({
      music_status: "failed",
      status: "failed",
      error_message: message,
      updated_at: new Date().toISOString(),
    })
    .eq("id", job.id);

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
