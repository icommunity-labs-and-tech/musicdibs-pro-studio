// ============================================================================
// AI Music Studio — generation orchestrator (Edge runtime / Deno).
//
// Enforces the mandatory pipeline:
//   Campaign → Lyrics → Lyrics Callback → Music → Music Callback → Assets
// Music is NEVER generated directly; lyrics always come first.
//
// Shared by the generate trigger, the lyrics callback (auto music trigger) and
// the manual retry actions.
// ============================================================================

import { KieClient, type GenerationConfigInput } from "./kie.ts";
import { callbackUrl, log, signCallback } from "./ai-studio.ts";

// deno-lint-ignore no-explicit-any
type SupabaseLike = any;
// deno-lint-ignore no-explicit-any
type JobRow = any;

export function getKieClient(): KieClient {
  const apiKey = Deno.env.get("KIE_API_KEY");
  if (!apiKey) throw new Error("KIE_API_KEY is not configured");
  return new KieClient({
    apiKey,
    baseUrl: Deno.env.get("KIE_BASE_URL") ?? undefined,
  });
}

export async function loadConfig(
  supabase: SupabaseLike,
  campaignId: string,
): Promise<GenerationConfigInput & { generationMode: string }> {
  const { data, error } = await supabase
    .from("campaign_generation_configs")
    .select(
      "generation_mode, lyrics_goal, lyrics_prompt, music_style, voice_type, language, mood",
    )
    .eq("campaign_id", campaignId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Generation configuration not found");
  return {
    generationMode: data.generation_mode,
    lyricsGoal: data.lyrics_goal,
    lyricsPrompt: data.lyrics_prompt,
    musicStyle: data.music_style,
    voiceType: data.voice_type,
    language: data.language,
    mood: data.mood,
  };
}

/**
 * Step 1: request lyrics for a job and move lyrics_status → processing.
 */
export async function startLyricsForJob(
  supabase: SupabaseLike,
  job: JobRow,
  config: GenerationConfigInput,
): Promise<void> {
  const kie = getKieClient();
  const token = await signCallback(job.id, "lyrics");
  const url = callbackUrl("ai-music-studio-lyrics-callback", job.id, token);

  log("lyrics", "request", { jobId: job.id, campaignId: job.campaign_id });
  const { taskId, prompt } = await kie.generateLyrics(config, url);

  await supabase
    .from("generation_jobs")
    .update({
      external_lyrics_task_id: taskId,
      lyrics_status: "processing",
      music_status: "pending",
      status: "processing",
      prompt,
      started_at: job.started_at ?? new Date().toISOString(),
      error_message: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", job.id);

  log("lyrics", "request_ok", { jobId: job.id, taskId });
}

/**
 * Step 2: request music using already-generated lyrics; music_status →
 * processing. Always custom mode (lyrics already exist).
 */
export async function startMusicForJob(
  supabase: SupabaseLike,
  job: JobRow,
  config: GenerationConfigInput,
  lyrics: string,
  lyricsTitle: string | null,
): Promise<void> {
  const kie = getKieClient();
  const token = await signCallback(job.id, "music");
  const url = callbackUrl("ai-music-studio-music-callback", job.id, token);

  log("music", "request", { jobId: job.id, campaignId: job.campaign_id });
  const { taskId, style, title } = await kie.generateMusic(
    { lyrics, config, lyricsTitle },
    url,
  );

  await supabase
    .from("generation_jobs")
    .update({
      external_music_task_id: taskId,
      music_status: "processing",
      status: "processing",
      style,
      lyrics_title: title,
      error_message: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", job.id);

  log("music", "request_ok", { jobId: job.id, taskId });
}
