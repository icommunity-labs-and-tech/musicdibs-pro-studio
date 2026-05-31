import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type TenantSettingsRow =
  Database["public"]["Tables"]["tenant_settings"]["Row"];

export interface ApiKeys {
  mailerlite?: string;
  brevo?: string;
}

export interface TenantSettings {
  id: string | null;
  support_email: string | null;
  website: string | null;
  timezone: string | null;
  api_keys: ApiKeys;
}

function parseApiKeys(value: unknown): ApiKeys {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const v = value as Record<string, unknown>;
    return {
      mailerlite:
        typeof v.mailerlite === "string" ? v.mailerlite : undefined,
      brevo: typeof v.brevo === "string" ? v.brevo : undefined,
    };
  }
  return {};
}

async function fetchTenantSettings(
  tenantId: string,
): Promise<TenantSettings> {
  const { data, error } = await supabase
    .from("tenant_settings")
    .select("id, support_email, website, timezone, api_keys")
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (error) throw error;

  const row = data as Pick<
    TenantSettingsRow,
    "id" | "support_email" | "website" | "timezone" | "api_keys"
  > | null;

  return {
    id: row?.id ?? null,
    support_email: row?.support_email ?? null,
    website: row?.website ?? null,
    timezone: row?.timezone ?? null,
    api_keys: parseApiKeys(row?.api_keys),
  };
}

export function useTenantSettings(tenantId: string | undefined) {
  return useQuery({
    queryKey: ["tenant-settings", tenantId],
    queryFn: () => fetchTenantSettings(tenantId as string),
    enabled: !!tenantId,
    staleTime: 60_000,
  });
}

export interface SettingsUpdate {
  support_email?: string | null;
  website?: string | null;
  timezone?: string | null;
  api_keys?: ApiKeys;
}

export function useUpdateTenantSettings(tenantId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (update: SettingsUpdate) => {
      if (!tenantId) throw new Error("Tenant no disponible");
      const { api_keys, ...rest } = update;
      const payload: Database["public"]["Tables"]["tenant_settings"]["Insert"] =
        {
          tenant_id: tenantId,
          ...rest,
          ...(api_keys !== undefined ? { api_keys } : {}),
        };
      const { error } = await supabase
        .from("tenant_settings")
        .upsert(payload, { onConflict: "tenant_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["tenant-settings", tenantId],
      });
    },
  });
}

export function useUpdateTenantName(tenantId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      if (!tenantId) throw new Error("Tenant no disponible");
      const { error } = await supabase
        .from("tenants")
        .update({ name: name.trim() })
        .eq("id", tenantId);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["dashboard", tenantId] });
    },
  });
}
