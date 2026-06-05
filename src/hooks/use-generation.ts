import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type { GenerationMode } from "@/lib/campaign-generation-options";
import {
  GenerationBatchService,
  type GenerationBatchRow,
} from "@/lib/generation";

export interface GenerateCampaignInput {
  tenantId: string;
  campaignId: string;
  generationMode: GenerationMode;
  /** Number of songs/jobs this batch will produce (1 for single song). */
  totalJobs: number;
  estimatedCredits: number;
}

// Architecture-only generation trigger: creates the generation batch and moves
// the campaign to `ready_to_generate`. It does NOT create jobs/assets, call any
// external AI provider, run a queue or deduct credits.
async function generateCampaign(
  input: GenerateCampaignInput,
): Promise<GenerationBatchRow> {
  const batch = await GenerationBatchService.create({
    tenantId: input.tenantId,
    campaignId: input.campaignId,
    generationMode: input.generationMode,
    totalJobs: input.totalJobs,
    creditsReserved: input.estimatedCredits,
  });

  const { error } = await supabase
    .from("campaigns")
    .update({ status: "ready_to_generate", updated_at: new Date().toISOString() })
    .eq("id", input.campaignId);

  if (error) throw error;

  return batch;
}

export function useGenerateCampaign() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: generateCampaign,
    onSuccess: (_batch, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ["campaign", variables.campaignId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["generation-batch", variables.campaignId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["campaigns", variables.tenantId],
      });
    },
  });
}

// Latest generation batch for a campaign — powers the Generation Status panel.
export function useCampaignBatch(campaignId: string) {
  return useQuery({
    queryKey: ["generation-batch", campaignId],
    queryFn: () => GenerationBatchService.getLatestForCampaign(campaignId),
    staleTime: 15_000,
  });
}
