import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import {
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

// Credentials are NEVER written from the browser. The manage-provider-connection
// edge function encrypts and persists them server-side with the service role.
async function callProviderFn(payload: {
  action:
    | "connect"
    | "disconnect"
    | "test_connection"
    | "sync_audiences"
    | "get_connection_status";
  provider_type: ProviderType;
  api_key?: string;
  // Twilio-specific credential fields (snake_case as the edge fn expects).
  account_sid?: string;
  auth_token?: string;
  whatsapp_from?: string;
  sms_from?: string;
  // WhatsApp Business (Cloud API) credential fields.
  access_token?: string;
  phone_number_id?: string;
  waba_id?: string;
  template_name?: string;
  template_language?: string;
  // Salesforce CRM (Sales Cloud) credential fields.
  instance_url?: string;
  client_id?: string;
  client_secret?: string;
  api_version?: string;
  campaign_filter?: string;
}) {
  const { data, error } = await supabase.functions.invoke(
    "manage-provider-connection",
    { body: payload },
  );
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

export function useConnectProvider(tenantId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      providerType,
      apiKey,
    }: {
      providerType: ProviderType;
      /** Omit / empty to reconnect with the previously stored key. */
      apiKey?: string;
    }) => {
      if (!tenantId) throw new Error("Tenant no disponible");
      // The API key leaves the browser exactly once, to the edge function.
      // When empty, the server reuses the credentials it already has on file.
      await callProviderFn({
        action: "connect",
        provider_type: providerType,
        ...(apiKey && apiKey.trim() ? { api_key: apiKey.trim() } : {}),
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["provider-connections", tenantId],
      });
    },
  });
}

// ── Twilio (WhatsApp/SMS) ─────────────────────────────────────────────────
// Twilio is an ADDITIVE channel: connecting it does NOT disconnect the active
// email provider (the edge function skips the "single active connector" logic
// for provider_type === "twilio").

export interface TwilioCredentialsInput {
  accountSid: string;
  authToken: string;
  whatsappFrom?: string;
  smsFrom?: string;
}

export function useConnectTwilio(tenantId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (creds: TwilioCredentialsInput) => {
      if (!tenantId) throw new Error("Tenant no disponible");
      await callProviderFn({
        action: "connect",
        provider_type: "twilio",
        account_sid: creds.accountSid.trim(),
        auth_token: creds.authToken.trim(),
        whatsapp_from: creds.whatsappFrom?.trim() ?? "",
        sms_from: creds.smsFrom?.trim() ?? "",
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["provider-connections", tenantId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["twilio-status", tenantId],
      });
    },
  });
}

export interface TwilioStatus {
  connected: boolean;
  status?: ProviderStatus;
  last_sync_at?: string | null;
  has_api_key?: boolean;
  whatsapp_from?: string;
  sms_from?: string;
}

export function useTwilioStatus(tenantId: string | undefined) {
  return useQuery({
    queryKey: ["twilio-status", tenantId],
    queryFn: async (): Promise<TwilioStatus> =>
      (await callProviderFn({
        action: "get_connection_status",
        provider_type: "twilio",
      })) as TwilioStatus,
    enabled: !!tenantId,
    staleTime: 30_000,
  });
}

// ── WhatsApp Business (Cloud API de Meta) ──────────────────────────────────
// Additive channel like Twilio: connecting it does NOT disconnect the active
// email provider. Credentials are validated + stored server-side.

export interface WhatsAppCredentialsInput {
  accessToken: string;
  phoneNumberId: string;
  wabaId?: string;
  templateName?: string;
  templateLanguage?: string;
}

export function useConnectWhatsApp(tenantId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (creds: WhatsAppCredentialsInput) => {
      if (!tenantId) throw new Error("Tenant no disponible");
      await callProviderFn({
        action: "connect",
        provider_type: "whatsapp",
        access_token: creds.accessToken.trim(),
        phone_number_id: creds.phoneNumberId.trim(),
        waba_id: creds.wabaId?.trim() ?? "",
        template_name: creds.templateName?.trim() ?? "",
        template_language: creds.templateLanguage?.trim() ?? "",
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["provider-connections", tenantId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["whatsapp-status", tenantId],
      });
    },
  });
}

export interface WhatsAppStatus {
  connected: boolean;
  status?: ProviderStatus;
  last_sync_at?: string | null;
  has_api_key?: boolean;
  phone_number_id?: string;
  waba_id?: string;
  template_name?: string;
  template_language?: string;
}

export function useWhatsAppStatus(tenantId: string | undefined) {
  return useQuery({
    queryKey: ["whatsapp-status", tenantId],
    queryFn: async (): Promise<WhatsAppStatus> =>
      (await callProviderFn({
        action: "get_connection_status",
        provider_type: "whatsapp",
      })) as WhatsAppStatus,
    enabled: !!tenantId,
    staleTime: 30_000,
  });
}


// ── Salesforce CRM (Sales Cloud) ───────────────────────────────────────────
// Additive: fuente de audiencias (Campaigns), no canal de envío. Convive con
// el proveedor de email activo y con Twilio/WhatsApp.

export interface SalesforceCredentialsInput {
  instanceUrl: string;
  clientId: string;
  clientSecret: string;
  apiVersion?: string;
  campaignFilter?: string;
}

export function useConnectSalesforce(tenantId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (creds: SalesforceCredentialsInput) => {
      if (!tenantId) throw new Error("Tenant no disponible");
      await callProviderFn({
        action: "connect",
        provider_type: "salesforce_crm",
        instance_url: creds.instanceUrl.trim(),
        client_id: creds.clientId.trim(),
        client_secret: creds.clientSecret.trim(),
        api_version: creds.apiVersion?.trim() ?? "",
        campaign_filter: creds.campaignFilter?.trim() ?? "",
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["provider-connections", tenantId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["salesforce-status", tenantId],
      });
    },
  });
}

export interface SalesforceStatus {
  connected: boolean;
  status?: ProviderStatus;
  last_sync_at?: string | null;
  has_api_key?: boolean;
  instance_url?: string;
  campaign_filter?: string;
  api_version?: string;
}

export function useSalesforceStatus(tenantId: string | undefined) {
  return useQuery({
    queryKey: ["salesforce-status", tenantId],
    queryFn: async (): Promise<SalesforceStatus> =>
      (await callProviderFn({
        action: "get_connection_status",
        provider_type: "salesforce_crm",
      })) as SalesforceStatus,
    enabled: !!tenantId,
    staleTime: 30_000,
  });
}


export function useDisconnectProvider(tenantId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (providerType: ProviderType) => {
      if (!tenantId) throw new Error("Tenant no disponible");
      await callProviderFn({
        action: "disconnect",
        provider_type: providerType,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["provider-connections", tenantId],
      });
    },
  });
}

export interface SyncAudiencesResult {
  success: boolean;
  provider_type: ProviderType;
  synced_count: number;
  last_sync_at: string;
}

export function useSyncAudiences(tenantId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (providerType: ProviderType): Promise<SyncAudiencesResult> => {
      if (!tenantId) throw new Error("Tenant no disponible");
      // All MailerLite calls run server-side; the API key never leaves the server.
      return (await callProviderFn({
        action: "sync_audiences",
        provider_type: providerType,
      })) as SyncAudiencesResult;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["provider-connections", tenantId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["provider-audiences", tenantId],
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
