import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type CampaignRow = Database["public"]["Tables"]["campaigns"]["Row"];
type StatsRow = Database["public"]["Tables"]["campaign_stats"]["Row"];

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
