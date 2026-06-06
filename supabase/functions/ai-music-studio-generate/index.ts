// ============================================================================
// ai-music-studio-generate
//
// Starts a Single Song generation (or retries a failed stage). Creates the
// batch/job if needed, then ALWAYS begins with lyrics. Music is never started
// here directly — that happens automatically after the lyrics callback.
//
// Scope: Single Song campaigns only. Personalized / bulk are rejected.
// ============================================================================

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

import { corsHeaders, json, log } from "../_shared/ai-studio.ts";
import { KieError } from "../_shared/kie-errors.ts";
import {
  loadConfig,
  startLyricsForJob,
  startMusicForJob,
} from "../_shared/orchestrator.ts";

type Action = "generate" | "retry_lyrics" | "retry_music";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing authorization" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: { user }, error: authErr } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (authErr || !user) return json({ error: "Unauthorized" }, 401);

    const { data: profile } = await supabase
      .from("profiles")
      .select("tenant_id")
      .eq("id", user.id)
      .single();
    if (!profile?.tenant_id) return json({ error: "Profile not found" }, 404);

    const body = await req.json().catch(() => ({}));
    const campaignId = body.campaign_id as string | undefined;
    const action = (body.action as Action | undefined) ?? "generate";
    if (!campaignId) return json({ error: "campaign_id required" }, 400);

    // Tenant-scoped campaign load.
    const { data: campaign, error: campErr } = await supabase
      .from("campaigns")
      .select("id, tenant_id, status")
      .eq("id", campaignId)
      .eq("tenant_id", profile.tenant_id)
      .maybeSingle();
    if (campErr) throw campErr;
    if (!campaign) return json({ error: "Campaign not found" }, 404);

    const config = await loadConfig(supabase, campaignId);
    if (config.generationMode !== "single_song") {
      return json(
        { error: "Solo se admiten campañas de canción única por ahora." },
        400,
      );
    }

    log("generate", "start", { campaignId, action, tenantId: profile.tenant_id });

    // ── Resolve the batch / round ───────────────────────────────────────────
    // Each review round is a full chain: Batch → Job → Assets. A fresh
    // "generate" after a completed round is a REGENERATION: it creates a NEW
    // batch with an incremented round (max 3 rounds). Retries reuse the
    // current round's batch + job.
    const MAX_ROUNDS = 3;

    const { data: latestBatch } = await supabase
      .from("generation_batches")
      .select("*")
      .eq("campaign_id", campaignId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let batch = latestBatch;

    let startNewRound = false;
    if (action === "generate" && latestBatch) {
      const { data: completedJob } = await supabase
        .from("generation_jobs")
        .select("id")
        .eq("generation_batch_id", latestBatch.id)
        .eq("music_status", "completed")
        .limit(1)
        .maybeSingle();
      if (completedJob) startNewRound = true;
    }

    if (startNewRound) {
      const nextRound = (latestBatch!.generation_round ?? 1) + 1;
      if (nextRound > MAX_ROUNDS) {
        return json(
          { error: "Has alcanzado el máximo de generaciones de revisión (3)." },
          400,
        );
      }
      const { data: created, error: bErr } = await supabase
        .from("generation_batches")
        .insert({
          tenant_id: profile.tenant_id,
          campaign_id: campaignId,
          status: "processing",
          generation_mode: "single_song",
          generation_round: nextRound,
          total_jobs: 1,
          started_at: new Date().toISOString(),
        })
        .select("*")
        .single();
      if (bErr) throw bErr;
      batch = created;
    } else if (!batch) {
      const { data: created, error: bErr } = await supabase
        .from("generation_batches")
        .insert({
          tenant_id: profile.tenant_id,
          campaign_id: campaignId,
          status: "processing",
          generation_mode: "single_song",
          generation_round: 1,
          total_jobs: 1,
          started_at: new Date().toISOString(),
        })
        .select("*")
        .single();
      if (bErr) throw bErr;
      batch = created;
    } else {
      await supabase
        .from("generation_batches")
        .update({
          status: "processing",
          started_at: batch.started_at ?? new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", batch.id);
    }

    // ── Resolve / create the job for this round's batch ──────────────────────
    const { data: existingJob } = await supabase
      .from("generation_jobs")
      .select("*")
      .eq("generation_batch_id", batch.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    let job = existingJob;
    if (!job) {
      const { data: created, error: jErr } = await supabase
        .from("generation_jobs")
        .insert({
          tenant_id: profile.tenant_id,
          campaign_id: campaignId,
          generation_batch_id: batch.id,
          status: "processing",
          provider: "ai-music-studio",
          generation_round: batch.generation_round ?? 1,
          lyrics_status: "pending",
          music_status: "pending",
        })
        .select("*")
        .single();
      if (jErr) throw jErr;
      job = created;
    }

    // ── Dispatch action ─────────────────────────────────────────────────────
    if (action === "retry_music") {
      // Reuse the already-generated lyrics asset.
      const { data: lyricsAsset } = await supabase
        .from("generation_assets")
        .select("lyrics_content, metadata")
        .eq("generation_job_id", job.id)
        .eq("asset_type", "lyrics")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!lyricsAsset?.lyrics_content) {
        return json({ error: "No hay letra generada para reintentar la música." }, 400);
      }
      const title = (lyricsAsset.metadata?.title as string | undefined) ??
        job.lyrics_title ?? null;
      await startMusicForJob(supabase, job, config, lyricsAsset.lyrics_content, title);
    } else {
      // "generate" and "retry_lyrics" both (re)start at the lyrics stage.
      await startLyricsForJob(supabase, job, config);
    }

    await supabase
      .from("campaigns")
      .update({ status: "generating", updated_at: new Date().toISOString() })
      .eq("id", campaignId);

    return json({ success: true, batch_id: batch.id, job_id: job.id, action });
  } catch (err) {
    if (err instanceof KieError) {
      // Keep the provider's real cause (e.g. code 402 "Insufficient Credits")
      // in server logs only — the user still sees the safe Spanish message.
      log("generate", "kie_error", {
        code: err.code,
        httpStatus: err.httpStatus,
        rawMessage: err.rawMessage,
      });
      return json({ error: err.message }, 500);
    }
    log("generate", "error", { message: err instanceof Error ? err.message : "unknown" });
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});
