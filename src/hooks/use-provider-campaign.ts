import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type { ProviderCampaign } from "@/lib/providers";

export type ProviderCampaignAction = "update_draft" | "send_now" | "sync";

/** Stats for a sent campaign (subset of campaign_stats). */
export interface CampaignStats {
  emails_sent: number;
  emails_opened: number;
  emails_clicked: number;
  unsubscribes: number;
}

// All provider calls run server-side: the edge function decrypts the API key
// and performs every MailerLite request. The browser never holds credentials.
async function invokeCampaignAction(
  action: ProviderCampaignAction,
  experiencePageId: string,
): Promise<Record<string, unknown>> {
  const { data, error } = await supabase.functions.invoke(
    "manage-provider-campaign",
    { body: { action, experience_page_id: experiencePageId } },
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
  return (data ?? {}) as Record<string, unknown>;
}

/** Load the single provider_campaign row for an experience page (if any). */
export function useProviderCampaign(
  experiencePageId: string | undefined,
  tenantId: string | null | undefined,
) {
  return useQuery({
    queryKey: ["provider_campaign", experiencePageId],
    queryFn: async (): Promise<ProviderCampaign | null> => {
      const { data, error } = await supabase
        .from("provider_campaigns")
        .select("*")
        .eq("experience_page_id", experiencePageId as string)
        .eq("tenant_id", tenantId as string)
        .maybeSingle();
      if (error) throw error;
      return (data as ProviderCampaign | null) ?? null;
    },
    enabled: !!experiencePageId && !!tenantId,
    staleTime: 15_000,
  });
}

/** Load campaign_stats for a campaign (only meaningful once sent). */
export function useCampaignStats(
  campaignId: string | undefined,
  tenantId: string | null | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: ["campaign_stats", campaignId],
    queryFn: async (): Promise<CampaignStats | null> => {
      const { data, error } = await supabase
        .from("campaign_stats")
        .select("emails_sent, emails_opened, emails_clicked, unsubscribes")
        .eq("campaign_id", campaignId as string)
        .eq("tenant_id", tenantId as string)
        .maybeSingle();
      if (error) throw error;
      return (data as CampaignStats | null) ?? null;
    },
    enabled: enabled && !!campaignId && !!tenantId,
    staleTime: 15_000,
  });
}

/**
 * Actions for the distribution panel: update the draft, send now, or sync
 * status/stats. Each invalidates the experience + provider_campaign queries.
 */
export function useProviderCampaignActions(experiencePageId: string) {
  const queryClient = useQueryClient();

  const invalidate = () => {
    void queryClient.invalidateQueries({
      queryKey: ["experience_page", experiencePageId],
    });
    void queryClient.invalidateQueries({
      queryKey: ["provider_campaign", experiencePageId],
    });
    // Legacy list query used elsewhere.
    void queryClient.invalidateQueries({
      queryKey: ["provider-campaigns", experiencePageId],
    });
    void queryClient.invalidateQueries({ queryKey: ["campaign_stats"] });
  };

  const updateDraft = useMutation({
    mutationFn: () => invokeCampaignAction("update_draft", experiencePageId),
    onSuccess: invalidate,
  });

  const sendNow = useMutation({
    mutationFn: () => invokeCampaignAction("send_now", experiencePageId),
    onSuccess: invalidate,
  });

  const sync = useMutation({
    mutationFn: () => invokeCampaignAction("sync", experiencePageId),
    onSuccess: invalidate,
  });

  return {
    updateDraft,
    sendNow,
    sync,
    isLoading:
      updateDraft.isPending || sendNow.isPending || sync.isPending,
  };
}
