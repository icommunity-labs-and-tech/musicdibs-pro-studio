// ============================================================================
// GenerationBatchService
//
// A Campaign is NOT a generation. A Campaign creates a Generation Batch.
// This service owns the lifecycle of `generation_batches`.
//
// SCOPE (TASK 004 — architecture only): this sprint implements ONLY batch
// creation + reads. It performs NO lyrics/music generation, NO queue
// processing, NO external AI calls and NO credit deduction.
// ============================================================================

import { supabase } from "@/integrations/supabase/client";
import type { GenerationMode } from "@/lib/campaign-generation-options";
import type {
  BatchStatus,
  GenerationBatchInsert,
  GenerationBatchRow,
} from "./types";

export interface CreateBatchInput {
  tenantId: string;
  campaignId: string;
  generationMode: GenerationMode;
  /** Number of jobs this batch will eventually produce (1 for single song). */
  totalJobs: number;
  /** Credits set aside for the batch (no actual deduction in this sprint). */
  creditsReserved: number;
}

export const GenerationBatchService = {
  /**
   * Create a generation batch for a campaign. Inserted in `draft` status with
   * its job counters at zero — no jobs are created here.
   */
  async create(input: CreateBatchInput): Promise<GenerationBatchRow> {
    const payload: GenerationBatchInsert = {
      tenant_id: input.tenantId,
      campaign_id: input.campaignId,
      status: "draft",
      generation_mode: input.generationMode,
      total_jobs: input.totalJobs,
      completed_jobs: 0,
      failed_jobs: 0,
      credits_reserved: input.creditsReserved,
      credits_consumed: 0,
    };

    const { data, error } = await supabase
      .from("generation_batches")
      .insert(payload)
      .select("*")
      .single();

    if (error) throw error;
    return data as GenerationBatchRow;
  },

  /** Fetch a single batch by id (RLS scopes to the caller's tenant). */
  async getById(batchId: string): Promise<GenerationBatchRow | null> {
    const { data, error } = await supabase
      .from("generation_batches")
      .select("*")
      .eq("id", batchId)
      .maybeSingle();

    if (error) throw error;
    return (data as GenerationBatchRow | null) ?? null;
  },

  /** Most recent batch for a campaign, or null if none has been created. */
  async getLatestForCampaign(
    campaignId: string,
  ): Promise<GenerationBatchRow | null> {
    const { data, error } = await supabase
      .from("generation_batches")
      .select("*")
      .eq("campaign_id", campaignId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return (data as GenerationBatchRow | null) ?? null;
  },

  /** Update a batch status. Used by the future queue/orchestration layer. */
  async updateStatus(
    batchId: string,
    status: BatchStatus,
  ): Promise<void> {
    const { error } = await supabase
      .from("generation_batches")
      .update({ status })
      .eq("id", batchId);
    if (error) throw error;
  },
};
