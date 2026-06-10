import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

export interface PersonalizedExperienceContent {
  message_content: string | null;
  cta_title: string | null;
  cta_url: string | null;
  email_body: string | null;
}

export interface PersonalizedPlaybackStats {
  totalPlays: number;
  totalUnique: number;
  totalCompletions: number;
}

/**
 * Reads the shared experience content for a personalized campaign. All
 * experience pages of the campaign carry the same message/CTA values, so a
 * single sample row is enough for the form's initial state. `email_body` comes
 * from `campaign_generation_configs`.
 */
export function usePersonalizedExperienceContent(campaignId: string) {
  return useQuery({
    queryKey: ["personalized-experience-content", campaignId],
    queryFn: async (): Promise<PersonalizedExperienceContent> => {
      const [expRes, configRes] = await Promise.all([
        supabase
          .from("experience_pages")
          .select("message_content, cta_title, cta_url")
          .eq("campaign_id", campaignId)
          .limit(1)
          .maybeSingle(),
        supabase
          .from("campaign_generation_configs")
          .select("email_body")
          .eq("campaign_id", campaignId)
          .maybeSingle(),
      ]);

      if (expRes.error) throw expRes.error;
      if (configRes.error) throw configRes.error;

      return {
        message_content: expRes.data?.message_content ?? null,
        cta_title: expRes.data?.cta_title ?? null,
        cta_url: expRes.data?.cta_url ?? null,
        email_body: configRes.data?.email_body ?? null,
      };
    },
    staleTime: 15_000,
    enabled: Boolean(campaignId),
  });
}

export interface UpdatePersonalizedExperienceInput {
  message: string;
  ctaTitle: string;
  ctaUrl: string;
}

/**
 * Persists the message into `campaign_generation_configs.email_body` and
 * bulk-updates every experience page of the campaign with the message/CTA.
 */
export function useUpdatePersonalizedExperienceContent(campaignId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpdatePersonalizedExperienceInput) => {
      const message = input.message.trim();
      const ctaTitle = input.ctaTitle.trim();
      const ctaUrl = input.ctaUrl.trim();

      const { error: configError } = await supabase
        .from("campaign_generation_configs")
        .update({ email_body: message || null })
        .eq("campaign_id", campaignId);
      if (configError) throw configError;

      const { error: expError } = await supabase
        .from("experience_pages")
        .update({
          message_content: message || null,
          cta_title: ctaTitle || null,
          cta_url: ctaUrl || null,
        })
        .eq("campaign_id", campaignId);
      if (expError) throw expError;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["personalized-experience-content", campaignId],
      });
    },
  });
}

/**
 * Aggregates playback analytics across all experience pages of a personalized
 * campaign.
 */
export function usePersonalizedPlaybackStats(
  campaignId: string,
  enabled: boolean,
) {
  return useQuery({
    queryKey: ["personalized-playback-stats", campaignId],
    queryFn: async (): Promise<PersonalizedPlaybackStats> => {
      const { data, error } = await supabase
        .from("experience_pages")
        .select("play_count, unique_visitors, completion_count")
        .eq("campaign_id", campaignId);
      if (error) throw error;

      const totalPlays =
        data?.reduce((s, r) => s + (r.play_count ?? 0), 0) ?? 0;
      const totalUnique =
        data?.reduce((s, r) => s + (r.unique_visitors ?? 0), 0) ?? 0;
      const totalCompletions =
        data?.reduce((s, r) => s + (r.completion_count ?? 0), 0) ?? 0;

      return { totalPlays, totalUnique, totalCompletions };
    },
    staleTime: 15_000,
    enabled: enabled && Boolean(campaignId),
  });
}

export interface PersonalizedCampaignAnalytics {
  totalRecipients: number;
  sent: number;
  pending: number;
  failed: number;
  visited: number;
  played: number;
  completedSum: number;
  playedSum: number;
  ctaClicksSum: number;
}

/**
 * Aggregates marketing-ready analytics for a personalized campaign, combining
 * per-recipient delivery status with engagement metrics from the associated
 * experience pages. Personalized campaigns send 1:1 transactional emails, so
 * email open/click stats from `campaign_stats` are intentionally ignored —
 * engagement is measured at the experience-page level instead.
 */
export function usePersonalizedCampaignAnalytics(campaignId: string) {
  return useQuery({
    queryKey: ["personalized-campaign-analytics", campaignId],
    queryFn: async (): Promise<PersonalizedCampaignAnalytics> => {
      const { data: deliveries, error: delErr } = await supabase
        .from("personalized_deliveries")
        .select("status")
        .eq("campaign_id", campaignId);
      if (delErr) throw delErr;

      const totalRecipients = deliveries?.length ?? 0;
      const sent =
        deliveries?.filter((d) => d.status === "sent").length ?? 0;
      const pending =
        deliveries?.filter((d) =>
          ["pending", "generating", "ready"].includes(d.status ?? ""),
        ).length ?? 0;
      const failed =
        deliveries?.filter((d) => d.status === "failed").length ?? 0;

      const { data: pages, error: pagesErr } = await supabase
        .from("experience_pages")
        .select(
          "unique_visitors, play_count, completion_count, cta_click_count",
        )
        .eq("campaign_id", campaignId);
      if (pagesErr) throw pagesErr;

      const visited =
        pages?.filter((p) => (p.unique_visitors ?? 0) > 0).length ?? 0;
      const played =
        pages?.filter((p) => (p.play_count ?? 0) > 0).length ?? 0;
      const completedSum =
        pages?.reduce((s, p) => s + (p.completion_count ?? 0), 0) ?? 0;
      const playedSum =
        pages?.reduce((s, p) => s + (p.play_count ?? 0), 0) ?? 0;
      const ctaClicksSum =
        pages?.reduce((s, p) => s + (p.cta_click_count ?? 0), 0) ?? 0;

      return {
        totalRecipients,
        sent,
        pending,
        failed,
        visited,
        played,
        completedSum,
        playedSum,
        ctaClicksSum,
      };
    },
    staleTime: 15_000,
    enabled: Boolean(campaignId),
  });
}
