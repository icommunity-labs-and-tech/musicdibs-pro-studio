import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type {
  GenerationMode,
  GenerationLanguage,
  VoiceType,
} from "@/lib/campaign-generation-options";
import type { DeliveryChannel } from "@/components/app/campaign-builder";

type CampaignInsert = Database["public"]["Tables"]["campaigns"]["Insert"];
type CampaignUpdate = Database["public"]["Tables"]["campaigns"]["Update"];
type GenerationConfigInsert =
  Database["public"]["Tables"]["campaign_generation_configs"]["Insert"];
export type GenerationConfigRow =
  Database["public"]["Tables"]["campaign_generation_configs"]["Row"];

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
  emailSubject: string | null;
  emailBody: string | null;
  estimatedCredits: number;
}

export interface UpdateGenerationCampaignInput
  extends CreateGenerationCampaignInput {
  campaignId: string;
}

// Build the generation-config payload shared by create + update so the
// Builder → Database mapping lives in exactly one place.
function buildConfigPayload(
  campaignId: string,
  input: CreateGenerationCampaignInput,
): GenerationConfigInsert {
  return {
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
    email_subject: input.emailSubject,
    email_body: input.emailBody,
    estimated_credits: input.estimatedCredits,
  };
}

// Keep the `campaigns` row consistent with the generation config so summary
// fields persist correctly across the whole chain (single source of truth).
function buildCampaignFields(input: CreateGenerationCampaignInput) {
  return {
    name: input.name,
    type: input.generationMode,
    vertical: input.vertical,
    language: input.language,
    music_style: input.musicStyle,
    goal: input.lyricsGoal,
    ai_prompt: input.lyricsPrompt,
    tone: input.mood,
    total_contacts: input.audienceContacts,
    cost_estimate: input.estimatedCredits,
  };
}

// Configuration-only: this persists the campaign draft and its generation
// configuration. NO lyrics, music, queue or delivery work happens here.
async function createGenerationCampaign(
  input: CreateGenerationCampaignInput,
): Promise<string> {
  const campaignPayload: CampaignInsert = {
    tenant_id: input.tenantId,
    created_by: input.createdBy,
    status: "draft",
    ...buildCampaignFields(input),
  };

  const { data: campaign, error: campaignError } = await supabase
    .from("campaigns")
    .insert(campaignPayload)
    .select("id")
    .single();

  if (campaignError) throw campaignError;
  const campaignId = campaign.id as string;

  const { error: configError } = await supabase
    .from("campaign_generation_configs")
    .insert(buildConfigPayload(campaignId, input));

  if (configError) throw configError;

  return campaignId;
}

// Update an EXISTING draft campaign + its generation config. Never creates a
// new campaign. The config row is upserted on its unique campaign_id.
async function updateGenerationCampaign(
  input: UpdateGenerationCampaignInput,
): Promise<string> {
  const campaignPayload: CampaignUpdate = {
    ...buildCampaignFields(input),
    updated_at: new Date().toISOString(),
  };

  const { error: campaignError } = await supabase
    .from("campaigns")
    .update(campaignPayload)
    .eq("id", input.campaignId);

  if (campaignError) throw campaignError;

  const { error: configError } = await supabase
    .from("campaign_generation_configs")
    .upsert(buildConfigPayload(input.campaignId, input), {
      onConflict: "campaign_id",
    });

  if (configError) throw configError;

  return input.campaignId;
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

export function useUpdateCampaign() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateGenerationCampaign,
    onSuccess: (campaignId, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ["campaigns", variables.tenantId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["campaign", campaignId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["campaign-generation-config", campaignId],
      });
    },
  });
}

async function fetchGenerationConfig(
  campaignId: string,
): Promise<GenerationConfigRow | null> {
  const { data, error } = await supabase
    .from("campaign_generation_configs")
    .select("*")
    .eq("campaign_id", campaignId)
    .maybeSingle();

  if (error) throw error;
  return (data as GenerationConfigRow | null) ?? null;
}

export function useCampaignGenerationConfig(campaignId: string) {
  return useQuery({
    queryKey: ["campaign-generation-config", campaignId],
    queryFn: () => fetchGenerationConfig(campaignId),
    staleTime: 15_000,
  });
}
