// ============================================================================
// GenerationAssetService
//
// A Generation Job produces Generation Assets (lyrics, audio, cover). This
// service owns the lifecycle of `generation_assets`.
//
// SCOPE (TASK 004 — architecture only): asset production is NOT implemented in
// this sprint. The contracts below describe the future shape; reads are
// available for surfacing produced assets later.
// ============================================================================

import { supabase } from "@/integrations/supabase/client";
import type { AssetType, GenerationAssetRow } from "./types";

export interface CreateAssetInput {
  tenantId: string;
  generationJobId: string;
  campaignId: string;
  assetType: AssetType;
}

export const GenerationAssetService = {
  /**
   * FUTURE: register an asset produced by a job. Not implemented in this
   * sprint — no assets are created during batch generation.
   */
  async create(_input: CreateAssetInput): Promise<never> {
    throw new Error(
      "GenerationAssetService.create is not implemented yet (TASK 004 is architecture only).",
    );
  },

  /** Read the assets belonging to a job (RLS scopes to the caller's tenant). */
  async listByJob(jobId: string): Promise<GenerationAssetRow[]> {
    const { data, error } = await supabase
      .from("generation_assets")
      .select("*")
      .eq("generation_job_id", jobId)
      .order("created_at", { ascending: true });

    if (error) throw error;
    return (data as GenerationAssetRow[]) ?? [];
  },

  /** Read every asset produced for a campaign. */
  async listByCampaign(campaignId: string): Promise<GenerationAssetRow[]> {
    const { data, error } = await supabase
      .from("generation_assets")
      .select("*")
      .eq("campaign_id", campaignId)
      .order("created_at", { ascending: true });

    if (error) throw error;
    return (data as GenerationAssetRow[]) ?? [];
  },
};
