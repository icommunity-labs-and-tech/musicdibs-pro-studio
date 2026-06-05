// ============================================================================
// AI Music Studio — generation domain types.
//
// Architecture (this sprint defines the model, NOT the execution):
//   Campaign → Generation Batch → Generation Jobs → Generation Assets
//
// PRIVACY: jobs reference only `external_contact_id`. We NEVER store names,
// emails, phones, birthdays or any other personal data in MusicDibs.
// ============================================================================

import type { Database } from "@/integrations/supabase/types";
import type { GenerationMode } from "@/lib/campaign-generation-options";

// ── Database row aliases ────────────────────────────────────────────────────
export type GenerationBatchRow =
  Database["public"]["Tables"]["generation_batches"]["Row"];
export type GenerationBatchInsert =
  Database["public"]["Tables"]["generation_batches"]["Insert"];

export type GenerationJobRow =
  Database["public"]["Tables"]["generation_jobs"]["Row"];
export type GenerationJobInsert =
  Database["public"]["Tables"]["generation_jobs"]["Insert"];

export type GenerationAssetRow =
  Database["public"]["Tables"]["generation_assets"]["Row"];
export type GenerationAssetInsert =
  Database["public"]["Tables"]["generation_assets"]["Insert"];

// ── Status enums (mirror DB CHECK constraints) ──────────────────────────────
export type BatchStatus =
  | "draft"
  | "queued"
  | "processing"
  | "completed"
  | "failed";

export type JobStatus = "queued" | "processing" | "completed" | "failed";

export type StageStatus = "pending" | "processing" | "completed" | "failed";

export type AssetType = "lyrics" | "audio" | "cover";

export type AssetStatus = "pending" | "ready" | "failed";

export type { GenerationMode };

// ── Progress shapes (analytics) ─────────────────────────────────────────────
export interface BatchProgress {
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  pendingJobs: number;
  /** 0–100 */
  completionRate: number;
}

export interface JobProgress {
  lyricsStatus: StageStatus;
  musicStatus: StageStatus;
  /** 0–100 across the two generation stages. */
  stageCompletion: number;
}
