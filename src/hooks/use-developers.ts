import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

export interface ApiKeyItem {
  id: string;
  name: string;
  key_prefix: string;
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
}

export interface WebhookItem {
  id: string;
  name: string;
  url: string;
  events: string[];
  active: boolean;
  created_at: string;
}

export const WEBHOOK_EVENTS: { value: string; label: string }[] = [
  { value: "campaign.sent", label: "Campaña enviada" },
  { value: "campaign.generated", label: "Audio generado" },
  { value: "contact.created", label: "Contacto creado" },
  { value: "contact.unsubscribed", label: "Baja de contacto" },
];

// ── API keys ──────────────────────────────────────────────────────────────

async function fetchApiKeys(tenantId: string): Promise<ApiKeyItem[]> {
  const { data, error } = await supabase
    .from("tenant_api_keys")
    .select("id, name, key_prefix, created_at, last_used_at, revoked_at")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as ApiKeyItem[];
}

export function useApiKeys(tenantId: string | undefined) {
  return useQuery({
    queryKey: ["api-keys", tenantId],
    queryFn: () => fetchApiKeys(tenantId as string),
    enabled: !!tenantId,
    staleTime: 30_000,
  });
}

function randomHex(bytes: number): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}

export function useCreateApiKey(tenantId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ name }: { name: string }) => {
      if (!tenantId) throw new Error("Tenant no disponible");
      const { data: userData } = await supabase.auth.getUser();
      // Genera la clave en el cliente; sólo guardamos su hash.
      const secret = `mdb_live_${randomHex(24)}`;
      const key_prefix = secret.slice(0, 12);
      const key_hash = await sha256Hex(secret);

      const { error } = await supabase.from("tenant_api_keys").insert({
        tenant_id: tenantId,
        name: name.trim() || "Default",
        key_prefix,
        key_hash,
        created_by: userData.user?.id ?? null,
      });
      if (error) throw error;
      return { secret };
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["api-keys", tenantId] });
    },
  });
}

export function useRevokeApiKey(tenantId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("tenant_api_keys")
        .update({ revoked_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["api-keys", tenantId] });
    },
  });
}

// ── Webhooks ────────────────────────────────────────────────────────────────

async function fetchWebhooks(tenantId: string): Promise<WebhookItem[]> {
  const { data, error } = await supabase
    .from("tenant_webhooks")
    .select("id, name, url, events, active, created_at")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as WebhookItem[];
}

export function useWebhooks(tenantId: string | undefined) {
  return useQuery({
    queryKey: ["webhooks", tenantId],
    queryFn: () => fetchWebhooks(tenantId as string),
    enabled: !!tenantId,
    staleTime: 30_000,
  });
}

export function useCreateWebhook(tenantId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      name,
      url,
      events,
    }: {
      name: string;
      url: string;
      events: string[];
    }) => {
      if (!tenantId) throw new Error("Tenant no disponible");
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase.from("tenant_webhooks").insert({
        tenant_id: tenantId,
        name: name.trim() || "Webhook",
        url: url.trim(),
        events: events.length > 0 ? events : ["campaign.sent"],
        secret: `whsec_${randomHex(24)}`,
        created_by: userData.user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["webhooks", tenantId] });
    },
  });
}

export function useDeleteWebhook(tenantId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("tenant_webhooks")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["webhooks", tenantId] });
    },
  });
}
