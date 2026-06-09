// AUTO-BUNDLED — all _shared deps inlined
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// ============================================================================
// AI Music Studio — KIE/Suno error catalogue (Edge runtime / Deno).
//
// Single source of truth for translating EVERY documented KIE/Suno business
// code into a customer-safe Spanish message. No code path may surface a raw
// provider/English error: anything not in the catalogue falls back to a
// generic Spanish message while the original text is kept for server logs only.
//
// BRANDING: customer-facing strings never mention KIE/Suno — only the platform.
// Source of truth: KIE Suno API documentation (status codes + callback codes).
// ============================================================================

/**
 * Documented KIE/Suno business codes → Spanish, customer-safe messages.
 *
 * These cover both the synchronous API responses (POST /lyrics, /generate) and
 * the asynchronous callback `code` values. Where the docs reuse HTTP-style
 * semantics we keep the same numeric key.
 */
export const KIE_CODE_MESSAGES_ES: Record<number, string> = {
  // ── Success ───────────────────────────────────────────────────────────────
  200: "Operación completada correctamente.",

  // ── Client / request errors ────────────────────────────────────────────────
  400: "La solicitud de generación no es válida. Revisa la configuración de la campaña e inténtalo de nuevo.",
  401: "El servicio de generación musical rechazó las credenciales. Contacta con soporte.",
  402: "El servicio de generación no está disponible temporalmente. Inténtalo más tarde.",
  403: "El servicio de generación musical denegó el acceso a esta operación. Contacta con soporte.",
  404: "No se encontró el recurso de generación solicitado. Vuelve a iniciar la generación.",
  405: "Operación no permitida por el servicio de generación musical. Contacta con soporte.",
  408: "El servicio de generación musical tardó demasiado en responder. Inténtalo de nuevo en unos minutos.",
  413: "El texto enviado es demasiado largo. Acorta el objetivo o las instrucciones de la letra e inténtalo de nuevo.",
  422: "El contenido no cumple las políticas del servicio de generación musical. Ajusta la letra o el estilo e inténtalo de nuevo.",
  429: "Se ha alcanzado el límite de solicitudes de generación. Espera unos minutos e inténtalo de nuevo.",
  451: "No se pudo descargar el contenido generado. Inténtalo de nuevo en unos minutos.",
  455: "El servicio de generación musical está en mantenimiento. Inténtalo de nuevo más tarde.",

  // ── Server / generation errors ─────────────────────────────────────────────
  500: "Se produjo un error interno en el servicio de generación musical. Inténtalo de nuevo en unos minutos.",
  501: "La generación de la canción falló. Inténtalo de nuevo; si el problema persiste, contacta con soporte.",
  503: "El servicio de generación musical no está disponible temporalmente. Inténtalo de nuevo más tarde.",
};

/** Generic fallback when the code is unknown/missing — never leaks raw text. */
export const KIE_GENERIC_ES =
  "Se produjo un error inesperado en el servicio de generación musical. Inténtalo de nuevo; si el problema persiste, contacta con soporte.";

/**
 * Translate a KIE/Suno code (and optional raw message) into a customer-safe
 * Spanish string. The raw message is ignored for the user-facing text and is
 * only meant to be logged server-side by the caller.
 */
export function translateKieError(
  code: number | null | undefined,
  _rawMessage?: string | null,
): string {
  if (typeof code === "number" && KIE_CODE_MESSAGES_ES[code]) {
    return KIE_CODE_MESSAGES_ES[code];
  }
  return KIE_GENERIC_ES;
}

/**
 * Error thrown by the KIE provider layer. Carries the customer-safe Spanish
 * message (in `message`) plus the original code/raw text for server logs only.
 * Pass `userMessage` to override the catalogue lookup for transport-level
 * failures (network, malformed body) that have no documented business code.
 */
export class KieError extends Error {
  readonly code: number | null;
  readonly rawMessage: string | null;
  readonly httpStatus: number | null;

  constructor(opts: {
    code?: number | null;
    rawMessage?: string | null;
    httpStatus?: number | null;
    userMessage?: string;
  }) {
    super(opts.userMessage ?? translateKieError(opts.code ?? null, opts.rawMessage ?? null));
    this.name = "KieError";
    this.code = opts.code ?? null;
    this.rawMessage = opts.rawMessage ?? null;
    this.httpStatus = opts.httpStatus ?? null;
  }
}


