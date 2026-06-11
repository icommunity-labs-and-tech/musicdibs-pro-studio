// AUTO-BUNDLED — _shared deps inlined
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { decryptCredentials } from "./encryption.ts";
import {
  MailerLiteCampaignProvider,
  type CampaignAudience,
  type CampaignProviderResult,
  type CampaignReportsResult,
  type DraftCampaignInput,
} from "./MailerLiteCampaignProvider.ts";
import { ResendCampaignProvider } from "./ResendCampaignProvider.ts";

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





// (corsHeaders and json are defined above)

const EXPERIENCE_BASE_URL = "https://enterprise.musicdibs.com"
const AI_STUDIO = "Powered by AI Music Studio"

type AudienceType = "list" | "segment" | "automation"
type CampaignProviderType = "mailerlite" | "resend"

// ── Personalise lyricsGoal with {first_name} ────────────────────────────────
function personalizeGoal(template: string | null, firstName: string): string {
  const base = template ?? "Crea una canción especial";
  if (base.includes("{first_name}")) {
    return base.replace(/\{first_name\}/g, firstName);
  }
  return `${base} para ${firstName}`;
}

const PROVIDER_LABEL: Record<CampaignProviderType, string> = {
  mailerlite: "MailerLite",
  resend: "Resend",
}

/**
 * Provider-specific merge tags for personalization at send time.
 * - MailerLite v2 uses {$name} and {$unsubscribe}.
 * - Resend uses {{{FIRST_NAME|fallback}}} and {{{RESEND_UNSUBSCRIBE_URL}}}.
 */
const MERGE_TAGS: Record<CampaignProviderType, { name: string; unsubscribe: string }> = {
  mailerlite: { name: "{$name}", unsubscribe: "{$unsubscribe}" },
  resend: { name: "{{{FIRST_NAME|}}}", unsubscribe: "{{{RESEND_UNSUBSCRIBE_URL}}}" },
}

interface CampaignProvider {
  createDraftCampaign(input: DraftCampaignInput): Promise<CampaignProviderResult>
  updateDraftCampaign(id: string, input: DraftCampaignInput): Promise<CampaignProviderResult>
  getCampaignStatus(id: string): Promise<CampaignProviderResult>
  scheduleCampaign(id: string): Promise<CampaignProviderResult>
  getCampaignReports(id: string): Promise<CampaignReportsResult>
}

function makeProvider(type: CampaignProviderType, key: string): CampaignProvider {
  return type === "resend"
    ? new ResendCampaignProvider(key)
    : new MailerLiteCampaignProvider(key)
}

