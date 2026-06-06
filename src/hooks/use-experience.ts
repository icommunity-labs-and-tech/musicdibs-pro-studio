import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  ExperienceService,
  type ExperienceBranding,
  type ExperienceContent,
  type ExperiencePage,
  type ExperienceStatus,
  type CreateExperienceInput,
} from "@/lib/experience";

/** Latest experience page for a campaign (one per campaign in Phase 1). */
export function useCampaignExperience(campaignId: string) {
  return useQuery({
    queryKey: ["experience", campaignId],
    queryFn: () => ExperienceService.getByCampaign(campaignId),
    staleTime: 10_000,
  });
}

export function useCreateExperience() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateExperienceInput) => ExperienceService.create(input),
    onSuccess: (row: ExperiencePage) => {
      void queryClient.invalidateQueries({
        queryKey: ["experience", row.campaign_id],
      });
    },
  });
}

export function useUpdateExperienceBranding(campaignId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; branding: ExperienceBranding }) =>
      ExperienceService.updateBranding(vars.id, vars.branding),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["experience", campaignId] });
    },
  });
}

export function useSetExperienceStatus(campaignId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; status: ExperienceStatus }) =>
      ExperienceService.setStatus(vars.id, vars.status),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["experience", campaignId] });
    },
  });
}