/** Spanish message for transport-level failures (network, non-JSON, etc.). */
export const KIE_NETWORK_ES =
  "No se pudo contactar con el servicio de generación musical. Comprueba tu conexión e inténtalo de nuevo.";

export const KIE_INVALID_RESPONSE_ES =
  "El servicio de generación musical devolvió una respuesta no válida. Inténtalo de nuevo en unos minutos.";

/** Spanish message when an asset download/storage step fails. */
export const KIE_DOWNLOAD_ES =
  "No se pudo guardar el contenido generado. Inténtalo de nuevo en unos minutos.";


// ============================================================================
// AI Music Studio — shared edge utilities (Deno).
// CORS, JSON responses, structured logging, callback-token signing and the
// "copy provider media into Supabase Storage" workflow.
// ============================================================================




export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ── Structured logging (never logs secrets) ─────────────────────────────────
export function log(
  scope: string,
  event: string,
  fields: Record<string, unknown> = {},
): void {
  try {
    console.log(JSON.stringify({ scope, event, ts: new Date().toISOString(), ...fields }));
  } catch {
    console.log(`[${scope}] ${event}`);
  }
}

// ── Callback token (HMAC over jobId + stage, keyed by service role) ──────────
// Lets the public callback endpoints validate that a request really maps to a
// job we created, without exposing any secret in the callback URL.
async function hmacHex(key: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function signCallback(
  jobId: string,
  stage: "lyrics" | "music",
): Promise<string> {
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  return hmacHex(key, `${jobId}:${stage}`);
}

export async function verifyCallback(
  jobId: string,
  stage: "lyrics" | "music",
  token: string | null,
): Promise<boolean> {
  if (!jobId || !token) return false;
  const expected = await signCallback(jobId, stage);
  if (expected.length !== token.length) return false;
  // Constant-time-ish comparison.
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ token.charCodeAt(i);
  }
  return diff === 0;
}

export function callbackUrl(
  fn: string,
  jobId: string,
  token: string,
): string {
  const base = (Deno.env.get("SUPABASE_URL") ?? "").replace(/\/+$/, "");
  return `${base}/functions/v1/${fn}?job=${encodeURIComponent(jobId)}&token=${token}`;
}

// ── Copy provider media into Supabase Storage ───────────────────────────────
// We never rely on provider URLs. Returns the storage path + public URL.
const STORAGE_BUCKET = "campaign-audio";

export interface StoredFile {
  storagePath: string;
  publicUrl: string;
}

// deno-lint-ignore no-explicit-any
type SupabaseLike = any;

export async function downloadAndStore(
  supabase: SupabaseLike,
  sourceUrl: string,
  storagePath: string,
  contentType: string,
): Promise<StoredFile> {
  log("storage", "download_start", { storagePath });

  // Fetch the provider-generated media. Any transport/HTTP failure becomes a
  // customer-safe Spanish message; the raw detail stays in the logs only.
  let res: Response;
  try {
    res = await fetch(sourceUrl);
  } catch (networkErr) {
    log("storage", "download_network_error", {
      storagePath,
      message: networkErr instanceof Error ? networkErr.message : "unknown",
    });
    throw new Error(KIE_DOWNLOAD_ES);
  }
  if (!res.ok) {
    log("storage", "download_failed", { storagePath, httpStatus: res.status });
    throw new Error(KIE_DOWNLOAD_ES);
  }
  const bytes = new Uint8Array(await res.arrayBuffer());

  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, bytes, { contentType, upsert: true });
  if (error) {
    log("storage", "upload_failed", {
      storagePath,
      message: error.message ?? "unknown",
    });
    throw new Error(KIE_DOWNLOAD_ES);
  }

  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(storagePath);
  log("storage", "upload_done", { storagePath, bytes: bytes.length });
  return { storagePath, publicUrl: data.publicUrl as string };
}



