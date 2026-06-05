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

import {
  KIE_CODE_MESSAGES_ES,
  KIE_INVALID_RESPONSE_ES,
  KIE_NETWORK_ES,
  KieError,
  translateKieError,
} from "./kie-errors.ts";

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
