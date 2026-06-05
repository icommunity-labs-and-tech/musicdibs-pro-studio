// ============================================================================
// KieLyricsProvider — lyrics half of the GenerationProvider contract.
//
// Endpoint: POST {baseUrl}/api/v1/lyrics  (KIE Suno API).
// Callback: { code, msg, data: { task_id, data: [{ text, title, status }] } }.
//
// Credentials are passed in by the caller; this class never reads env or logs
// secrets. Customer-facing branding stays "Powered by AI Music Studio".
// ============================================================================

import type {
  GenerationProvider,
  LyricsRequestResult,
  MusicRequestResult,
  ParsedLyricsCallback,
  ParsedMusicCallback,
  ProviderGenerationConfig,
  ProviderLyricsVariant,
} from "./GenerationProvider";

const LANGUAGE_NAMES: Record<string, string> = {
  es: "Spanish",
  en: "English",
  pt: "Portuguese",
  fr: "French",
};

function truncate(value: string, max: number): string {
  const trimmed = value.trim();
  return trimmed.length <= max ? trimmed : trimmed.slice(0, max).trim();
}

/** Build the lyrics prompt (engine limit: 200 chars). */
export function buildLyricsPrompt(config: ProviderGenerationConfig): string {
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
  return truncate(parts.join(". ") || "An uplifting brand song", 200);
}

export class KieLyricsProvider implements Pick<
  GenerationProvider,
  "generateLyrics" | "handleLyricsCallback"
> {
  constructor(
    private readonly apiKey: string,
    private readonly baseUrl: string = "https://api.kie.ai",
  ) {}

  async generateLyrics(
    config: ProviderGenerationConfig,
    callBackUrl: string,
  ): Promise<LyricsRequestResult> {
    const prompt = buildLyricsPrompt(config);
    const res = await fetch(`${this.baseUrl.replace(/\/+$/, "")}/api/v1/lyrics`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prompt, callBackUrl }),
    });
    const parsed = (await res.json()) as {
      code?: number;
      msg?: string;
      data?: { taskId?: string };
    };
    if (!res.ok || parsed.code !== 200 || !parsed.data?.taskId) {
      throw new Error(parsed.msg ?? `Lyrics request failed (HTTP ${res.status})`);
    }
    return { taskId: parsed.data.taskId, prompt };
  }

  handleLyricsCallback(body: unknown): ParsedLyricsCallback {
    const root = (body ?? {}) as {
      code?: number;
      msg?: string;
      data?: { task_id?: string; data?: unknown };
    };
    const rawList = Array.isArray(root.data?.data)
      ? (root.data!.data as Record<string, unknown>[])
      : [];
    const variants: ProviderLyricsVariant[] = rawList.map((v) => ({
      text: typeof v.text === "string" ? v.text : "",
      title: typeof v.title === "string" ? v.title : "",
      status: typeof v.status === "string" ? v.status : "",
      errorMessage:
        typeof v.error_message === "string" ? v.error_message : undefined,
    }));
    const ok =
      root.code === 200 &&
      variants.length > 0 &&
      variants[0].status === "complete" &&
      variants[0].text.length > 0;
    return {
      ok,
      taskId: root.data?.task_id ?? null,
      variants,
      errorMessage: ok ? null : root.msg ?? "Lyrics generation failed",
    };
  }

  // Not implemented by the lyrics provider.
  generateMusic(): Promise<MusicRequestResult> {
    throw new Error("KieLyricsProvider does not generate music.");
  }
  handleMusicCallback(): ParsedMusicCallback {
    throw new Error("KieLyricsProvider does not handle music callbacks.");
  }
}
