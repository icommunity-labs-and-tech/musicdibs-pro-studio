import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface AdminTenant {
  tenant_id: string;
  tenant_name: string;
  slug: string;
  plan: string;
  stripe_status: string | null;
  setup_complete: boolean;
  created_at: string;
  campaigns_this_month: number;
  campaigns_sent: number;
  campaigns_ready: number;
  campaigns_in_progress: number;
  contacts_this_month: number;
  emails_sent_this_month: number;
  emails_opened_this_month: number;
  user_count: number;
  failed_jobs_this_month: number;
}

export interface ChurnSignal {
  tenant_id: string;
  tenant_name: string;
  plan: string;
  stripe_status: string | null;
  campaigns_last_30d: number;
  campaigns_prev_30d: number;
  last_campaign_at: string | null;
  billing_issue: boolean;
  failed_jobs_7d: number;
  churn_risk: "high" | "medium" | "low" | string;
}

export interface TenantNote {
  id: string;
  tenant_id: string;
  author_id: string;
  author_email: string | null;
  body: string;
  pinned: boolean;
  created_at: string;
  updated_at: string;
}

export interface PlatformSetting {
  key: string;
  value: string | null;
  description: string | null;
}

// ── Tenants list ───────────────────────────────────────────────────────────────

export function useAdminTenants() {
  return useQuery({
    queryKey: ["admin-tenants"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenant_monthly_usage")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as AdminTenant[];
    },
    staleTime: 30_000,
  });
}

// ── Churn signals ──────────────────────────────────────────────────────────────

export function useAdminChurnSignals() {
  return useQuery({
    queryKey: ["admin-churn-signals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenant_churn_signals")
        .select("*")
        .order("churn_risk", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ChurnSignal[];
    },
    staleTime: 60_000,
  });
}

// ── Single tenant detail ───────────────────────────────────────────────────────

export function useAdminTenantDetail(tenantId: string) {
  return useQuery({
    queryKey: ["admin-tenant", tenantId],
    queryFn: async () => {
      const [usageRes, churnRes, tenantRes] = await Promise.all([
        supabase.from("tenant_monthly_usage").select("*").eq("tenant_id", tenantId).maybeSingle(),
        supabase.from("tenant_churn_signals").select("*").eq("tenant_id", tenantId).maybeSingle(),
        supabase.from("tenants").select("*").eq("id", tenantId).single(),
      ]);
      if (tenantRes.error) throw tenantRes.error;
      return {
        tenant: tenantRes.data,
        usage: usageRes.data as AdminTenant | null,
        churn: churnRes.data as ChurnSignal | null,
      };
    },
    enabled: !!tenantId,
    staleTime: 30_000,
  });
}

// ── Tenant campaigns/contacts/team (360 view) ─────────────────────────────────

export function useAdminTenantCampaigns(tenantId: string) {
  return useQuery({
    queryKey: ["admin-tenant-campaigns", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaigns")
        .select("id, name, status, created_at, sent_at, total_contacts")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!tenantId,
    staleTime: 30_000,
  });
}

export function useAdminTenantTeam(tenantId: string) {
  return useQuery({
    queryKey: ["admin-tenant-team", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, role, created_at")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!tenantId,
    staleTime: 60_000,
  });
}

// ── Tenant notes ───────────────────────────────────────────────────────────────

export function useTenantNotes(tenantId: string) {
  return useQuery({
    queryKey: ["admin-tenant-notes", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenant_notes")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("pinned", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as TenantNote[];
    },
    enabled: !!tenantId,
    staleTime: 15_000,
  });
}

export function useAddTenantNote(tenantId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ body, pinned = false }: { body: string; pinned?: boolean }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("tenant_notes").insert({
        tenant_id: tenantId,
        author_id: user!.id,
        author_email: user!.email ?? null,
        body: body.trim(),
        pinned,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin-tenant-notes", tenantId] });
    },
    onError: (e: Error) => toast.error("Error al guardar nota", { description: e.message }),
  });
}

export function useToggleNotePin(tenantId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, pinned }: { id: string; pinned: boolean }) => {
      const { error } = await supabase.from("tenant_notes").update({ pinned }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["admin-tenant-notes", tenantId] }),
  });
}

export function useDeleteTenantNote(tenantId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tenant_notes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["admin-tenant-notes", tenantId] }),
  });
}

// ── Platform settings ─────────────────────────────────────────────────────────

export function usePlatformSettings() {
  return useQuery({
    queryKey: ["platform-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("platform_settings").select("key, value, description").order("key");
      if (error) throw error;
      return (data ?? []) as PlatformSetting[];
    },
    staleTime: 60_000,
  });
}

export function useUpdatePlatformSetting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      const { error } = await supabase.from("platform_settings").update({ value }).eq("key", key);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["platform-settings"] });
      toast.success("Configuración guardada");
    },
    onError: (e: Error) => toast.error("Error al guardar", { description: e.message }),
  });
}

// ── Impersonate ───────────────────────────────────────────────────────────────

export function useImpersonateTenant() {
  return useMutation({
    mutationFn: async (tenantId: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("No session");
      const res = await supabase.functions.invoke("impersonate-tenant", {
        body: { tenant_id: tenantId },
      });
      if (res.error) throw new Error(res.error.message);
      return res.data as { magic_link: string; impersonated_email: string };
    },
    onSuccess: (data) => {
      toast.success(`Enlace generado para ${data.impersonated_email}`, {
        description: "Se abrirá en una nueva pestaña",
        duration: 5000,
      });
      window.open(data.magic_link, "_blank", "noopener,noreferrer");
    },
    onError: (e: Error) => toast.error("No se pudo impersonar", { description: e.message }),
  });
}

// ── Change plan ───────────────────────────────────────────────────────────────

export function useAdminChangePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ tenantId, plan }: { tenantId: string; plan: string }) => {
      const { error } = await supabase.from("tenants").update({ plan }).eq("id", tenantId);
      if (error) throw error;
    },
    onSuccess: (_d, { tenantId }) => {
      void qc.invalidateQueries({ queryKey: ["admin-tenant", tenantId] });
      void qc.invalidateQueries({ queryKey: ["admin-tenants"] });
      toast.success("Plan actualizado");
    },
    onError: (e: Error) => toast.error("Error al cambiar plan", { description: e.message }),
  });
}
