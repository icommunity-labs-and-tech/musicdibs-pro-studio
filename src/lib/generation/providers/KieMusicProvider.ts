// ============================================================================
// KieMusicProvider — music half of the GenerationProvider contract.
//
// Endpoint: POST {baseUrl}/api/v1/generate (KIE Suno API, custom mode).
// Always customMode = true because lyrics are generated first and passed in as
// the prompt. Callback: { code, data: { callbackType, task_id, data: [...] } }.
//
// Voice / language / mood have no dedicated engine fields, so they are folded
// into the "style" instruction here — isolated provider mapping. Customer-
// facing branding stays "Powered by AI Music Studio".
// ============================================================================

import type {
  GenerationProvider,
  LyricsRequestResult,
  MusicRequestResult,
  ParsedLyricsCallback,
  ParsedMusicCallback,
  ProviderGenerationConfig,
  ProviderMusicTrack,
} from "./GenerationProvider";
import {
  KIE_INVALID_RESPONSE_ES,
  KIE_NETWORK_ES,
  translateKieError,
} from "./kie-errors";

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

/** Fold style + mood + voice + language into the engine "style" field. */
export function buildMusicStyle(config: ProviderGenerationConfig): string {
  const parts: string[] = [];
  if (config.musicStyle) parts.push(config.musicStyle);
  if (config.mood) parts.push(config.mood);
  if (config.voiceType && VOICE_NAMES[config.voiceType]) {
    parts.push(VOICE_NAMES[config.voiceType]);
  }
  if (config.language) {
    parts.push(`${LANGUAGE_NAMES[config.language] ?? config.language} lyrics`);
  }
  return truncate(parts.join(", ") || "pop", 1000);
}

export function buildMusicTitle(lyricsTitle: string | null): string {
  return truncate(lyricsTitle || "AI Music Studio", 80);
}

export class KieMusicProvider implements Pick<
  GenerationProvider,
  "generateMusic" | "handleMusicCallback"
> {
  constructor(
    private readonly apiKey: string,
    private readonly baseUrl: string = "https://api.kie.ai",
  ) {}

  async generateMusic(
    params: {
      lyrics: string;
      lyricsTitle: string | null;
      config: ProviderGenerationConfig;
    },
    callBackUrl: string,
  ): Promise<MusicRequestResult> {
    const style = buildMusicStyle(params.config);
    const title = buildMusicTitle(params.lyricsTitle);
    let res: Response;
    try {
      res = await fetch(`${this.baseUrl.replace(/\/+$/, "")}/api/v1/generate`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: truncate(params.lyrics, 5000),
          customMode: true,
          instrumental: false,
          model: "V4_5",
          style,
          title,
          callBackUrl,
        }),
      });
    } catch {
      throw new Error(KIE_NETWORK_ES);
    }
    let parsed: { code?: number; msg?: string; data?: { taskId?: string } };
    try {
      parsed = (await res.json()) as {
        code?: number;
        msg?: string;
        data?: { taskId?: string };
      };
    } catch {
      throw new Error(KIE_INVALID_RESPONSE_ES);
    }
    if (!res.ok || parsed.code !== 200 || !parsed.data?.taskId) {
      const code = typeof parsed.code === "number" ? parsed.code : res.status;
      throw new Error(translateKieError(code, parsed.msg ?? null));
    }
    return { taskId: parsed.data.taskId, style, title };
  }


  handleMusicCallback(body: unknown): ParsedMusicCallback {
    const root = (body ?? {}) as {
      code?: number;
      msg?: string;
      data?: { task_id?: string; callbackType?: string; data?: unknown };
    };
    const rawList = Array.isArray(root.data?.data)
      ? (root.data!.data as Record<string, unknown>[])
      : [];
    const tracks: ProviderMusicTrack[] = rawList
      .filter((t) => typeof t.audio_url === "string" && t.audio_url.length > 0)
      .map((t) => ({
        externalId: typeof t.id === "string" ? t.id : "",
        audioUrl: t.audio_url as string,
        imageUrl: typeof t.image_url === "string" ? t.image_url : null,
        title: typeof t.title === "string" ? t.title : null,
        durationSeconds: typeof t.duration === "number" ? t.duration : null,
        raw: t,
      }));
    const callbackType = root.data?.callbackType ?? null;
    const isError = root.code !== 200 || callbackType === "error";
    return {
      ok: !isError,
      complete: callbackType === "complete" && tracks.length > 0,
      taskId: root.data?.task_id ?? null,
      tracks,
      errorMessage: isError ? root.msg ?? "Music generation failed" : null,
    };
  }

  // Not implemented by the music provider.
  generateLyrics(): Promise<LyricsRequestResult> {
    throw new Error("KieMusicProvider does not generate lyrics.");
  }
  handleLyricsCallback(): ParsedLyricsCallback {
    throw new Error("KieMusicProvider does not handle lyrics callbacks.");
  }
}
