import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

export interface TeamMember {
  id: string;
  full_name: string | null;
  role: string;
  avatar_url: string | null;
  is_superadmin: boolean;
  created_at: string;
}

export interface TeamInvitation {
  id: string;
  email: string;
  role: string;
  status: string;
  created_at: string;
  expires_at: string;
}

async function fetchMembers(tenantId: string): Promise<TeamMember[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, role, avatar_url, is_superadmin, created_at")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as TeamMember[];
}

async function fetchInvitations(tenantId: string): Promise<TeamInvitation[]> {
  const { data, error } = await supabase
    .from("tenant_invitations")
    .select("id, email, role, status, created_at, expires_at")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as TeamInvitation[];
}

export function useTeamMembers(tenantId: string | undefined) {
  return useQuery({
    queryKey: ["team-members", tenantId],
    queryFn: () => fetchMembers(tenantId as string),
    enabled: !!tenantId,
    staleTime: 30_000,
  });
}

export function useTeamInvitations(tenantId: string | undefined) {
  return useQuery({
    queryKey: ["team-invitations", tenantId],
    queryFn: () => fetchInvitations(tenantId as string),
    enabled: !!tenantId,
    staleTime: 30_000,
  });
}

export function useInviteMember(tenantId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ email, role }: { email: string; role: string }) => {
      const { data, error } = await supabase.functions.invoke("invite-member", {
        body: { email: email.trim().toLowerCase(), role },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as { invite_url: string; email_sent: boolean };
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["team-invitations", tenantId],
      });
    },
  });
}

export function useCancelInvitation(tenantId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("tenant_invitations")
        .update({ status: "revoked" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["team-invitations", tenantId],
      });
    },
  });
}
