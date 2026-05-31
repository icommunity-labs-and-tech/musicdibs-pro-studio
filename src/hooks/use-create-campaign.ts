import { useMutation, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type CampaignInsert = Database["public"]["Tables"]["campaigns"]["Insert"];

export interface CreateCampaignInput {
  tenantId: string;
  createdBy: string | null;
  name: string;
  type: string;
  vertical: string;
  goal: string | null;
  musicStyle: string | null;
  tone: string | null;
  aiPrompt: string | null;
  durationSeconds: number;
  language: string;
  deliveryChannel: string;
  subject: string | null;
  contactListId: string | null;
}

async function createCampaign(input: CreateCampaignInput): Promise<string> {
  const payload: CampaignInsert = {
    tenant_id: input.tenantId,
    created_by: input.createdBy,
    name: input.name,
    type: input.type,
    vertical: input.vertical,
    goal: input.goal,
    music_style: input.musicStyle,
    tone: input.tone,
    ai_prompt: input.aiPrompt,
    duration_seconds: input.durationSeconds,
    language: input.language,
    delivery_channel: input.deliveryChannel,
    subject: input.subject,
    contact_list_id: input.contactListId,
    status: "draft",
  };

  const { data, error } = await supabase
    .from("campaigns")
    .insert(payload)
    .select("id")
    .single();

  if (error) throw error;
  return data.id as string;
}

export function useCreateCampaign() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createCampaign,
    onSuccess: (_id, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ["campaigns", variables.tenantId],
      });
    },
  });
}
