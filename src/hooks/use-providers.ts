import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import {
  createConnector,
  type ProviderStatus,
  type ProviderType,
  type AudienceType,
} from "@/lib/providers";

export interface ProviderConnection {
  id: string;
  tenant_id: string;
  provider_type: ProviderType;
  status: ProviderStatus;
  last_sync_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProviderAudienceRow {
  id: string;
  provider_connection_id: string;
  external_id: string;
  name: string;
  audience_type: AudienceType;
  contacts_count: number;
  last_sync_at: string | null;
  created_at: string;
}

// ── Connections ─────────────────────────────────────────────────────────────

async function fetchConnections(
  tenantId: string,
): Promise<ProviderConnection[]> {
  const { data, error } = await supabase
    .from("provider_connections")
    .select(
      "id, tenant_id, provider_type, status, last_sync_at, created_at, updated_at",
    )
    .eq("tenant_id", tenantId);

  if (error) throw error;
  return (data ?? []) as ProviderConnection[];
}

export function useProviderConnections(tenantId: string | undefined) {
  return useQuery({
    queryKey: ["provider-connections", tenantId],
    queryFn: () => fetchConnections(tenantId as string),
    enabled: !!tenantId,
    staleTime: 30_000,
  });
}

export function useConnectProvider(tenantId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      providerType,
      apiKey,
    }: {
      providerType: ProviderType;
      apiKey: string;
    }) => {
      if (!tenantId) throw new Error("Tenant no disponible");

      // Run the (mocked) connector flow before persisting.
      const connector = createConnector(providerType);
      const result = await connector.connect({ apiKey });

      // NOTE: credentials are stored as-is for now (mock). A future task will
      // encrypt these server-side before persistence.
      const { error } = await supabase.from("provider_connections").upsert(
        {
          tenant_id: tenantId,
          provider_type: providerType,
          status: result.status,
          encrypted_credentials: { apiKey },
          last_sync_at: null,
        },
        { onConflict: "tenant_id,provider_type" },
      );
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["provider-connections", tenantId],
      });
    },
  });
}

export function useDisconnectProvider(tenantId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (providerType: ProviderType) => {
      if (!tenantId) throw new Error("Tenant no disponible");

      const connector = createConnector(providerType);
      await connector.disconnect();

      const { error } = await supabase
        .from("provider_connections")
        .update({ status: "disconnected", encrypted_credentials: null })
        .eq("tenant_id", tenantId)
        .eq("provider_type", providerType);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["provider-connections", tenantId],
      });
    },
  });
}

// ── Audiences ────────────────────────────────────────────────────────────────

async function fetchAudiences(
  tenantId: string,
): Promise<ProviderAudienceRow[]> {
  const { data, error } = await supabase
    .from("provider_audiences")
    .select(
      "id, provider_connection_id, external_id, name, audience_type, contacts_count, last_sync_at, created_at",
    )
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as ProviderAudienceRow[];
}

export function useProviderAudiences(tenantId: string | undefined) {
  return useQuery({
    queryKey: ["provider-audiences", tenantId],
    queryFn: () => fetchAudiences(tenantId as string),
    enabled: !!tenantId,
    staleTime: 30_000,
  });
}
