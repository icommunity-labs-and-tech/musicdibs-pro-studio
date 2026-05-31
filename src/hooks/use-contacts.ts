import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type ContactRow = Database["public"]["Tables"]["contacts"]["Row"];

export interface ContactItem {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  company: string | null;
  phone: string | null;
  status: string;
  list_id: string | null;
  created_at: string;
}

export interface ContactsFilters {
  tenantId: string | undefined;
  listId?: string | null;
  search?: string;
}

async function fetchContacts(
  tenantId: string,
  listId: string | null | undefined,
  search: string | undefined,
): Promise<ContactItem[]> {
  let query = supabase
    .from("contacts")
    .select(
      "id, email, first_name, last_name, company, phone, status, list_id, created_at",
    )
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .limit(500);

  if (listId) query = query.eq("list_id", listId);

  if (search && search.trim()) {
    const term = `%${search.trim()}%`;
    query = query.or(
      `email.ilike.${term},first_name.ilike.${term},last_name.ilike.${term},company.ilike.${term}`,
    );
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data as ContactRow[] | null)?.map((c) => ({
    id: c.id,
    email: c.email,
    first_name: c.first_name,
    last_name: c.last_name,
    company: c.company,
    phone: c.phone,
    status: c.status,
    list_id: c.list_id,
    created_at: c.created_at,
  })) ?? [];
}

export function useContacts({ tenantId, listId, search }: ContactsFilters) {
  return useQuery({
    queryKey: ["contacts", tenantId, listId ?? null, search ?? ""],
    queryFn: () => fetchContacts(tenantId as string, listId, search),
    enabled: !!tenantId,
    staleTime: 20_000,
  });
}

export interface NewContact {
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  company?: string | null;
  phone?: string | null;
}

/** Inserta uno o varios contactos para el tenant en una lista opcional. */
export function useCreateContacts(tenantId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      contacts,
      listId,
    }: {
      contacts: NewContact[];
      listId: string | null;
    }) => {
      if (!tenantId) throw new Error("Tenant no disponible");
      const rows = contacts.map((c) => ({
        tenant_id: tenantId,
        list_id: listId,
        email: c.email.trim().toLowerCase(),
        first_name: c.first_name?.trim() || null,
        last_name: c.last_name?.trim() || null,
        company: c.company?.trim() || null,
        phone: c.phone?.trim() || null,
      }));
      const { error, count } = await supabase
        .from("contacts")
        .insert(rows, { count: "exact" });
      if (error) throw error;
      return count ?? rows.length;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["contacts", tenantId] });
      void queryClient.invalidateQueries({
        queryKey: ["contact-lists", tenantId],
      });
      void queryClient.invalidateQueries({ queryKey: ["dashboard", tenantId] });
    },
  });
}

export function useDeleteContact(tenantId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("contacts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["contacts", tenantId] });
      void queryClient.invalidateQueries({
        queryKey: ["contact-lists", tenantId],
      });
      void queryClient.invalidateQueries({ queryKey: ["dashboard", tenantId] });
    },
  });
}
