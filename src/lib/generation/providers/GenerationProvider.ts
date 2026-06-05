// ============================================================================
// AI Music Studio — generation provider contract.
//
// The provider layer is the ONLY place that understands a third-party music
// engine's request payloads and callback structures. The Campaign Builder and
// Generation Architecture depend on this contract, never on engine details.
//
// The concrete KIE implementation runs server-side (Supabase Edge Functions in
// `supabase/functions/_shared/`), where credentials live. These browser/server
// safe classes mirror that mapping so the contract stays documented and
// type-checked in one place. Nothing here is ever shown to customers — the UI
// only displays "Powered by AI Music Studio".
// ============================================================================

export interface ProviderGenerationConfig {
  lyricsGoal: string | null;
  lyricsPrompt: string | null;
  musicStyle: string | null;
  voiceType: string | null;
  language: string | null;
  mood: string | null;
}

export interface LyricsRequestResult {
  /** External task id returned by the engine. */
  taskId: string;
  /** Resolved prompt actually sent to the engine. */
  prompt: string;
}

export interface MusicRequestResult {
  taskId: string;
  style: string;
  title: string;
}

export interface ProviderLyricsVariant {
  text: string;
  title: string;
  status: string;
  errorMessage?: string;
}

export interface ProviderMusicTrack {
  externalId: string;
  audioUrl: string;
  imageUrl: string | null;
  title: string | null;
  durationSeconds: number | null;
  raw: Record<string, unknown>;
}

export interface ParsedLyricsCallback {
  ok: boolean;
  taskId: string | null;
  variants: ProviderLyricsVariant[];
  errorMessage: string | null;
}

export interface ParsedMusicCallback {
  ok: boolean;
  complete: boolean;
  taskId: string | null;
  tracks: ProviderMusicTrack[];
  errorMessage: string | null;
}

/**
 * A music generation provider. Implementations must enforce the pipeline:
 *   lyrics → lyrics callback → music → music callback.
 */
export interface GenerationProvider {
  generateLyrics(
    config: ProviderGenerationConfig,
    callBackUrl: string,
  ): Promise<LyricsRequestResult>;

  generateMusic(
    params: {
      lyrics: string;
      lyricsTitle: string | null;
      config: ProviderGenerationConfig;
    },
    callBackUrl: string,
  ): Promise<MusicRequestResult>;

  handleLyricsCallback(body: unknown): ParsedLyricsCallback;

  handleMusicCallback(body: unknown): ParsedMusicCallback;
}
