// ============================================================================
// GenerationJobService
//
// A Generation Batch contains Generation Jobs. Each job represents the work
// needed to produce one song (single-song batches have exactly one job;
// personalized batches have one job per recipient).
//
// PRIVACY: a job references the recipient ONLY through `external_contact_id`.
// Names, emails, phones, birthdays and custom fields are NEVER stored here —
// the source of truth stays in the customer's marketing platform.
//
// SCOPE (TASK 004 — architecture only): job creation/processing is NOT
// implemented in this sprint. The contracts below describe the future shape;
// reads are available for the Generation Status UI.
// ============================================================================

import { supabase } from "@/integrations/supabase/client";
import type { GenerationJobRow } from "./types";

export interface CreateJobInput {
  tenantId: string;
  generationBatchId: string;
  campaignId: string;
  /** External marketing-platform contact id. NEVER any personal data. */
  externalContactId: string | null;
}

export const GenerationJobService = {
  /**
   * FUTURE: create the jobs for a batch (one per recipient). Not implemented
   * in this sprint — no jobs are created when a batch is generated.
   */
  async createForBatch(_inputs: CreateJobInput[]): Promise<never> {
    throw new Error(
      "GenerationJobService.createForBatch is not implemented yet (TASK 004 is architecture only).",
    );
  },

  /** Read the jobs belonging to a batch (RLS scopes to the caller's tenant). */
  async listByBatch(batchId: string): Promise<GenerationJobRow[]> {
    const { data, error } = await supabase
      .from("generation_jobs")
      .select("*")
      .eq("generation_batch_id", batchId)
      .order("created_at", { ascending: true });

    if (error) throw error;
    return (data as GenerationJobRow[]) ?? [];
  },
};
