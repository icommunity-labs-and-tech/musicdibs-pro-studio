import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

export interface AuditLogItem {
  id: string;
  action: string;
  resource_type: string;
  resource_name: string | null;
  actor_email: string | null;
  created_at: string;
}

export interface AuditFilters {
  tenantId: string | undefined;
  action?: string | null;
  resourceType?: string | null;
}

async function fetchAuditLogs(
  tenantId: string,
  action: string | null | undefined,
  resourceType: string | null | undefined,
): Promise<AuditLogItem[]> {
  let query = supabase
    .from("audit_logs")
    .select("id, action, resource_type, resource_name, actor_email, created_at")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .limit(200);

  if (action) query = query.eq("action", action);
  if (resourceType) query = query.eq("resource_type", resourceType);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as AuditLogItem[];
}

export function useAuditLogs({ tenantId, action, resourceType }: AuditFilters) {
  return useQuery({
    queryKey: ["audit-logs", tenantId, action ?? "all", resourceType ?? "all"],
    queryFn: () => fetchAuditLogs(tenantId as string, action, resourceType),
    enabled: !!tenantId,
    staleTime: 20_000,
  });
}

export const AUDIT_ACTIONS: { value: string; label: string }[] = [
  { value: "create", label: "Creación" },
  { value: "update", label: "Actualización" },
  { value: "delete", label: "Eliminación" },
  { value: "send", label: "Envío" },
  { value: "invite", label: "Invitación" },
  { value: "accept", label: "Aceptación" },
  { value: "revoke", label: "Revocación" },
];

export const AUDIT_RESOURCES: { value: string; label: string }[] = [
  { value: "campaign", label: "Campaña" },
  { value: "contact", label: "Contacto" },
  { value: "invitation", label: "Invitación" },
  { value: "api_key", label: "API key" },
  { value: "webhook", label: "Webhook" },
];

export function labelFor(
  options: { value: string; label: string }[],
  value: string,
): string {
  return options.find((o) => o.value === value)?.label ?? value;
}
