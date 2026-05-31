import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type CampaignRow = Database["public"]["Tables"]["campaigns"]["Row"];

export interface RecentCampaign {
  id: string;
  name: string;
  status: string;
  created_at: string;
  sent_at: string | null;
  total_contacts: number;
}

export interface DashboardData {
  activeCampaigns: number;
  totalCampaigns: number;
  contactsCount: number;
  emailsSent: number;
  emailsOpened: number;
  /** Percentage 0-100, or null when no emails have been sent yet. */
  openRate: number | null;
  recentCampaigns: RecentCampaign[];
}

async function fetchDashboard(tenantId: string): Promise<DashboardData> {
  const [
    totalRes,
    activeRes,
    contactsRes,
    statsRes,
    recentRes,
  ] = await Promise.all([
    supabase
      .from("campaigns")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId),
    supabase
      .from("campaigns")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .neq("status", "archived"),
    supabase
      .from("contacts")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId),
    supabase
      .from("campaign_stats")
      .select("emails_sent, emails_opened")
      .eq("tenant_id", tenantId),
    supabase
      .from("campaigns")
      .select("id, name, status, created_at, sent_at, total_contacts")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const firstError =
    totalRes.error ||
    activeRes.error ||
    contactsRes.error ||
    statsRes.error ||
    recentRes.error;
  if (firstError) throw firstError;

  const emailsSent =
    statsRes.data?.reduce((acc, r) => acc + (r.emails_sent ?? 0), 0) ?? 0;
  const emailsOpened =
    statsRes.data?.reduce((acc, r) => acc + (r.emails_opened ?? 0), 0) ?? 0;

  return {
    totalCampaigns: totalRes.count ?? 0,
    activeCampaigns: activeRes.count ?? 0,
    contactsCount: contactsRes.count ?? 0,
    emailsSent,
    emailsOpened,
    openRate: emailsSent > 0 ? (emailsOpened / emailsSent) * 100 : null,
    recentCampaigns: (recentRes.data as CampaignRow[] | null)?.map((c) => ({
      id: c.id,
      name: c.name,
      status: c.status,
      created_at: c.created_at,
      sent_at: c.sent_at,
      total_contacts: c.total_contacts,
    })) ?? [],
  };
}

export function useDashboard(tenantId: string | undefined) {
  return useQuery({
    queryKey: ["dashboard", tenantId],
    queryFn: () => fetchDashboard(tenantId as string),
    enabled: !!tenantId,
    staleTime: 30_000,
  });
}