// ============================================================================
// AI Music Studio — KIE provider layer (Edge runtime / Deno).
//
// This is the ONLY place that knows the underlying engine's request payloads
// and callback structures. Mapping uncertainties are isolated here so the
// Generation Architecture and Campaign Builder never need to change.
//
// Source of truth: KIE Suno API documentation.
//   - Lyrics:        POST /api/v1/lyrics        (callbackType "complete")
//   - Music (custom): POST /api/v1/generate     (callbackType "first"/"complete")
//
// BRANDING: nothing here is ever surfaced to customers. The UI only shows
// "Powered by AI Music Studio".
//
// ERROR HANDLING: every request and callback funnels its failures through the
// KIE/Suno error catalogue (kie-errors.ts) so no raw/English provider error is
// ever stored or shown — all user-facing messages are Spanish.
// ============================================================================


// ── Config shapes (mirror campaign_generation_configs) ──────────────────────
export interface GenerationConfigInput {
  lyricsGoal: string | null;
  lyricsPrompt: string | null;
  musicStyle: string | null;
  voiceType: string | null;
  language: string | null;
  mood: string | null;
}

// ── Provider-agnostic results ───────────────────────────────────────────────
export interface LyricsVariant {
  text: string;
  title: string;
  status: string;
  errorMessage?: string;
}

export interface MusicTrack {
  externalId: string;
  audioUrl: string;
  streamAudioUrl: string | null;
  imageUrl: string | null;
  title: string | null;
  tags: string | null;
  durationSeconds: number | null;
  raw: Record<string, unknown>;
}

// ── Human-readable mappings (provider-internal only) ────────────────────────
const LANGUAGE_NAMES: Record<string, string> = {
  es: "Spanish",
  en: "English",
  pt: "Portuguese",
  fr: "French",
};

const VOICE_NAMES: Record<string, string> = {
  male: "male vocals",
  female: "female vocals",
  duet: "duet vocals",
};

function truncate(value: string, max: number): string {
  const trimmed = value.trim();
  return trimmed.length <= max ? trimmed : trimmed.slice(0, max).trim();
}

/**
 * Build the lyrics prompt (KIE limit: 200 chars). Combines campaign intent,
 * custom instructions, style, mood and language into a single descriptive
 * prompt.
 */
export function buildLyricsPrompt(config: GenerationConfigInput): string {
  const langName = config.language
    ? LANGUAGE_NAMES[config.language] ?? config.language
    : null;
  const parts: string[] = [];
  if (config.lyricsGoal) parts.push(config.lyricsGoal);
  if (config.lyricsPrompt) parts.push(config.lyricsPrompt);
  const meta: string[] = [];
  if (config.musicStyle) meta.push(config.musicStyle);
  if (config.mood) meta.push(config.mood);
  if (langName) meta.push(`in ${langName}`);
  if (meta.length) parts.push(meta.join(", "));
  const prompt = parts.join(". ") || "An uplifting brand song";
  return truncate(prompt, 200);
}

/**
 * Build the music "style" instruction (KIE custom mode, V4_5 allows 1000
 * chars). Folds voice type, mood and language mapping into the style since the
 * music endpoint has no dedicated voice/language fields.
 */
export function buildMusicStyle(config: GenerationConfigInput): string {
  const parts: string[] = [];
  if (config.musicStyle) parts.push(config.musicStyle);
  if (config.mood) parts.push(config.mood);
  if (config.voiceType && VOICE_NAMES[config.voiceType]) {
    parts.push(VOICE_NAMES[config.voiceType]);
  }
  if (config.language) {
    const langName = LANGUAGE_NAMES[config.language] ?? config.language;
    parts.push(`${langName} lyrics`);
  }
  return truncate(parts.join(", ") || "pop", 1000);
}

export function buildMusicTitle(lyricsTitle: string | null): string {
  return truncate(lyricsTitle || "AI Music Studio", 80);
}

// ── KIE HTTP client ─────────────────────────────────────────────────────────
export interface KieClientOptions {
  apiKey: string;
  baseUrl?: string;
}

