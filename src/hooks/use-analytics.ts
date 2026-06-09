import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CampaignPerformance {
  campaignId: string;
  name: string;
  type: string;
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

export interface GenerationMetrics {
  songsGenerated: number;
  experiencePagesPublished: number;
  totalPlays: number;
  uniqueVisitors: number;
  completionCount: number;
  downloadCount: number;
  personalizedSent: number;
}

// ── Email analytics (real generation campaigns only) ─────────────────────────
async function fetchAnalytics(tenantId: string): Promise<AnalyticsData> {
  // Only include real AI Music Studio campaigns (exclude seed/legacy data)
  const { data, error } = await supabase
    .from("campaign_stats")
    .select(
      "campaign_id, emails_sent, emails_opened, emails_clicked, unsubscribes, cost_actual, campaigns!inner(name, type)",
    )
    .eq("tenant_id", tenantId)
    .in("campaigns.type", ["single_song", "personalized_song"]);

  if (error) throw error;

  type StatsJoin = {
    campaign_id: string;
    emails_sent: number;
    emails_opened: number;
    emails_clicked: number;
    unsubscribes: number;
    cost_actual: number;
    campaigns: { name: string; type: string } | null;
  };

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
      type: r.campaigns?.type ?? "single_song",
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

// ── AI Music Studio generation metrics ───────────────────────────────────────
async function fetchGenerationMetrics(tenantId: string): Promise<GenerationMetrics> {
  const [jobsRes, pagesRes, deliveriesRes] = await Promise.all([
    // Completed generation jobs
    supabase
      .from("generation_jobs")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("status", "completed"),

    // Experience pages with play stats
    supabase
      .from("experience_pages")
      .select("play_count, unique_visitors, completion_count, download_count")
      .eq("tenant_id", tenantId)
      .eq("status", "published"),

    // Personalized deliveries sent
    supabase
      .from("personalized_deliveries")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("status", "sent"),
  ]);

  const pages = (pagesRes.data ?? []) as {
    play_count: number;
    unique_visitors: number;
    completion_count: number;
    download_count: number;
  }[];

  return {
    songsGenerated: jobsRes.count ?? 0,
    experiencePagesPublished: pages.length,
    totalPlays: pages.reduce((s, p) => s + (p.play_count ?? 0), 0),
    uniqueVisitors: pages.reduce((s, p) => s + (p.unique_visitors ?? 0), 0),
    completionCount: pages.reduce((s, p) => s + (p.completion_count ?? 0), 0),
    downloadCount: pages.reduce((s, p) => s + (p.download_count ?? 0), 0),
    personalizedSent: deliveriesRes.count ?? 0,
  };
}

export function useGenerationMetrics(tenantId: string | undefined) {
  return useQuery({
    queryKey: ["generation-metrics", tenantId],
    queryFn: () => fetchGenerationMetrics(tenantId as string),
    enabled: !!tenantId,
    staleTime: 30_000,
  });
}
