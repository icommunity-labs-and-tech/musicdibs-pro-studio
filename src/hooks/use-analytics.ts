import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

export interface CampaignPerformance {
  campaignId: string;
  name: string;
  sent: number;
  opened: number;
  clicked: number;
  unsubscribes: number;
  cost: number;
  openRate: number | null;
  clickRate: number | null;
}

export interface AnalyticsData {
  totalsSent: number;
  totalsOpened: number;
  totalsClicked: number;
  totalsUnsubscribes: number;
  totalCost: number;
  openRate: number | null;
  clickRate: number | null;
  unsubscribeRate: number | null;
  perCampaign: CampaignPerformance[];
}

type StatsJoin = {
  campaign_id: string;
  emails_sent: number;
  emails_opened: number;
  emails_clicked: number;
  unsubscribes: number;
  cost_actual: number;
  campaigns: { name: string } | null;
};

async function fetchAnalytics(tenantId: string): Promise<AnalyticsData> {
  const { data, error } = await supabase
    .from("campaign_stats")
    .select(
      "campaign_id, emails_sent, emails_opened, emails_clicked, unsubscribes, cost_actual, campaigns(name)",
    )
    .eq("tenant_id", tenantId);

  if (error) throw error;

  const rows = (data as StatsJoin[] | null) ?? [];

  let totalsSent = 0;
  let totalsOpened = 0;
  let totalsClicked = 0;
  let totalsUnsubscribes = 0;
  let totalCost = 0;

  const perCampaign: CampaignPerformance[] = rows.map((r) => {
    totalsSent += r.emails_sent ?? 0;
    totalsOpened += r.emails_opened ?? 0;
    totalsClicked += r.emails_clicked ?? 0;
    totalsUnsubscribes += r.unsubscribes ?? 0;
    totalCost += Number(r.cost_actual ?? 0);

    const sent = r.emails_sent ?? 0;
    return {
      campaignId: r.campaign_id,
      name: r.campaigns?.name ?? "Campaña",
      sent,
      opened: r.emails_opened ?? 0,
      clicked: r.emails_clicked ?? 0,
      unsubscribes: r.unsubscribes ?? 0,
      cost: Number(r.cost_actual ?? 0),
      openRate: sent > 0 ? ((r.emails_opened ?? 0) / sent) * 100 : null,
      clickRate: sent > 0 ? ((r.emails_clicked ?? 0) / sent) * 100 : null,
    };
  });

  perCampaign.sort((a, b) => b.sent - a.sent);

  return {
    totalsSent,
    totalsOpened,
    totalsClicked,
    totalsUnsubscribes,
    totalCost,
    openRate: totalsSent > 0 ? (totalsOpened / totalsSent) * 100 : null,
    clickRate: totalsSent > 0 ? (totalsClicked / totalsSent) * 100 : null,
    unsubscribeRate:
      totalsSent > 0 ? (totalsUnsubscribes / totalsSent) * 100 : null,
    perCampaign,
  };
}

export function useAnalytics(tenantId: string | undefined) {
  return useQuery({
    queryKey: ["analytics", tenantId],
    queryFn: () => fetchAnalytics(tenantId as string),
    enabled: !!tenantId,
    staleTime: 30_000,
  });
}
