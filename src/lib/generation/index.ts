// ============================================================================
// AI Music Studio — generation pipeline architecture.
//
// Model (defined in TASK 004; execution is intentionally NOT implemented):
//   Campaign → Generation Batch → Generation Jobs → Generation Assets
//   → Queue Processing → Callbacks
//
// This sprint implements ONLY: batch creation + reads, and analytics helpers.
// There is NO lyrics generation, NO music generation, NO queue processing,
// NO callbacks and NO credit deduction yet.
//
// BRANDING: everything customer-facing is "Powered by AI Music Studio". These
// internal contracts never reference any third-party engine or provider.
// ============================================================================

import type {
  GenerationMode,
  GenerationLanguage,
  VoiceType,
} from "@/lib/campaign-generation-options";

export * from "./types";
export { GenerationBatchService } from "./GenerationBatchService";
export type { CreateBatchInput } from "./GenerationBatchService";
export { GenerationJobService } from "./GenerationJobService";
export type { CreateJobInput } from "./GenerationJobService";
export { GenerationAssetService } from "./GenerationAssetService";
export type { CreateAssetInput } from "./GenerationAssetService";
export {
  getBatchProgress,
  getJobProgress,
  calculateCompletionRate,
} from "./analytics";

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
