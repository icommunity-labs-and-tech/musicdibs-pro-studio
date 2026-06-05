import { useMutation, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type {
  GenerationMode,
  GenerationLanguage,
  VoiceType,
} from "@/lib/campaign-generation-options";

type CampaignInsert = Database["public"]["Tables"]["campaigns"]["Insert"];
type GenerationConfigInsert =
  Database["public"]["Tables"]["campaign_generation_configs"]["Insert"];

export interface CreateGenerationCampaignInput {
  tenantId: string;
  createdBy: string | null;
  vertical: string;
  name: string;
  generationMode: GenerationMode;
  providerConnectionId: string | null;
  providerAudienceId: string | null;
  audienceContacts: number;
  lyricsGoal: string | null;
  lyricsPrompt: string | null;
  musicStyle: string | null;
  voiceType: VoiceType | null;
  language: GenerationLanguage;
  mood: string | null;
  includeFirstName: boolean;
  estimatedCredits: number;
}

// Configuration-only: this persists the campaign draft and its generation
// configuration. NO lyrics, music, queue or delivery work happens here.
async function createGenerationCampaign(
  input: CreateGenerationCampaignInput,
): Promise<string> {
  const campaignPayload: CampaignInsert = {
    tenant_id: input.tenantId,
    created_by: input.createdBy,
    name: input.name,
    type: input.generationMode,
    vertical: input.vertical,
    language: input.language,
    music_style: input.musicStyle,
    total_contacts: input.audienceContacts,
    cost_estimate: input.estimatedCredits,
    status: "draft",
  };

  const { data: campaign, error: campaignError } = await supabase
    .from("campaigns")
    .insert(campaignPayload)
    .select("id")
    .single();

  if (campaignError) throw campaignError;
  const campaignId = campaign.id as string;

  const configPayload: GenerationConfigInsert = {
    campaign_id: campaignId,
    generation_mode: input.generationMode,
    provider_connection_id: input.providerConnectionId,
    provider_audience_id: input.providerAudienceId,
    lyrics_goal: input.lyricsGoal,
    lyrics_prompt: input.lyricsPrompt,
    music_style: input.musicStyle,
    voice_type: input.voiceType,
    language: input.language,
    mood: input.mood,
    include_first_name: input.includeFirstName,
    estimated_credits: input.estimatedCredits,
  };

  const { error: configError } = await supabase
    .from("campaign_generation_configs")
    .insert(configPayload);

  if (configError) throw configError;

  return campaignId;
}

export function useCreateGenerationCampaign() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createGenerationCampaign,
    onSuccess: (_id, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ["campaigns", variables.tenantId],
      });
    },
  });
}
