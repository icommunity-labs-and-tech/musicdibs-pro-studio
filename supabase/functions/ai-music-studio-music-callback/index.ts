// ============================================================================
// ai-music-studio-music-callback  v23  (PUBLIC — verify_jwt = false)
//
// KIE posts here when music generation finishes. We validate the signed
// callback, copy EVERY returned track (and its cover image) into Supabase
// Storage, store audio assets, then branch:
//
//   A) personalized  →  auto-approve, auto-create experience_page (published),
//                        update personalized_deliveries, atomic batch counter,
//                        when all done: campaign → 'ready_to_send'
//
//   B) single_song   →  existing flow: batch completed, campaign → 'reviewing'
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
    let firstAssetId: string | null = null;

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

        const { data: insertedAsset, error: assetErr } = await supabase
          .from("generation_assets")
          .insert({
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
          })
          .select("id")
          .single();
        if (assetErr) throw assetErr;

        if (i === 0) {
          firstPublicUrl = audio.publicUrl;
          firstDuration = track.durationSeconds;
          firstAssetId = insertedAsset?.id ?? null;
        }
      }
    } else {
      // Assets already stored (idempotent re-delivery) — load first asset id
      const { data: fa } = await supabase
        .from("generation_assets")
        .select("id, public_url")
        .eq("generation_job_id", jobId)
        .eq("asset_type", "audio")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      firstAssetId = fa?.id ?? null;
      firstPublicUrl = fa?.public_url ?? null;
    }

    // ── Complete job ──────────────────────────────────────────────────────────
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

    // ── Branch: personalized vs single_song ──────────────────────────────────
    const { data: delivery } = await supabase
      .from("personalized_deliveries")
      .select("id, generation_batch_id")
      .eq("generation_job_id", job.id)
      .maybeSingle();

    if (delivery) {
      // ── A) Personalized branch ────────────────────────────────────────────

      // Auto-approve the first audio asset
      if (firstAssetId) {
        await supabase
          .from("generation_assets")
          .update({ status: "approved", updated_at: new Date().toISOString() })
          .eq("id", firstAssetId);
      }

      // Generate a unique 20-hex-char experience token
      const experienceToken = crypto.randomUUID().replace(/-/g, "").slice(0, 20);

      // Load campaign branding (best-effort)
      const { data: campaignData } = await supabase
        .from("campaigns")
        .select("branding")
        .eq("id", job.campaign_id)
        .maybeSingle();

      // Auto-create experience_page with status = 'published'
      const { data: page, error: pageErr } = await supabase
        .from("experience_pages")
        .insert({
          tenant_id: job.tenant_id,
          campaign_id: job.campaign_id,
          generation_job_id: job.id,
          experience_token: experienceToken,
          status: "published",
          audio_asset_id: firstAssetId,
          branding: campaignData?.branding ?? {},
        })
        .select("id")
        .single();
      if (pageErr) throw pageErr;

      // Update delivery → ready
      await supabase
        .from("personalized_deliveries")
        .update({
          experience_page_id: page.id,
          experience_token: experienceToken,
          status: "ready",
          updated_at: new Date().toISOString(),
        })
        .eq("id", delivery.id);

      // Atomic batch counter — only for original batch jobs (retry jobs have null batch_id)
      if (job.generation_batch_id) {
        const { data: batchResult, error: rpcErr } = await supabase.rpc(
          "increment_batch_completed_jobs",
          { p_batch_id: job.generation_batch_id },
        );
        if (rpcErr) throw rpcErr;

        const completed = batchResult?.[0]?.completed_jobs ?? 0;
        const total     = batchResult?.[0]?.total_jobs ?? 0;

        log("music_cb", "personalized_job_done", {
          jobId,
          deliveryId: delivery.id,
          pageId: page.id,
          completed,
          total,
        });

        // When every job in the batch has finished → campaign ready to send
        if (completed >= total && total > 0) {
          await supabase
            .from("campaigns")
            .update({ status: "ready_to_send", updated_at: new Date().toISOString() })
            .eq("id", job.campaign_id);

          await supabase
            .from("generation_batches")
            .update({
              status: "completed",
              completed_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("id", job.generation_batch_id);

          log("music_cb", "personalized_batch_complete", {
            batchId: job.generation_batch_id,
            campaignId: job.campaign_id,
            total,
          });
        }
      } else {
        // Retry job (no batch) — just log completion
        log("music_cb", "personalized_retry_job_done", {
          jobId,
          deliveryId: delivery.id,
          pageId: page.id,
        });
      }

    } else {
      // ── B) Single-song / existing flow ────────────────────────────────────

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
        status: "reviewing",
        generated_count: 1,
        updated_at: new Date().toISOString(),
      };
      if (firstPublicUrl) campaignPatch.audio_url = firstPublicUrl;
      if (firstDuration) campaignPatch.duration_seconds = Math.round(firstDuration);
      await supabase.from("campaigns").update(campaignPatch).eq("id", job.campaign_id);
    }

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

  // Check if personalized — mark delivery failed + atomic counter for partial batches
  const { data: delivery } = await supabase
    .from("personalized_deliveries")
    .select("id")
    .eq("generation_job_id", job.id)
    .maybeSingle();

  if (delivery) {
    await supabase
      .from("personalized_deliveries")
      .update({
        status: "failed",
        error_message: message,
        updated_at: new Date().toISOString(),
      })
      .eq("id", delivery.id);

    // Still increment so the batch can complete even with partial failures
    if (job.generation_batch_id) {
      const { data: batchResult } = await supabase.rpc(
        "increment_batch_completed_jobs",
        { p_batch_id: job.generation_batch_id },
      );
      const completed = batchResult?.[0]?.completed_jobs ?? 0;
      const total     = batchResult?.[0]?.total_jobs ?? 0;
      if (completed >= total && total > 0) {
        await supabase.from("campaigns")
          .update({ status: "ready_to_send", updated_at: new Date().toISOString() })
          .eq("id", job.campaign_id);
        await supabase.from("generation_batches")
          .update({ status: "completed", completed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
          .eq("id", job.generation_batch_id);
      }
    }
  } else {
    // Single-song failure
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
}