interface ExperienceBranding {
  logo_url?: string | null
  primary_color?: string | null
  cta_text?: string | null
  cta_url?: string | null
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

/**
 * Build the email HTML.
 *
 * - Greeting uses the provider's name merge tag, personalised at send time.
 * - emailBody is configured in Campaign Builder → Step Email
 *   (campaign_generation_configs). Falls back to generic copy when null.
 * - emailSubject is only used for the <title> tag; the real subject is set on
 *   the campaign object.
 */
function buildHtml(opts: {
  title: string
  playUrl: string
  coverUrl: string | null
  branding: ExperienceBranding
  emailBody: string | null
  emailSubject: string | null
  nameTag: string
  unsubscribeTag: string
}): string {
  const { title, playUrl, coverUrl, branding, emailBody, nameTag, unsubscribeTag } = opts
  const accent = branding.primary_color || "#C9973A"
  const ctaText = branding.cta_text || "Escuchar la canción"
  const safeTitle = escapeHtml(title)
  const safeBody = escapeHtml(
    emailBody?.trim() ||
      "Hemos preparado esta experiencia musical especialmente para ti. Esperamos que la disfrutes.",
  )
  const cover = coverUrl
    ? `<tr><td style="padding:0 0 24px;"><a href="${playUrl}"><img src="${coverUrl}" alt="${safeTitle}" width="560" style="display:block;width:100%;max-width:560px;border-radius:16px;" /></a></td></tr>`
    : ""
  const logo = branding.logo_url
    ? `<tr><td align="center" style="padding:0 0 24px;"><img src="${branding.logo_url}" alt="logo" height="40" style="display:block;height:40px;" /></td></tr>`
    : ""
  return `<!doctype html><html><head><meta charset="utf-8"><title>${safeTitle}</title></head>
<body style="margin:0;padding:0;background:#f6f6f8;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f6f8;padding:32px 0;">
<tr><td align="center">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:20px;padding:32px;font-family:Arial,Helvetica,sans-serif;color:#111827;">
${logo}
${cover}
<tr><td style="font-size:22px;font-weight:bold;padding:0 0 16px;">${safeTitle}</td></tr>
<tr><td style="font-size:15px;line-height:1.6;color:#374151;padding:0 0 4px;">Hola ${nameTag},</td></tr>
<tr><td style="font-size:15px;line-height:1.6;color:#374151;padding:0 0 24px;">${safeBody}</td></tr>
<tr><td style="padding:0 0 28px;"><a href="${playUrl}" style="display:inline-block;background:${accent};color:#ffffff;text-decoration:none;font-weight:bold;font-size:15px;padding:14px 28px;border-radius:999px;">${escapeHtml(ctaText)}</a></td></tr>
<tr><td style="font-size:12px;color:#9ca3af;border-top:1px solid #e5e7eb;padding:16px 0 0;">${AI_STUDIO} · <a href="${unsubscribeTag}" style="color:#9ca3af;">Darse de baja</a></td></tr>
</table>
</td></tr>
</table>
</body></html>`
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })

  try {
    const authHeader = req.headers.get("Authorization")
    if (!authHeader) return json({ error: "Missing authorization" }, 401)

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    )

    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""))
    if (authErr || !user) return json({ error: "Unauthorized" }, 401)

    const { data: profile } = await supabase
      .from("profiles")
      .select("tenant_id")
      .eq("id", user.id)
      .single()
    if (!profile?.tenant_id) return json({ error: "Profile not found" }, 404)

    const tenantId = profile.tenant_id as string
    const body = await req.json().catch(() => ({}))
    const action = body.action as string | undefined

    // ── Shared helpers ────────────────────────────────────────────────────────

    /** Resolve a specific provider's API key (must be currently connected). */
    async function getProviderKey(
      providerType: CampaignProviderType,
    ): Promise<{ key: string } | { error: string; status: number }> {
      const { data: conn } = await supabase
        .from("provider_connections")
        .select("encrypted_credentials, status")
        .eq("tenant_id", tenantId)
        .eq("provider_type", providerType)
        .maybeSingle()
      if (!conn || conn.status !== "connected") {
        return { error: `${PROVIDER_LABEL[providerType]} no está conectado.`, status: 400 }
      }
      const creds = decryptCredentials(conn.encrypted_credentials)
      const key = typeof creds?.apiKey === "string" ? creds.apiKey : ""
      if (!key) return { error: "Credenciales no disponibles.", status: 400 }
      return { key }
    }

    /** Resolve the single currently-connected campaign provider. */
    async function getActiveProvider(): Promise<
      { providerType: CampaignProviderType; key: string } | { error: string; status: number }
    > {
      const { data: conns } = await supabase
        .from("provider_connections")
        .select("provider_type, encrypted_credentials, status")
        .eq("tenant_id", tenantId)
        .eq("status", "connected")
      const conn = (conns ?? []).find(
        (c) => c.provider_type === "mailerlite" || c.provider_type === "resend",
      )
      if (!conn) {
        return {
          error: "No hay ningún proveedor de envío conectado. Conecta MailerLite o Resend en Ajustes → Proveedores.",
          status: 400,
        }
      }
      const creds = decryptCredentials(conn.encrypted_credentials)
      const key = typeof creds?.apiKey === "string" ? creds.apiKey : ""
      if (!key) return { error: "Credenciales no disponibles.", status: 400 }
      return { providerType: conn.provider_type as CampaignProviderType, key }
    }

    /**
     * Resolve the existing provider_campaign row for an experience page and the
     * API key of the provider it belongs to.
     */
    async function resolveProviderCampaign(experiencePageId: string) {
      const { data: pc } = await supabase
        .from("provider_campaigns")
        .select("id, provider_type, provider_campaign_id, provider_campaign_name, provider_campaign_status")
        .eq("experience_page_id", experiencePageId)
        .eq("tenant_id", tenantId)
        .maybeSingle()
      if (!pc) {
        return { error: "No se encontró campaña para esta experiencia. Crea el borrador primero.", status: 404 }
      }
      const providerType = (pc.provider_type as CampaignProviderType) ?? "mailerlite"
      const keyRes = await getProviderKey(providerType)
      if ("error" in keyRes) return keyRes
      return { pc, providerType, key: keyRes.key }
    }

    /**
     * Fetch email_subject + email_body from campaign_generation_configs
     * given a campaign_id (linked from experience_pages).
     */
    async function fetchEmailConfig(campaignId: string) {
      const { data: cfg } = await supabase
        .from("campaign_generation_configs")
        .select("email_subject, email_body")
        .eq("campaign_id", campaignId)
        .maybeSingle()
      return {
        emailSubject: cfg?.email_subject ?? null,
        emailBody: cfg?.email_body ?? null,
      }
    }

    // ── create_draft ──────────────────────────────────────────────────────────
    if (action === "create_draft") {
      const experiencePageId = body.experience_page_id as string | undefined
      const audienceExternalId = body.audience_external_id as string | undefined
      const audienceType = body.audience_type as AudienceType | undefined
      const audienceName = (body.audience_name as string | undefined) ?? ""

      if (!experiencePageId) return json({ error: "experience_page_id requerido" }, 400)
      if (!audienceExternalId || !audienceType) {
        return json({ error: "Selecciona una audiencia." }, 400)
      }
      if (audienceType === "automation") {
        return json(
          { error: "Las automatizaciones no son compatibles como destino de campaña. Elige una lista o un segmento." },
          400,
        )
      }

      // Resolve the active provider (MailerLite or Resend).
      const activeRes = await getActiveProvider()
      if ("error" in activeRes) return json({ error: activeRes.error }, activeRes.status)
      const { providerType, key } = activeRes

      // Sender configuration (required).
      const { data: settings } = await supabase
        .from("tenant_settings")
        .select("sender_name, sender_email, reply_to_email")
        .eq("tenant_id", tenantId)
        .maybeSingle()
      const senderName = settings?.sender_name?.trim() ?? ""
      const senderEmail = settings?.sender_email?.trim() ?? ""
      if (!senderName || !senderEmail) {
        return json(
          { error: "Configura el remitente antes de crear la campaña.", code: "sender_missing" },
          400,
        )
      }

      // Experience page must be published and belong to tenant.
      const { data: exp } = await supabase
        .from("experience_pages")
        .select("id, tenant_id, campaign_id, title, status, experience_token, branding, audio_asset_id, cover_asset_id")
        .eq("id", experiencePageId)
        .eq("tenant_id", tenantId)
        .maybeSingle()
      if (!exp) return json({ error: "Experiencia no encontrada." }, 404)
      if (exp.status !== "published") {
        return json({ error: "Publica la experiencia antes de crear la campaña." }, 400)
      }

      // Cover image (best-effort).
      let coverUrl: string | null = null
      if (exp.cover_asset_id) {
        const { data: cover } = await supabase
          .from("generation_assets")
          .select("public_url")
          .eq("id", exp.cover_asset_id)
          .maybeSingle()
        coverUrl = cover?.public_url ?? null
      }
      if (!coverUrl && exp.audio_asset_id) {
        const { data: audio } = await supabase
          .from("generation_assets")
          .select("metadata")
          .eq("id", exp.audio_asset_id)
          .maybeSingle()
        const coverPath = (audio?.metadata as Record<string, unknown> | null)?.["cover_path"]
        if (typeof coverPath === "string") {
          coverUrl = `${Deno.env.get("SUPABASE_URL")}/storage/v1/object/public/campaign-audio/${coverPath}`
        }
      }

      // Email content from campaign_generation_configs.
      const { emailSubject, emailBody } = await fetchEmailConfig(exp.campaign_id)

      const playUrl = `${EXPERIENCE_BASE_URL}/play/${exp.experience_token}`
      const branding = (exp.branding as ExperienceBranding | null) ?? {}
      const tags = MERGE_TAGS[providerType]
      const html = buildHtml({
        title: exp.title,
        playUrl,
        coverUrl,
        branding,
        emailBody,
        emailSubject,
        nameTag: tags.name,
        unsubscribeTag: tags.unsubscribe,
      })

      const subject = emailSubject?.trim() || exp.title
      const draft: DraftCampaignInput = {
        name: `${exp.title} — Music Experience`,
        subject,
        fromName: senderName,
        fromEmail: senderEmail,
        replyTo: settings?.reply_to_email?.trim() || null,
        html,
        audience: {
          externalId: audienceExternalId,
          audienceType: audienceType === "segment" ? "segment" : "list",
        } satisfies CampaignAudience,
      }

      const provider = makeProvider(providerType, key)
      const result = await provider.createDraftCampaign(draft)
      if (!result.ok || !result.campaignId) {
        return json({ error: result.error ?? `No se pudo crear el borrador en ${PROVIDER_LABEL[providerType]}.` }, 502)
      }

      // Remove any previous provider_campaigns rows for this experience. When a
      // tenant switches sending provider, the old draft lives in the previous
      // provider's account and is no longer reachable — replace it with the new
      // one so the UI never points at a disconnected provider.
      await supabase
        .from("provider_campaigns")
        .delete()
        .eq("experience_page_id", experiencePageId)
        .eq("tenant_id", tenantId)

      const { data: row, error: insErr } = await supabase
        .from("provider_campaigns")
        .insert({
          tenant_id: tenantId,
          experience_page_id: experiencePageId,
          provider_type: providerType,
          provider_campaign_id: result.campaignId,
          provider_campaign_name: result.campaignName || draft.name,
          provider_campaign_status: result.campaignStatus ?? "draft",
        })
        .select("*")
        .single()
      if (insErr) throw insErr

      return json({ success: true, campaign: row, audience_name: audienceName })
    }

    // ── update_draft ──────────────────────────────────────────────────────────
    // Regenerates the email HTML with the latest email_body/subject and
    // pushes the update to the provider. Safe to call multiple times.
    if (action === "update_draft") {
      const experiencePageId = body.experience_page_id as string | undefined
      if (!experiencePageId) return json({ error: "experience_page_id requerido" }, 400)

      const resolved = await resolveProviderCampaign(experiencePageId)
      if ("error" in resolved) return json({ error: resolved.error }, resolved.status)
      const { pc, providerType, key } = resolved

      if (pc.provider_campaign_status === "sent") {
        return json({ error: "No se puede actualizar una campaña ya enviada." }, 422)
      }

      // Re-fetch sender, experience page, cover and email config.
      const [settingsRes, expRes] = await Promise.all([
        supabase.from("tenant_settings").select("sender_name, sender_email, reply_to_email").eq("tenant_id", tenantId).maybeSingle(),
        supabase.from("experience_pages").select("campaign_id, title, experience_token, branding, audio_asset_id, cover_asset_id").eq("id", experiencePageId).maybeSingle(),
      ])

      const settings = settingsRes.data
      const exp = expRes.data
      if (!exp) return json({ error: "Experiencia no encontrada." }, 404)

      const senderName = settings?.sender_name?.trim() ?? ""
      const senderEmail = settings?.sender_email?.trim() ?? ""
      if (!senderName || !senderEmail) {
        return json({ error: "Configura el remitente antes de actualizar.", code: "sender_missing" }, 400)
      }

      let coverUrl: string | null = null
      if (exp.cover_asset_id) {
        const { data: cover } = await supabase.from("generation_assets").select("public_url").eq("id", exp.cover_asset_id).maybeSingle()
        coverUrl = cover?.public_url ?? null
      }

      const { emailSubject, emailBody } = await fetchEmailConfig(exp.campaign_id)

      const playUrl = `${EXPERIENCE_BASE_URL}/play/${exp.experience_token}`
      const branding = (exp.branding as ExperienceBranding | null) ?? {}
      const tags = MERGE_TAGS[providerType]
      const html = buildHtml({
        title: exp.title,
        playUrl,
        coverUrl,
        branding,
        emailBody,
        emailSubject,
        nameTag: tags.name,
        unsubscribeTag: tags.unsubscribe,
      })
      const subject = emailSubject?.trim() || exp.title

      const draft: DraftCampaignInput = {
        name: `${exp.title} — Music Experience`,
        subject,
        fromName: senderName,
        fromEmail: senderEmail,
        replyTo: settings?.reply_to_email?.trim() || null,
        html,
        // Audience is fixed at creation; updateDraftCampaign ignores it.
        audience: { externalId: "", audienceType: "list" },
      }

      const provider = makeProvider(providerType, key)
      const result = await provider.updateDraftCampaign(pc.provider_campaign_id, draft)
      if (!result.ok) {
        return json({ error: result.error ?? `No se pudo actualizar el borrador en ${PROVIDER_LABEL[providerType]}.` }, 502)
      }

      // Touch updated_at so frontend can detect the change.
      await supabase.from("provider_campaigns").update({ updated_at: new Date().toISOString() }).eq("id", pc.id)

      return json({ success: true, message: `Borrador actualizado en ${PROVIDER_LABEL[providerType]}.` })
    }

    // ── send_now ──────────────────────────────────────────────────────────────
    // Sends the draft campaign immediately. Option A: user sends from MEC
    // without opening the provider's dashboard.
    if (action === "send_now") {
      const experiencePageId = body.experience_page_id as string | undefined
      if (!experiencePageId) return json({ error: "experience_page_id requerido" }, 400)

      const resolved = await resolveProviderCampaign(experiencePageId)
      if ("error" in resolved) return json({ error: resolved.error }, resolved.status)
      const { pc, providerType, key } = resolved

      if (pc.provider_campaign_status === "sent") {
        return json({ error: "Esta campaña ya fue enviada." }, 422)
      }

      const provider = makeProvider(providerType, key)
      const sendRes = await provider.scheduleCampaign(pc.provider_campaign_id)
      if (!sendRes.ok) {
        return json({ error: sendRes.error ?? `${PROVIDER_LABEL[providerType]} rechazó el envío.` }, 502)
      }

      const now = new Date().toISOString()

      // Get campaign_id from experience_page for campaigns table update.
      const { data: exp } = await supabase
        .from("experience_pages")
        .select("campaign_id, title")
        .eq("id", experiencePageId)
        .single()

      // Update provider_campaigns status.
      await supabase.from("provider_campaigns")
        .update({ provider_campaign_status: "sent", updated_at: now })
        .eq("id", pc.id)

      // Sync campaign status (best-effort — don't throw if it fails).
      if (exp?.campaign_id) {
        await supabase.from("campaigns")
          .update({ status: "sent", sent_at: now })
          .eq("id", exp.campaign_id)
          .eq("tenant_id", tenantId)

        // Notification (non-critical — ignore failures).
        try {
          await supabase.from("notifications").insert({
            tenant_id: tenantId,
            type: "campaign_sent",
            title: "Campaña enviada",
            body: `"${exp.title}" se está enviando a través de ${PROVIDER_LABEL[providerType]}.`,
            link: `/campaigns/${exp.campaign_id}`,
          })
        } catch (_e) { /* non-critical */ }

        // Webhook (fire-and-forget).
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!
        const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
        fetch(`${supabaseUrl}/functions/v1/webhook-dispatcher`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${serviceKey}` },
          body: JSON.stringify({
            tenant_id: tenantId,
            event: "campaign.sent",
            payload: {
              campaign_id: exp.campaign_id,
              campaign_name: exp.title,
              provider_type: providerType,
              provider_campaign_id: pc.provider_campaign_id,
              sent_at: now,
              source: "mec_send_now",
            },
          }),
        }).catch((e: unknown) => console.warn("[send_now] webhook fire failed:", e))
      }

      return json({ success: true, sent_at: now })
    }


    // ── send_personalized ───────────────────────────────────────────────────────────
    // Sends N individual transactional emails via Resend, one per ready delivery.
    // Each email contains the unique Experience Page URL for that contact.
    // Requires: campaign_id, audience_id
    // Campaign must be in status 'ready_to_send'.
    if (action === "send_personalized") {
      const campaignId  = body.campaign_id  as string | undefined
      const audienceId  = body.audience_id  as string | undefined

      if (!campaignId)  return json({ error: "campaign_id requerido" }, 400)
      if (!audienceId)  return json({ error: "audience_id requerido" }, 400)

      const { data: campaign } = await supabase
        .from("campaigns")
        .select("id, name, status")
        .eq("id", campaignId)
        .eq("tenant_id", tenantId)
        .maybeSingle()
      if (!campaign) return json({ error: "Campa\u00f1a no encontrada" }, 404)
      // Permitimos relanzar el env\u00edo cuando la campa\u00f1a ya est\u00e1 'sent': puede
      // haber entregas que pasaron a 'ready' despu\u00e9s del primer env\u00edo (p.ej.
      // generaci\u00f3n de fallback que termin\u00f3 tarde) y se quedar\u00edan sin enviar.
      if (campaign.status !== "ready_to_send" && campaign.status !== "sent") {
        return json({ error: `La campa\u00f1a no est\u00e1 lista para enviar (estado actual: ${campaign.status})` }, 400)
      }

      const { data: deliveries } = await supabase
        .from("personalized_deliveries")
        .select("id, external_contact_id, first_name, experience_token, experience_page_id")
        .eq("campaign_id", campaignId)
        .eq("tenant_id", tenantId)
        .eq("status", "ready")
      if (!deliveries || deliveries.length === 0) {
        return json({ error: "No hay entregas pendientes de env\u00edo en estado 'ready'." }, 400)
      }

      const { data: audience } = await supabase
        .from("provider_audiences")
        .select("external_id, provider_connection_id")
        .eq("id", audienceId)
        .eq("tenant_id", tenantId)
        .maybeSingle()
      if (!audience) return json({ error: "Audiencia no encontrada" }, 404)

      const { data: audienceConn } = await supabase
        .from("provider_connections")
        .select("provider_type, encrypted_credentials, status")
        .eq("id", audience.provider_connection_id)
        .eq("tenant_id", tenantId)
        .maybeSingle()
      if (!audienceConn || audienceConn.status !== "connected") {
        return json({ error: "Proveedor de audiencia no conectado" }, 400)
      }

      // ── Canal WhatsApp/SMS (Twilio) ─────────────────────────────────────
      // Twilio es un canal aditivo: cuando la audiencia de la campaña apunta
      // a una conexión Twilio, el envío personalizado se hace por
      // WhatsApp/SMS (texto + enlace a la Experience Page) en vez de email.
      if (audienceConn.provider_type === "twilio") {
        const twilioCreds = decryptCredentials(audienceConn.encrypted_credentials)
        const accountSid   = typeof twilioCreds?.accountSid   === "string" ? twilioCreds.accountSid   : ""
        const authToken    = typeof twilioCreds?.authToken    === "string" ? twilioCreds.authToken    : ""
        const whatsappFrom = typeof twilioCreds?.whatsappFrom === "string" ? twilioCreds.whatsappFrom : ""
        const smsFrom      = typeof twilioCreds?.smsFrom      === "string" ? twilioCreds.smsFrom      : ""
        if (!accountSid || !authToken) {
          return json({ error: "Credenciales de Twilio no disponibles" }, 400)
        }

        const { data: genConfig } = await supabase
          .from("campaign_generation_configs")
          .select("delivery_channel")
          .eq("campaign_id", campaignId)
          .maybeSingle()
        const channel: "whatsapp" | "sms" = genConfig?.delivery_channel === "sms" ? "sms" : "whatsapp"

        const fromNumber = channel === "whatsapp" ? whatsappFrom : smsFrom
        if (!fromNumber) {
          return json({
            error: `Configura el número de origen de ${channel === "whatsapp" ? "WhatsApp" : "SMS"} en Ajustes → Proveedores → Twilio`,
          }, 400)
        }

        const contactIds = deliveries.map((d) => d.external_contact_id).filter(Boolean)
        const { data: contactRows } = await supabase
          .from("contacts")
          .select("id, phone")
          .in("id", contactIds)
          .eq("tenant_id", tenantId)
        const phoneMap = new Map<string, string>()
        for (const c of contactRows ?? []) {
          if (c.phone) phoneMap.set(String(c.id), String(c.phone))
        }

        const { emailSubject, emailBody } = await fetchEmailConfig(campaignId)
        const campaignTitle = campaign.name || "Tu canción personalizada"
        const plainBody = (emailBody || "")
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim()
        const messageTitle = emailSubject?.trim() || campaignTitle

        const basicAuth = btoa(`${accountSid}:${authToken}`)
        const fromAddr = channel === "whatsapp"
          ? (fromNumber.startsWith("whatsapp:") ? fromNumber : `whatsapp:${fromNumber}`)
          : fromNumber
        const toPrefix = channel === "whatsapp" ? "whatsapp:" : ""

        let sentTw = 0, failedTw = 0
        const nowTw = new Date().toISOString()

        for (const delivery of deliveries) {
          const phone = phoneMap.get(delivery.external_contact_id)
          if (!phone) {
            await supabase.from("personalized_deliveries").update({
              status: "failed", error_message: "Teléfono no disponible para este contacto", updated_at: nowTw,
            }).eq("id", delivery.id)
            failedTw++; continue
          }

          const firstName = delivery.first_name || "amigo"
          const playUrl = `${EXPERIENCE_BASE_URL}/play/${delivery.experience_token}`
          const text = plainBody
            ? `¡Hola ${firstName}! ${messageTitle}\n\n${plainBody}\n\n${playUrl}`
            : `¡Hola ${firstName}! 🎵 ${messageTitle} ya está lista para ti:\n${playUrl}`

          const normalizedPhone = phone.replace(/^whatsapp:/, "").trim()
          const toAddr = `${toPrefix}${normalizedPhone.startsWith("+") ? normalizedPhone : `+${normalizedPhone}`}`

          const params = new URLSearchParams({ From: fromAddr, To: toAddr, Body: text })
          const sendRes = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
            method: "POST",
            headers: { Authorization: `Basic ${basicAuth}`, "Content-Type": "application/x-www-form-urlencoded" },
            body: params,
          })

          if (sendRes.ok) {
            await supabase.from("personalized_deliveries").update({
              status: "sent", email_sent_at: new Date().toISOString(), updated_at: new Date().toISOString(),
            }).eq("id", delivery.id)
            sentTw++
          } else {
            const errBody = await sendRes.json().catch(() => ({}))
            const errMsg = typeof errBody?.message === "string" ? errBody.message : `Twilio error ${sendRes.status}`
            await supabase.from("personalized_deliveries").update({
              status: "failed", error_message: errMsg, updated_at: new Date().toISOString(),
            }).eq("id", delivery.id)
            console.error(`[send_personalized] Twilio ${sendRes.status}:`, errMsg)
            failedTw++
          }
        }

        const campaignUpdateTw: Record<string, unknown> = { status: "sent", updated_at: nowTw }
        if (campaign.status !== "sent") campaignUpdateTw.sent_at = nowTw
        await supabase.from("campaigns").update(campaignUpdateTw).eq("id", campaignId)

        try {
          await supabase.from("notifications").insert({
            tenant_id: tenantId, type: "campaign_sent",
            title: campaign.status === "sent" ? "Envío de pendientes completado" : "Campaña personalizada enviada",
            body: `"${campaignTitle}" — ${sentTw} mensajes ${channel === "whatsapp" ? "WhatsApp" : "SMS"} enviados${failedTw > 0 ? `, ${failedTw} fallidos` : ""}.`,
            link: `/campaigns/${campaignId}`,
          })
        } catch (_e) { /* non-critical */ }

        return json({ ok: true, sent: sentTw, failed: failedTw, total: deliveries.length, sent_at: nowTw, channel })
      }

      // ── Canal WhatsApp Business (Cloud API de Meta) ─────────────────────
      // Cuando la audiencia apunta a una conexión 'whatsapp', el envío se hace
      // con plantillas aprobadas vía graph.facebook.com. La plantilla debe
      // tener el cuerpo con dos parámetros: {{1}} nombre y {{2}} enlace.
      if (audienceConn.provider_type === "whatsapp") {
        const waCreds = decryptCredentials(audienceConn.encrypted_credentials)
        const accessToken   = typeof waCreds?.accessToken      === "string" ? waCreds.accessToken      : ""
        const phoneNumberId = typeof waCreds?.phoneNumberId    === "string" ? waCreds.phoneNumberId    : ""
        const templateName  = typeof waCreds?.templateName     === "string" ? waCreds.templateName     : ""
        const templateLang  = typeof waCreds?.templateLanguage === "string" ? waCreds.templateLanguage : "es"
        if (!accessToken || !phoneNumberId) {
          return json({ error: "Credenciales de WhatsApp Business no disponibles" }, 400)
        }
        if (!templateName) {
          return json({
            error: "Configura el nombre de la plantilla de WhatsApp aprobada en Ajustes → Proveedores → WhatsApp",
          }, 400)
        }

        const contactIds = deliveries.map((d) => d.external_contact_id).filter(Boolean)
        const { data: contactRows } = await supabase
          .from("contacts")
          .select("id, phone")
          .in("id", contactIds)
          .eq("tenant_id", tenantId)
        const phoneMap = new Map<string, string>()
        for (const c of contactRows ?? []) {
          if (c.phone) phoneMap.set(String(c.id), String(c.phone))
        }

        const campaignTitle = campaign.name || "Tu canción personalizada"
        const graphUrl = `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`

        let sentWa = 0, failedWa = 0
        const nowWa = new Date().toISOString()

        for (const delivery of deliveries) {
          const phone = phoneMap.get(delivery.external_contact_id)
          if (!phone) {
            await supabase.from("personalized_deliveries").update({
              status: "failed", error_message: "Teléfono no disponible para este contacto", updated_at: nowWa,
            }).eq("id", delivery.id)
            failedWa++; continue
          }

          const firstName = delivery.first_name || "amigo"
          const playUrl = `${EXPERIENCE_BASE_URL}/play/${delivery.experience_token}`
          // WhatsApp Cloud API espera el número en formato internacional (dígitos).
          const toNumber = phone.replace(/^whatsapp:/, "").replace(/[^0-9]/g, "")

          const payload = {
            messaging_product: "whatsapp",
            to: toNumber,
            type: "template",
            template: {
              name: templateName,
              language: { code: templateLang },
              components: [
                {
                  type: "body",
                  parameters: [
                    { type: "text", text: firstName },
                    { type: "text", text: playUrl },
                  ],
                },
              ],
            },
          }

          const sendRes = await fetch(graphUrl, {
            method: "POST",
            headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })

          if (sendRes.ok) {
            await supabase.from("personalized_deliveries").update({
              status: "sent", email_sent_at: new Date().toISOString(), updated_at: new Date().toISOString(),
            }).eq("id", delivery.id)
            sentWa++
          } else {
            const errBody = await sendRes.json().catch(() => ({}))
            const errMsg = typeof errBody?.error?.message === "string" ? errBody.error.message : `WhatsApp error ${sendRes.status}`
            await supabase.from("personalized_deliveries").update({
              status: "failed", error_message: errMsg, updated_at: new Date().toISOString(),
            }).eq("id", delivery.id)
            console.error(`[send_personalized] WhatsApp ${sendRes.status}:`, errMsg)
            failedWa++
          }
        }

        const campaignUpdateWa: Record<string, unknown> = { status: "sent", updated_at: nowWa }
        if (campaign.status !== "sent") campaignUpdateWa.sent_at = nowWa
        await supabase.from("campaigns").update(campaignUpdateWa).eq("id", campaignId)

        try {
          await supabase.from("notifications").insert({
            tenant_id: tenantId, type: "campaign_sent",
            title: campaign.status === "sent" ? "Envío de pendientes completado" : "Campaña personalizada enviada",
            body: `"${campaignTitle}" — ${sentWa} mensajes WhatsApp enviados${failedWa > 0 ? `, ${failedWa} fallidos` : ""}.`,
            link: `/campaigns/${campaignId}`,
          })
        } catch (_e) { /* non-critical */ }

        return json({ ok: true, sent: sentWa, failed: failedWa, total: deliveries.length, sent_at: nowWa, channel: "whatsapp_cloud" })
      }


      const audienceCreds = decryptCredentials(audienceConn.encrypted_credentials)
      const audienceApiKey = typeof audienceCreds?.apiKey === "string" ? audienceCreds.apiKey : ""
      if (!audienceApiKey) return json({ error: "API key de audiencia no disponible" }, 400)

      const contactEmailMap = new Map<string, string>()
      if (audienceConn.provider_type === "mailerlite") {
        const mlUrl = `https://connect.mailerlite.com/api/groups/${encodeURIComponent(audience.external_id)}/subscribers?limit=200&filter[status]=active`
        const mlRes = await fetch(mlUrl, { headers: { Authorization: `Bearer ${audienceApiKey}`, "Content-Type": "application/json" } })
        if (mlRes.ok) {
          const mlBody = await mlRes.json()
          for (const r of (Array.isArray(mlBody?.data) ? mlBody.data : [])) {
            if (r.id && r.email) contactEmailMap.set(String(r.id), String(r.email))
          }
        }
      } else if (audienceConn.provider_type === "resend") {
        const rsUrl = `https://api.resend.com/audiences/${encodeURIComponent(audience.external_id)}/contacts`
        const rsRes = await fetch(rsUrl, { headers: { Authorization: `Bearer ${audienceApiKey}`, "Content-Type": "application/json" } })
        if (rsRes.ok) {
          const rsBody = await rsRes.json()
          for (const r of (Array.isArray(rsBody?.data) ? rsBody.data : [])) {
            if (r.id && r.email) contactEmailMap.set(String(r.id), String(r.email))
          }
        }
      }

      if (contactEmailMap.size === 0) return json({ error: "No se pudieron obtener los emails de la audiencia" }, 400)

      const resendKeyRes = await getProviderKey("resend")
      if ("error" in resendKeyRes) return json({ error: "Resend debe estar conectado para el env\u00edo personalizado. " + resendKeyRes.error }, 400)
      const resendKey = resendKeyRes.key

      const { data: settings } = await supabase
        .from("tenant_settings")
        .select("sender_name, sender_email, reply_to_email")
        .eq("tenant_id", tenantId)
        .maybeSingle()
      const senderName  = settings?.sender_name?.trim()  ?? ""
      const senderEmail = settings?.sender_email?.trim() ?? ""
      if (!senderName || !senderEmail) return json({ error: "Configura el remitente antes de enviar.", code: "sender_missing" }, 400)

      const { emailSubject, emailBody } = await fetchEmailConfig(campaignId)
      const branding = {} as ExperienceBranding
      const campaignTitle = campaign.name || "Tu canci\u00f3n personalizada"
      const from = senderName ? `${senderName} <${senderEmail}>` : senderEmail

      let sent = 0, failed = 0
      const now = new Date().toISOString()

      for (const delivery of deliveries) {
        const toEmail = contactEmailMap.get(delivery.external_contact_id)
        if (!toEmail) {
          await supabase.from("personalized_deliveries").update({ status: "failed", error_message: "Email no encontrado en la audiencia", updated_at: now }).eq("id", delivery.id)
          failed++; continue
        }

        const firstName = delivery.first_name || "amigo"
        const playUrl   = `${EXPERIENCE_BASE_URL}/play/${delivery.experience_token}`
        const subject   = emailSubject?.trim() || `${campaignTitle} — Canci\u00f3n personalizada para ti`
        const html = buildHtml({ title: campaignTitle, playUrl, coverUrl: null, branding, emailBody, emailSubject, nameTag: firstName, unsubscribeTag: "#" })
        const sendPayload: Record<string, unknown> = { from, to: [toEmail], subject, html }
        if (settings?.reply_to_email?.trim()) sendPayload.reply_to = settings.reply_to_email.trim()

        const sendRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
          body: JSON.stringify(sendPayload),
        })

        if (sendRes.ok) {
          await supabase.from("personalized_deliveries").update({ status: "sent", email_sent_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", delivery.id)
          sent++
        } else {
          const errBody = await sendRes.json().catch(() => ({}))
          const errMsg = typeof errBody?.message === "string" ? errBody.message : `Resend error ${sendRes.status}`
          await supabase.from("personalized_deliveries").update({ status: "failed", error_message: errMsg, updated_at: new Date().toISOString() }).eq("id", delivery.id)
          console.error(`[send_personalized] Resend ${sendRes.status}:`, errMsg)
          failed++
        }
      }

      const campaignUpdate: Record<string, unknown> = { status: "sent", updated_at: now }
      if (campaign.status !== "sent") campaignUpdate.sent_at = now
      await supabase.from("campaigns").update(campaignUpdate).eq("id", campaignId)

      try {
        await supabase.from("notifications").insert({
          tenant_id: tenantId, type: "campaign_sent",
          title: campaign.status === "sent" ? "Env\u00edo de pendientes completado" : "Campa\u00f1a personalizada enviada",
          body: `"${campaignTitle}" \u2014 ${sent} emails enviados${failed > 0 ? `, ${failed} fallidos` : ""}.`,
          link: `/campaigns/${campaignId}`,
        })
      } catch (_e) { /* non-critical */ }

      return json({ ok: true, sent, failed, total: deliveries.length, sent_at: now })
    }

    // ── sync ──────────────────────────────────────────────────────────────────
    // Fetches the provider campaign status (+ stats where supported) and updates
    // the DB. Used by the "Sincronizar stats" button and status polling.
    if (action === "sync") {
      const experiencePageId = body.experience_page_id as string | undefined
      if (!experiencePageId) return json({ error: "experience_page_id requerido" }, 400)

      const resolved = await resolveProviderCampaign(experiencePageId)
      if ("error" in resolved) return json({ error: resolved.error }, resolved.status)
      const { pc, providerType, key } = resolved

      const provider = makeProvider(providerType, key)

      // 1. Get current provider campaign status.
      const statusResult = await provider.getCampaignStatus(pc.provider_campaign_id)
      if (!statusResult.ok) {
        return json({ error: statusResult.error ?? `No se pudo contactar ${PROVIDER_LABEL[providerType]}.` }, 502)
      }

      const remoteStatus = statusResult.campaignStatus ?? "draft"
      const statusChanged = remoteStatus !== pc.provider_campaign_status

      // Persist any status change (catches Option B: user sent from provider).
      if (statusChanged) {
        await supabase.from("provider_campaigns")
          .update({ provider_campaign_status: remoteStatus, updated_at: new Date().toISOString() })
          .eq("id", pc.id)

        if (remoteStatus === "sent" && pc.provider_campaign_status === "draft") {
          const { data: exp } = await supabase
            .from("experience_pages").select("campaign_id, title").eq("id", experiencePageId).single()

          if (exp?.campaign_id) {
            await supabase.from("campaigns")
              .update({ status: "sent", sent_at: new Date().toISOString() })
              .eq("id", exp.campaign_id)
              .eq("tenant_id", tenantId)
          }
        }
      }

      // 2. Fetch stats (only meaningful once sent, and only where supported).
      const statsResult = await provider.getCampaignReports(pc.provider_campaign_id)

      let statsUpserted = false
      if (statsResult.ok && statsResult.stats) {
        const s = statsResult.stats
        const { data: exp } = await supabase
          .from("experience_pages").select("campaign_id").eq("id", experiencePageId).single()

        if (exp?.campaign_id) {
          await supabase.from("campaign_stats").upsert({
            campaign_id: exp.campaign_id,
            tenant_id: tenantId,
            emails_sent: s.sent,
            emails_opened: s.opens,
            emails_clicked: s.clicks,
            unsubscribes: s.unsubscribes,
            cost_actual: s.sent * 0.19,
            updated_at: new Date().toISOString(),
          }, { onConflict: "campaign_id" })
          statsUpserted = true
        }
      }

      return json({
        success: true,
        provider_campaign_status: remoteStatus,
        status_changed: statusChanged,
        stats: statsResult.stats ?? null,
        stats_upserted: statsUpserted,
      })
    }

    // ── sync_status (legacy — kept for backwards compat) ──────────────────────
    if (action === "sync_status") {
      const id = body.provider_campaign_row_id as string | undefined
      if (!id) return json({ error: "provider_campaign_row_id requerido" }, 400)

      const { data: row } = await supabase
        .from("provider_campaigns")
        .select("id, tenant_id, provider_campaign_id, provider_type, experience_page_id")
        .eq("id", id)
        .eq("tenant_id", tenantId)
        .maybeSingle()
      if (!row) return json({ error: "Campaña no encontrada." }, 404)

      const providerType = (row.provider_type as CampaignProviderType) ?? "mailerlite"
      const keyRes = await getProviderKey(providerType)
      if ("error" in keyRes) return json({ error: keyRes.error }, keyRes.status)

      const provider = makeProvider(providerType, keyRes.key)
      const result = await provider.getCampaignStatus(row.provider_campaign_id)
      if (!result.ok) {
        return json({ error: result.error ?? "No se pudo sincronizar el estado." }, 502)
      }

      const { data: updated, error: updErr } = await supabase
        .from("provider_campaigns")
        .update({ provider_campaign_status: result.campaignStatus ?? "draft", provider_campaign_name: result.campaignName || row.provider_campaign_id })
        .eq("id", row.id)
        .select("*")
        .single()
      if (updErr) throw updErr

      return json({ success: true, campaign: updated })
    }

    // ── retry_delivery ─────────────────────────────────────────────────────
    // MAX_RETRIES (3) shared with auto-fallback logic in lyrics-callback.
    // Manual retries count toward the same limit so the operator can't
    // bypass the cap by clicking the button repeatedly.
    if (action === "retry_delivery") {
      const MAX_RETRIES = 3;
      const deliveryId = body.delivery_id as string | undefined;
      const retryCampaignId = body.campaign_id as string | undefined;
      if (!deliveryId || !retryCampaignId) {
        return json({ error: "delivery_id y campaign_id requeridos" }, 400);
      }

      // Load delivery (tenant-scoped) — include retry_count
      const { data: delivery } = await supabase
        .from("personalized_deliveries")
        .select("id, campaign_id, tenant_id, generation_job_id, external_contact_id, first_name, status, retry_count")
        .eq("id", deliveryId)
        .eq("tenant_id", tenantId)
        .maybeSingle();
      if (!delivery) return json({ error: "Delivery no encontrado" }, 404);
      if (delivery.status !== "failed") {
        return json({ error: `Solo se pueden reintentar deliveries fallidos (estado actual: ${delivery.status})` }, 409);
      }

      // Block manual retry once the cap is reached
      const currentRetryCount: number = delivery.retry_count ?? 0;
      if (currentRetryCount >= MAX_RETRIES) {
        return json({
          error: `Se ha alcanzado el máximo de reintentos (${MAX_RETRIES}). Este contacto no puede recibir la canción personalizada.`,
          retry_count: currentRetryCount,
        }, 409);
      }

      // Load generation config for this campaign
      const retryConfig = await loadConfig(supabase, retryCampaignId);

      // Create a new generation job with generation_batch_id = null (retry job)
      const { data: newJob, error: jobErr } = await supabase
        .from("generation_jobs")
        .insert({
          tenant_id:           tenantId,
          campaign_id:         retryCampaignId,
          generation_batch_id: null,          // ← not part of original batch
          status:              "processing",
          provider:            "ai-music-studio",
          generation_round:    1,
          lyrics_status:       "pending",
          music_status:        "pending",
        })
        .select("id, campaign_id, tenant_id, generation_batch_id, started_at")
        .single();
      if (jobErr) throw jobErr;

      // Reset delivery to generating — increment retry_count, clear fallback flag
      // (manual retry always attempts the personalised version again)
      await supabase
        .from("personalized_deliveries")
        .update({
          generation_job_id:      newJob.id,
          status:                 "generating",
          retry_count:            currentRetryCount + 1,
          is_fallback_generation: false,
          experience_token:       null,
          experience_page_id:     null,
          error_message:          null,
          email_sent_at:          null,
          updated_at:             new Date().toISOString(),
        })
        .eq("id", deliveryId);

      // Personalise lyrics goal for this contact
      const personalizedConfig = {
        ...retryConfig,
        lyricsGoal: personalizeGoal(retryConfig.lyricsGoal, delivery.first_name ?? ""),
      };

      // Fire KIE lyrics pipeline (async — returns immediately, callback handles rest)
      await startLyricsForJob(supabase, newJob, personalizedConfig);

      console.log("[retry_delivery] Started retry job", {
        deliveryId,
        newJobId: newJob.id,
        firstName: delivery.first_name,
        retryCount: currentRetryCount + 1,
      });
      return json({ success: true, job_id: newJob.id, retry_count: currentRetryCount + 1 });
    }

    return json({ error: `Unknown action: ${action}` }, 400)
  } catch (err) {
    console.error("manage-provider-campaign error:", err instanceof Error ? err.message : "unknown")
    return json({ error: err instanceof Error ? err.message : String(err) }, 500)
  }
})

