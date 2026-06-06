import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type { CampaignStatus, ProviderCampaign } from "@/lib/providers";

// ── Read: published campaigns for an experience page ────────────────────────

async function fetchProviderCampaigns(
  experiencePageId: string,
): Promise<ProviderCampaign[]> {
  const { data, error } = await supabase
    .from("provider_campaigns")
    .select("*")
    .eq("experience_page_id", experiencePageId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as ProviderCampaign[];
}

export function useProviderCampaigns(experiencePageId: string | undefined) {
  return useQuery({
    queryKey: ["provider-campaigns", experiencePageId],
    queryFn: () => fetchProviderCampaigns(experiencePageId as string),
    enabled: !!experiencePageId,
    staleTime: 15_000,
  });
}

// Credentials NEVER leave the server. The manage-provider-campaign edge
// function decrypts the API key and performs all MailerLite calls server-side.
async function callCampaignFn(payload: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke(
    "manage-provider-campaign",
    { body: payload },
  );
  if (error) {
    // Surface the function's JSON error message when present.
    const ctx = (error as { context?: { body?: unknown } }).context;
    let message = error.message;
    try {
      const parsed =
        typeof ctx?.body === "string" ? JSON.parse(ctx.body) : ctx?.body;
      if (parsed && typeof parsed === "object" && "error" in parsed) {
        message = String((parsed as { error: unknown }).error);
      }
    } catch {
      /* keep original message */
    }
    throw new Error(message);
  }
  if (data?.error) throw new Error(String(data.error));
  return data as { success: boolean; campaign: ProviderCampaign };
}

export interface CreateDraftCampaignVars {
  experiencePageId: string;
  audienceExternalId: string;
  audienceType: "list" | "segment" | "automation";
  audienceName: string;
}

export function useCreateDraftCampaign(experiencePageId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: CreateDraftCampaignVars) =>
      callCampaignFn({
        action: "create_draft",
        experience_page_id: vars.experiencePageId,
        audience_external_id: vars.audienceExternalId,
        audience_type: vars.audienceType,
        audience_name: vars.audienceName,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["provider-campaigns", experiencePageId],
      });
    },
  });
}

export function useSyncCampaignStatus(experiencePageId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (rowId: string) =>
      callCampaignFn({ action: "sync_status", provider_campaign_row_id: rowId }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["provider-campaigns", experiencePageId],
      });
    },
  });
}

export type { CampaignStatus };
