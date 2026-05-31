import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type CampaignRow = Database["public"]["Tables"]["campaigns"]["Row"];
type StatsRow = Database["public"]["Tables"]["campaign_stats"]["Row"];
type JobRow = Database["public"]["Tables"]["generation_jobs"]["Row"];

export interface CampaignDetail {
  campaign: CampaignRow;
  stats: StatsRow | null;
}

async function fetchCampaignDetail(
  campaignId: string,
): Promise<CampaignDetail> {
  const [campaignRes, statsRes] = await Promise.all([
    supabase.from("campaigns").select("*").eq("id", campaignId).maybeSingle(),
    supabase
      .from("campaign_stats")
      .select("*")
      .eq("campaign_id", campaignId)
      .maybeSingle(),
  ]);

  if (campaignRes.error) throw campaignRes.error;
  if (!campaignRes.data) throw new Error("Campaña no encontrada");
  if (statsRes.error) throw statsRes.error;

  return { campaign: campaignRes.data, stats: statsRes.data ?? null };
}

export function useCampaignDetail(campaignId: string) {
  return useQuery({
    queryKey: ["campaign", campaignId],
    queryFn: () => fetchCampaignDetail(campaignId),
    staleTime: 15_000,
  });
}

async function fetchGenerationJobs(campaignId: string): Promise<JobRow[]> {
  const { data, error } = await supabase
    .from("generation_jobs")
    .select("*")
    .eq("campaign_id", campaignId)
    .order("queued_at", { ascending: true });

  if (error) throw error;
  return (data as JobRow[] | null) ?? [];
}

export function useGenerationJobs(campaignId: string) {
  return useQuery({
    queryKey: ["generation-jobs", campaignId],
    queryFn: () => fetchGenerationJobs(campaignId),
    staleTime: 10_000,
  });
}

/**
 * Realtime subscription to generation_jobs for a campaign. Invalidates the
 * jobs + campaign queries on any change and surfaces a toast when a job
 * finishes. Cleans up the channel on unmount.
 */
export function useGenerationJobsRealtime(campaignId: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!campaignId) return;

    const channel = supabase
      .channel(`generation-jobs:${campaignId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "generation_jobs",
          filter: `campaign_id=eq.${campaignId}`,
        },
        (payload) => {
          queryClient.invalidateQueries({
            queryKey: ["generation-jobs", campaignId],
          });
          queryClient.invalidateQueries({ queryKey: ["campaign", campaignId] });

          const next = payload.new as Partial<JobRow> | null;
          const prev = payload.old as Partial<JobRow> | null;
          if (next?.status === "completed" && prev?.status !== "completed") {
            toast.success("Canción generada", {
              description: next.contact_name
                ? `Lista para ${next.contact_name}`
                : undefined,
            });
          } else if (next?.status === "failed" && prev?.status !== "failed") {
            toast.error("Fallo al generar una canción", {
              description: next.error_message ?? undefined,
            });
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [campaignId, queryClient]);
}
