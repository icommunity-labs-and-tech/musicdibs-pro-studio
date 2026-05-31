import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

export interface ContactListItem {
  id: string;
  name: string;
  contact_count: number;
}

async function fetchContactLists(tenantId: string): Promise<ContactListItem[]> {
  const { data, error } = await supabase
    .from("contact_lists")
    .select("id, name, contact_count")
    .eq("tenant_id", tenantId)
    .order("name", { ascending: true });

  if (error) throw error;
  return (data ?? []) as ContactListItem[];
}

export function useContactLists(tenantId: string | undefined) {
  return useQuery({
    queryKey: ["contact-lists", tenantId],
    queryFn: () => fetchContactLists(tenantId as string),
    enabled: !!tenantId,
    staleTime: 60_000,
  });
}
