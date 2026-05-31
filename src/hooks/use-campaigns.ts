import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type CampaignRow = Database["public"]["Tables"]["campaigns"]["Row"];

export interface CampaignListItem {
  id: string;
  name: string;
  status: string;
  type: string;
  vertical: string;
  total_contacts: number;
  created_at: string;
  sent_at: string | null;
}

async function fetchCampaigns(tenantId: string): Promise<CampaignListItem[]> {
  const { data, error } = await supabase
    .from("campaigns")
    .select("id, name, status, type, vertical, total_contacts, created_at, sent_at")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data as CampaignRow[] | null)?.map((c) => ({
    id: c.id,
    name: c.name,
    status: c.status,
    type: c.type,
    vertical: c.vertical,
    total_contacts: c.total_contacts,
    created_at: c.created_at,
    sent_at: c.sent_at,
  })) ?? [];
}

export function useCampaigns(tenantId: string | undefined) {
  return useQuery({
    queryKey: ["campaigns", tenantId],
    queryFn: () => fetchCampaigns(tenantId as string),
    enabled: !!tenantId,
    staleTime: 30_000,
  });
}