export class KieClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(opts: KieClientOptions) {
    this.apiKey = opts.apiKey;
    this.baseUrl = (opts.baseUrl ?? "https://api.kie.ai").replace(/\/+$/, "");
  }

  private async post(
    path: string,
    body: Record<string, unknown>,
  ): Promise<{ taskId: string }> {
    // ── Transport layer (network / fetch failures) ──────────────────────────
    let res: Response;
    try {
      res = await fetch(`${this.baseUrl}${path}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
    } catch (networkErr) {
      // Network/DNS/timeout: no business code available.
      throw new KieError({
        userMessage: KIE_NETWORK_ES,
        rawMessage:
          networkErr instanceof Error ? networkErr.message : String(networkErr),
      });
    }

    // ── Body parsing (non-JSON / malformed responses) ───────────────────────
    let parsed: { code?: number; msg?: string; data?: { taskId?: string } };
    try {
      parsed = await res.json();
    } catch {
      // Use the HTTP status as the business code when the body isn't JSON so a
      // documented 4xx/5xx still maps to a precise Spanish message.
      if (typeof KIE_CODE_MESSAGES_ES[res.status] === "undefined") {
        throw new KieError({ userMessage: KIE_INVALID_RESPONSE_ES, httpStatus: res.status });
      }
      throw new KieError({ code: res.status, httpStatus: res.status });
    }


    // ── Business layer (documented KIE/Suno codes) ──────────────────────────
    if (!res.ok || parsed.code !== 200 || !parsed.data?.taskId) {
      // Prefer the documented business code; fall back to the HTTP status.
      const code = typeof parsed.code === "number" ? parsed.code : res.status;
      throw new KieError({
        code,
        rawMessage: parsed.msg ?? null,
        httpStatus: res.status,
      });
    }

    return { taskId: parsed.data.taskId };
  }


  /** POST /api/v1/lyrics — returns the lyrics task id. */
  async generateLyrics(
    config: GenerationConfigInput,
    callBackUrl: string,
  ): Promise<{ taskId: string; prompt: string }> {
    const prompt = buildLyricsPrompt(config);
    const { taskId } = await this.post("/api/v1/lyrics", {
      prompt,
      callBackUrl,
    });
    return { taskId, prompt };
  }

  /** POST /api/v1/generate (custom mode) — returns the music task id. */
  async generateMusic(
    params: {
      lyrics: string;
      config: GenerationConfigInput;
      lyricsTitle: string | null;
    },
    callBackUrl: string,
  ): Promise<{ taskId: string; style: string; title: string }> {
    const style = buildMusicStyle(params.config);
    const title = buildMusicTitle(params.lyricsTitle);
    const { taskId } = await this.post("/api/v1/generate", {
      prompt: truncate(params.lyrics, 5000),
      customMode: true,
      instrumental: false,
      model: "V4_5",
      style,
      title,
      callBackUrl,
    });
    return { taskId, style, title };
  }
}

// ── Callback parsers ────────────────────────────────────────────────────────
export interface ParsedLyricsCallback {
  ok: boolean;
  taskId: string | null;
  variants: LyricsVariant[];
  errorMessage: string | null;
}

/**
 * Parse a KIE lyrics callback body. KIE returns one callback with all
 * variations. MVP rule: callers should use variants[0] and ignore the rest.
 */
export function parseLyricsCallback(body: unknown): ParsedLyricsCallback {
  const root = (body ?? {}) as {
    code?: number;
    msg?: string;
    data?: { task_id?: string; data?: unknown };
  };
  const taskId = root.data?.task_id ?? null;
  const rawList = Array.isArray(root.data?.data)
    ? (root.data!.data as Record<string, unknown>[])
    : [];

  const variants: LyricsVariant[] = rawList.map((v) => ({
    text: typeof v.text === "string" ? v.text : "",
    title: typeof v.title === "string" ? v.title : "",
    status: typeof v.status === "string" ? v.status : "",
    errorMessage:
      typeof v.error_message === "string" ? v.error_message : undefined,
  }));

  const firstOk =
    root.code === 200 &&
    variants.length > 0 &&
    variants[0].status === "complete" &&
    variants[0].text.length > 0;

  // Translate the documented code to Spanish. When the transport code is 200
  // but the content itself failed (no usable variant), treat it as a failed
  // generation (501) so the user still gets a clear, actionable message.
  const code = typeof root.code === "number" ? root.code : null;
  return {
    ok: firstOk,
    taskId,
    variants,
    errorMessage: firstOk
      ? null
      : translateKieError(code === 200 ? 501 : code, root.msg ?? null),
  };
}


export interface ParsedMusicCallback {
  ok: boolean;
  complete: boolean;
  taskId: string | null;
  callbackType: string | null;
  tracks: MusicTrack[];
  errorMessage: string | null;
}

/**
 * Parse a KIE music callback body. KIE sends "first" then "complete"; we only
 * finalize on "complete" (all tracks). All returned tracks are kept.
 */
export function parseMusicCallback(body: unknown): ParsedMusicCallback {
  const root = (body ?? {}) as {
    code?: number;
    msg?: string;
    data?: { task_id?: string; callbackType?: string; data?: unknown };
  };
  const taskId = root.data?.task_id ?? null;
  const callbackType = root.data?.callbackType ?? null;
  const rawList = Array.isArray(root.data?.data)
    ? (root.data!.data as Record<string, unknown>[])
    : [];

  const tracks: MusicTrack[] = rawList
    .filter((t) => typeof t.audio_url === "string" && t.audio_url.length > 0)
    .map((t) => ({
      externalId: typeof t.id === "string" ? t.id : "",
      audioUrl: t.audio_url as string,
      streamAudioUrl:
        typeof t.stream_audio_url === "string" ? t.stream_audio_url : null,
      imageUrl: typeof t.image_url === "string" ? t.image_url : null,
      title: typeof t.title === "string" ? t.title : null,
      tags: typeof t.tags === "string" ? t.tags : null,
      durationSeconds: typeof t.duration === "number" ? t.duration : null,
      raw: t,
    }));

  const isError = root.code !== 200 || callbackType === "error";
  const complete = callbackType === "complete";

  // Translate the documented code to Spanish. A 200 transport code paired with
  // an "error" callbackType means the generation itself failed → map to 501.
  const code = typeof root.code === "number" ? root.code : null;
  return {
    ok: !isError,
    complete: complete && tracks.length > 0,
    taskId,
    callbackType,
    tracks,
    errorMessage: isError
      ? translateKieError(code === 200 ? 501 : code, root.msg ?? null)
      : null,
  };

}


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


// deno-lint-ignore no-explicit-any
type JobRow = any;

export function getKieClient(): KieClient {
  const apiKey = Deno.env.get("KIE_API_KEY");
  if (!apiKey) {
    // Misconfiguration — never expose internals; log the real cause separately.
    log("kie", "missing_api_key", {});
    throw new Error(KIE_GENERIC_ES);
  }
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


// ============================================================================
// ai-music-studio-lyrics-callback  (PUBLIC — verify_jwt = false)
//
// KIE posts here when lyrics generation finishes. We validate the signed
// callback, store the lyrics asset (MVP: always variant data[0]) and then
// AUTOMATICALLY trigger music generation. Music is never started without
// lyrics first.
//
// Auto-fallback for KIE 400 errors (e.g. celebrity/protected name):
//   When a personalized delivery job fails with KIE code 400 and
//   delivery.retry_count < MAX_AUTO_RETRIES (3), we automatically create a
//   new job WITHOUT first_name personalisation so the contact still receives
//   a song. After MAX_AUTO_RETRIES the delivery is permanently failed.
// ============================================================================



/** Maximum total auto-fallback attempts per personalized delivery. */
const MAX_AUTO_RETRIES = 3;

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

    // Extract the raw KIE code BEFORE parsing (parseLyricsCallback translates it).
    // We need the original numeric code to distinguish deterministic 400 rejections
    // (e.g. celebrity/protected name) from transient failures.
    const rawKieCode: number | null =
      body !== null && typeof (body as Record<string, unknown>).code === "number"
        ? (body as Record<string, unknown>).code as number
        : null;

    const parsed = parseLyricsCallback(body);
    log("lyrics_cb", "received", {
      jobId,
      taskId: parsed.taskId,
      ok: parsed.ok,
      variants: parsed.variants.length,
      rawKieCode,
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
      await markFailed(supabase, job, parsed.errorMessage ?? "Lyrics failed", rawKieCode);
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
        null,
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
async function markFailed(
  supabase: any,
  job: any,
  message: string,
  kieCode: number | null,
): Promise<void> {
  // Always mark the generation job itself as failed first.
  await supabase
    .from("generation_jobs")
    .update({
      lyrics_status: "failed",
      status: "failed",
      error_message: message,
      updated_at: new Date().toISOString(),
    })
    .eq("id", job.id);

  // Check if this job belongs to a personalized delivery.
  const { data: delivery } = await supabase
    .from("personalized_deliveries")
    .select("id, retry_count, first_name")
    .eq("generation_job_id", job.id)
    .maybeSingle();

  if (delivery) {
    // ── Personalized: run batch counter (only for original batch jobs) ────────
    if (job.generation_batch_id) {
      const { data: batchResult, error: rpcErr } = await supabase.rpc(
        "increment_batch_completed_jobs",
        { p_batch_id: job.generation_batch_id },
      );
      if (rpcErr) throw rpcErr;
      const completed = batchResult?.[0]?.completed_jobs ?? 0;
      const total     = batchResult?.[0]?.total_jobs ?? 0;

      log("lyrics_cb", "personalized_job_failed", {
        jobId: job.id,
        deliveryId: delivery.id,
        completed,
        total,
        kieCode,
      });

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
        log("lyrics_cb", "personalized_batch_complete_with_failures", {
          batchId: job.generation_batch_id,
          campaignId: job.campaign_id,
          completed,
          total,
        });
      }
    }

    // ── Auto-fallback for deterministic KIE 400 rejections ───────────────────
    // KIE code 400 = the request itself was rejected (e.g. celebrity/protected
    // artist name in the lyrics goal). Retrying with the same config will always
    // fail, so we automatically generate a NON-personalised version instead.
    const retryCount = (delivery.retry_count as number) ?? 0;
    if (kieCode === 400 && retryCount < MAX_AUTO_RETRIES) {
      try {
        const config = await loadConfig(supabase, job.campaign_id);

        // Create a new job outside the original batch (same pattern as retry_delivery).
        const { data: fallbackJob, error: jobErr } = await supabase
          .from("generation_jobs")
          .insert({
            tenant_id:           job.tenant_id,
            campaign_id:         job.campaign_id,
            generation_batch_id: null,   // not part of original batch
            status:              "processing",
            provider:            "ai-music-studio",
            generation_round:    1,
            lyrics_status:       "pending",
            music_status:        "pending",
          })
          .select("id, campaign_id, tenant_id, generation_batch_id, started_at")
          .single();
        if (jobErr) throw jobErr;

        // Point delivery at the new job; mark it as regenerating (fallback mode).
        await supabase
          .from("personalized_deliveries")
          .update({
            generation_job_id:      fallbackJob.id,
            status:                 "generating",
            retry_count:            retryCount + 1,
            is_fallback_generation: true,
            experience_token:       null,
            experience_page_id:     null,
            error_message:          null,
            email_sent_at:          null,
            updated_at:             new Date().toISOString(),
          })
          .eq("id", delivery.id);

        // Start lyrics WITHOUT first_name personalisation — use the raw campaign
        // lyricsGoal template so the name restriction is avoided.
        await startLyricsForJob(supabase, fallbackJob, config);

        log("lyrics_cb", "auto_fallback_triggered", {
          originalJobId:  job.id,
          fallbackJobId:  fallbackJob.id,
          deliveryId:     delivery.id,
          retryCount:     retryCount + 1,
          maxRetries:     MAX_AUTO_RETRIES,
          firstName:      delivery.first_name,
        });
        return; // Delivery is regenerating — do NOT mark it as failed.
      } catch (fallbackErr) {
        // Auto-fallback itself failed (e.g. DB error, orchestrator error).
        // Fall through to the permanent failure path below.
        log("lyrics_cb", "auto_fallback_error", {
          jobId:   job.id,
          message: fallbackErr instanceof Error ? fallbackErr.message : "unknown",
        });
      }
    }

    // ── Final failure (max retries reached, non-400 error, or fallback error) ─
    await supabase
      .from("personalized_deliveries")
      .update({
        status:        "failed",
        error_message: message,
        updated_at:    new Date().toISOString(),
      })
      .eq("id", delivery.id);

    log("lyrics_cb", "personalized_delivery_failed", {
      jobId:      job.id,
      deliveryId: delivery.id,
      retryCount,
      kieCode,
    });
  } else {
    // ── Non-personalized job (single-song or batch) ───────────────────────────
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

