import { useMemo } from "react";
import { createFileRoute, Navigate, Link } from "@tanstack/react-router";
import { AlertTriangle, ArrowLeft } from "lucide-react";

import {
  CampaignBuilder,
  EMPTY_BUILDER_STATE,
  type BuilderState,
} from "@/components/app/campaign-builder";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { isCampaignEditable } from "@/lib/campaign-status";
import type {
  GenerationLanguage,
  GenerationMode,
  VoiceType,
} from "@/lib/campaign-generation-options";
import { useCampaignDetail } from "@/hooks/use-campaign-detail";
import { useCampaignGenerationConfig } from "@/hooks/use-campaign-generation-config";

export const Route = createFileRoute(
  "/_authenticated/_shell/campaigns/$id/edit",
)({
  head: () => ({ meta: [{ title: "Editar campaña · Musicdibs Enterprise" }] }),
  component: CampaignEditPage,
});

function CampaignEditPage() {
  const { id } = Route.useParams();
  const {
    data: detail,
    isLoading: detailLoading,
    isError,
  } = useCampaignDetail(id);
  const { data: config, isLoading: configLoading } =
    useCampaignGenerationConfig(id);

  const initialState = useMemo<BuilderState | null>(() => {
    if (!detail) return null;
    const { campaign } = detail;
    return {
      ...EMPTY_BUILDER_STATE,
      name: campaign.name ?? "",
      generationMode: (config?.generation_mode ??
        campaign.type ??
        "") as GenerationMode | "",
      audienceId: config?.provider_audience_id ?? "",
      deliveryChannel: (config?.delivery_channel ?? "email") as
        | "email"
        | "whatsapp"
        | "sms"
        | "whatsapp_cloud",
      lyricsGoal: config?.lyrics_goal ?? campaign.goal ?? "",
      lyricsPrompt: config?.lyrics_prompt ?? campaign.ai_prompt ?? "",
      musicStyle: config?.music_style ?? campaign.music_style ?? "",
      voiceType: (config?.voice_type ?? "") as VoiceType | "",
      language: (config?.language ??
        campaign.language ??
        "es") as GenerationLanguage,
      mood: config?.mood ?? campaign.tone ?? "",
      includeFirstName: config?.include_first_name ?? false,
      emailSubject: config?.email_subject ?? "",
      emailBody: config?.email_body ?? "",
    };
  }, [detail, config]);

  if (detailLoading || configLoading) return <EditSkeleton />;

  if (isError || !detail) {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-4">
        <BackLink id={id} />
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <p className="text-sm text-muted-foreground">
              No pudimos cargar esta campaña.
            </p>
            <Button asChild variant="outline">
              <Link to="/campaigns/$id" params={{ id }}>
                Volver a la campaña
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Editing is only allowed for draft campaigns.
  if (!isCampaignEditable(detail.campaign.status)) {
    return <Navigate to="/campaigns/$id" params={{ id }} />;
  }

  return (
    <CampaignBuilder
      mode="edit"
      campaignId={id}
      initialState={initialState ?? EMPTY_BUILDER_STATE}
      title="Editar campaña"
      subtitle="Modifica la configuración de tu campaña en borrador."
      banner={
        <div className="flex items-center gap-2 rounded-xl border border-gold/40 bg-gold/10 px-4 py-3 text-sm">
          <AlertTriangle className="h-4 w-4 shrink-0 text-gold" />
          <span className="font-medium">Editando campaña en borrador</span>
        </div>
      }
    />
  );
}

function BackLink({ id }: { id: string }) {
  return (
    <Link
      to="/campaigns/$id"
      params={{ id }}
      className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="mr-1 h-4 w-4" />
      Campaña
    </Link>
  );
}

function EditSkeleton() {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-9 w-64" />
      <Skeleton className="h-12 w-full rounded-xl" />
      <Skeleton className="h-64 w-full rounded-2xl" />
    </div>
  );
}
