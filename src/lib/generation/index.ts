// ============================================================================
// AI Music Studio — generation pipeline architecture (SCAFFOLD ONLY).
//
// This module defines the clean contracts for the FUTURE generation modules.
// NONE of these are implemented in this sprint (TASK 003 is configuration-only):
//   - Lyrics Generation
//   - Music Generation
//   - Queue Processing
//   - Campaign Delivery
//
// BRANDING: everything customer-facing is "Powered by AI Music Studio". These
// internal contracts never reference any third-party engine or provider.
// ============================================================================

import type {
  GenerationMode,
  GenerationLanguage,
  VoiceType,
} from "@/lib/campaign-generation-options";

/** Snapshot of a campaign's generation configuration (mirrors the DB row). */
export interface GenerationConfig {
  campaignId: string;
  generationMode: GenerationMode;
  providerConnectionId: string | null;
  providerAudienceId: string | null;
  lyricsGoal: string | null;
  lyricsPrompt: string | null;
  musicStyle: string | null;
  voiceType: VoiceType | null;
  language: GenerationLanguage | null;
  mood: string | null;
  includeFirstName: boolean;
  estimatedCredits: number;
}

// ── Future contracts (NOT implemented yet) ──────────────────────────────────

/** Step 1 (future): turn a campaign config into generated lyrics. */
export interface LyricsGenerator {
  generate(config: GenerationConfig): Promise<never>;
}

/** Step 2 (future): turn lyrics + config into an audio track. */
export interface MusicGenerator {
  generate(config: GenerationConfig): Promise<never>;
}

/** Step 3 (future): enqueue per-recipient generation jobs. */
export interface QueueProcessor {
  enqueue(config: GenerationConfig): Promise<never>;
}

/** Step 4 (future): deliver finished tracks through the campaign channel. */
export interface CampaignDelivery {
  deliver(config: GenerationConfig): Promise<never>;
}
