import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import {
  GenerationBatchService,
  type GenerationBatchRow,
} from "@/lib/generation";

// ── Generated asset shape (audio + lyrics) ──────────────────────────────────
// Selected explicitly so we don't depend on regenerated types here.
export interface GenerationAsset {
  id: string;
  asset_type: "lyrics" | "audio" | "cover";
  status: string;
  storage_path: string | null;
  public_url: string | null;
  lyrics_content: string | null;
  external_asset_id: string | null;
  duration_seconds: number | null;
  metadata: Record<string, unknown> | null;
  generation_round: number;
  created_at: string;
}

export interface GenerationJob {
  id: string;
  status: string;
  lyrics_status: string;
  music_status: string;
  lyrics_title: string | null;
  error_message: string | null;
  generation_batch_id: string | null;
}

type GenerateAction = "generate" | "retry_lyrics" | "retry_music";

// Trigger the server-side generation pipeline. The edge function creates the
// batch/job (if needed) and ALWAYS starts with lyrics. No KIE/engine details
// or credentials ever touch the client.
async function invokeGenerate(input: {
  campaignId: string;
  action: GenerateAction;
}): Promise<void> {
  const { data, error } = await supabase.functions.invoke(
    "ai-music-studio-generate",
    { body: { campaign_id: input.campaignId, action: input.action } },
  );
  if (error) throw error;
  if (data?.error) throw new Error(data.error as string);
}

function useGenerateMutation(action: GenerateAction) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { tenantId: string; campaignId: string }) =>
      invokeGenerate({ campaignId: vars.campaignId, action }),
    onSuccess: (_res, vars) => {
      void queryClient.invalidateQueries({ queryKey: ["campaign", vars.campaignId] });
      void queryClient.invalidateQueries({ queryKey: ["generation-batch", vars.campaignId] });
      void queryClient.invalidateQueries({ queryKey: ["generation-job", vars.campaignId] });
      void queryClient.invalidateQueries({ queryKey: ["generation-assets", vars.campaignId] });
      void queryClient.invalidateQueries({ queryKey: ["campaigns", vars.tenantId] });
    },
  });
}

export function useGenerateCampaign() {
  return useGenerateMutation("generate");
}

export function useRetryLyrics() {
  return useGenerateMutation("retry_lyrics");
}

export function useRetryMusic() {
  return useGenerateMutation("retry_music");
}

// Latest generation batch for a campaign — powers the Generation Status panel.
export function useCampaignBatch(campaignId: string) {
  return useQuery({
    queryKey: ["generation-batch", campaignId],
    queryFn: () => GenerationBatchService.getLatestForCampaign(campaignId),
    staleTime: 10_000,
  });
}

// Latest generation job for a campaign — exposes lyrics/music stage status.
async function fetchLatestJob(campaignId: string): Promise<GenerationJob | null> {
  const { data, error } = await supabase
    .from("generation_jobs")
    .select(
      "id, status, lyrics_status, music_status, lyrics_title, error_message, generation_batch_id",
    )
    .eq("campaign_id", campaignId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as GenerationJob | null) ?? null;
}

export function useCampaignJob(campaignId: string) {
  return useQuery({
    queryKey: ["generation-job", campaignId],
    queryFn: () => fetchLatestJob(campaignId),
    staleTime: 10_000,
  });
}

// Generated assets (lyrics + audio versions) for a campaign.
async function fetchAssets(campaignId: string): Promise<GenerationAsset[]> {
  const { data, error } = await supabase
    .from("generation_assets")
    .select(
      "id, asset_type, status, storage_path, public_url, lyrics_content, external_asset_id, duration_seconds, metadata, created_at",
    )
    .eq("campaign_id", campaignId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data as GenerationAsset[] | null) ?? [];
}

export function useCampaignAssets(campaignId: string) {
  return useQuery({
    queryKey: ["generation-assets", campaignId],
    queryFn: () => fetchAssets(campaignId),
    staleTime: 10_000,
  });
}

export type { GenerationBatchRow };

/**
 * Realtime: any generation_jobs change for the campaign refreshes the job,
 * assets, batch and campaign queries (callbacks update the job on every stage
 * transition, so this also surfaces newly stored assets).
 */
export function useCampaignGenerationRealtime(campaignId: string) {
  const queryClient = useQueryClient();
  useEffect(() => {
    if (!campaignId) return;
    const channel = supabase
      .channel(`ai-studio:${campaignId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "generation_jobs",
          filter: `campaign_id=eq.${campaignId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["generation-job", campaignId] });
          queryClient.invalidateQueries({ queryKey: ["generation-assets", campaignId] });
          queryClient.invalidateQueries({ queryKey: ["generation-batch", campaignId] });
          queryClient.invalidateQueries({ queryKey: ["campaign", campaignId] });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [campaignId, queryClient]);
}
