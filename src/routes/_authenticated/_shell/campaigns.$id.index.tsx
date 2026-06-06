import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ListChecks,
  Loader2,
  Pencil,
  RefreshCw,
  Sparkles,
  Wand2,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

import { CampaignStatusBadge } from "@/components/app/campaign-status-badge";
import { CampaignGenerationPanel } from "@/components/app/campaign-generation-panel";
import { CampaignReviewPanel } from "@/components/app/campaign-review-panel";
import { ExperiencePanel } from "@/components/app/experience-panel";
import { useAuth } from "@/components/auth/auth-provider";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import {
  isCampaignApproved,
  isCampaignEditable,
  isCampaignReviewing,
} from "@/lib/campaign-status";
import {
  buildCampaignConfigRows,
  type CampaignConfigSummary,
} from "@/lib/campaign-generation-summary";
import {
  AI_MUSIC_STUDIO,
  calculateEstimatedCredits,
  type GenerationMode,
} from "@/lib/campaign-generation-options";
import { getProviderMeta } from "@/lib/providers";
import { useCampaignDetail } from "@/hooks/use-campaign-detail";
import { useCampaignGenerationConfig } from "@/hooks/use-campaign-generation-config";
import {
  useProviderAudiences,
  useProviderConnections,
} from "@/hooks/use-providers";
import {
  useCampaignAssets,
  useCampaignBatch,
  useCampaignJob,
  useCampaignGenerationRealtime,
  useGenerateCampaign,
  useRetryLyrics,
  useRetryMusic,
} from "@/hooks/use-generation";
import { GenerateCampaignDialog } from "@/components/app/generate-campaign-dialog";
import { useCampaignExperience } from "@/hooks/use-experience";

export const Route = createFileRoute("/_authenticated/_shell/campaigns/$id/")({
  head: () => ({ meta: [{ title: "Campaña · Musicdibs Enterprise" }] }),
  component: CampaignDetailPage,
});

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function CampaignDetailPage() {
  const { id } = Route.useParams();
  const queryClient = useQueryClient();
  const { tenant } = useAuth();
  const { data, isLoading, isError, refetch } = useCampaignDetail(id);
  const { data: config } = useCampaignGenerationConfig(id);
  const { data: audiences } = useProviderAudiences(tenant?.id);
  const { data: connections } = useProviderConnections(tenant?.id);

  const { data: batch } = useCampaignBatch(id);
  const { data: job } = useCampaignJob(id);
  const { data: assets } = useCampaignAssets(id);
  const { data: experience } = useCampaignExperience(id);
  const generateCampaign = useGenerateCampaign();
  const retryLyrics = useRetryLyrics();
  const retryMusic = useRetryMusic();
  const [generateOpen, setGenerateOpen] = useState(false);

  useCampaignGenerationRealtime(id);

  const syncStats = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.functions.invoke("sync-campaign-stats", {
        body: { campaign_id: id },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["campaign", id] });
      toast.success("Estadísticas actualizadas");
    },
    onError: (e: unknown) => {
      toast.error("No pudimos sincronizar", {
        description: e instanceof Error ? e.message : undefined,
      });
    },
  });

  // Single source of truth: same mapping the Builder Review uses.
  const configSummary = useMemo<CampaignConfigSummary | null>(() => {
    if (!data) return null;
    const { campaign } = data;

    const audience = config?.provider_audience_id
      ? (audiences ?? []).find((a) => a.id === config.provider_audience_id) ??
        null
      : null;

    let providerLabel: string | null = null;
    if (config?.provider_connection_id) {
      const connection = (connections ?? []).find(
        (c) => c.id === config.provider_connection_id,
      );
      if (connection) {
        try {
          providerLabel = getProviderMeta(connection.provider_type).label;
        } catch {
          providerLabel = connection.provider_type;
        }
      }
    }

    return {
      generationMode: (config?.generation_mode ?? campaign.type ?? null) as
        | CampaignConfigSummary["generationMode"],
      audienceName: audience?.name ?? null,
      audienceSize: campaign.total_contacts ?? audience?.contacts_count ?? null,
      providerLabel,
      lyricsGoal: config?.lyrics_goal ?? campaign.goal ?? null,
      lyricsPrompt: config?.lyrics_prompt ?? campaign.ai_prompt ?? null,
      musicStyle: config?.music_style ?? campaign.music_style ?? null,
      voiceType: (config?.voice_type ?? null) as
        | CampaignConfigSummary["voiceType"],
      language: config?.language ?? campaign.language ?? null,
      mood: config?.mood ?? campaign.tone ?? null,
      includeFirstName: config?.include_first_name ?? false,
      // Always derived from the shared helper — never trust stored values so
      // every screen shows the same number under the current pricing rule.
      estimatedCredits: calculateEstimatedCredits(
        (config?.generation_mode ?? campaign.type ?? "") as GenerationMode | "",
        campaign.total_contacts ?? audience?.contacts_count ?? 0,
      ),
    };
  }, [data, config, audiences, connections]);

  if (isLoading) return <DetailSkeleton />;

  if (isError || !data) {
    return (
      <div className="mx-auto w-full max-w-4xl space-y-4">
        <BackLink />
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <p className="text-sm text-muted-foreground">
              No pudimos cargar esta campaña.
            </p>
            <Button variant="outline" onClick={() => void refetch()}>
              Reintentar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { campaign, stats } = data;
  const canEdit = isCampaignEditable(campaign.status);
  const hasGeneration = Boolean(job || (batch && batch.status !== "draft"));

  const approvedAssetId =
    (campaign as { approved_asset_id?: string | null }).approved_asset_id ??
    null;
  const lyricsAsset = (assets ?? []).find((a) => a.asset_type === "lyrics");
  // Experience uses the explicitly approved version (never auto-picks one).
  const approvedAudioAsset = (assets ?? []).find(
    (a) => a.id === approvedAssetId,
  );

  const isReviewing = isCampaignReviewing(campaign.status);
  const isApproved = isCampaignApproved(campaign.status);
  // Legacy "completed" campaigns predate the review flow — still let users
  // review/approve them so their generated versions can be published.
  const inReviewPhase = isReviewing || isApproved || campaign.status === "completed";

  // Confirmation modal inputs. Single song only in this sprint.
  const generationMode = (configSummary?.generationMode || null) as
    | GenerationMode
    | null;
  const audienceSize =
    configSummary?.audienceSize ?? campaign.total_contacts ?? 0;
  const estimatedCredits = configSummary?.estimatedCredits ?? 0;

  const handleConfirmGeneration = () => {
    if (!tenant?.id || !generationMode) return;
    generateCampaign.mutate(
      { tenantId: tenant.id, campaignId: id },
      {
        onSuccess: () => {
          setGenerateOpen(false);
          toast.success("Generación iniciada", {
            description: "Estamos creando la letra y la música.",
          });
        },
        onError: (e: unknown) => {
          toast.error("No pudimos iniciar la generación", {
            description: e instanceof Error ? e.message : undefined,
          });
        },
      },
    );
  };

  const handleRetryLyrics = () => {
    if (!tenant?.id) return;
    retryLyrics.mutate(
      { tenantId: tenant.id, campaignId: id },
      {
        onSuccess: () => toast.success("Reintentando la letra"),
        onError: (e: unknown) =>
          toast.error("No pudimos reintentar la letra", {
            description: e instanceof Error ? e.message : undefined,
          }),
      },
    );
  };

  const handleRetryMusic = () => {
    if (!tenant?.id) return;
    retryMusic.mutate(
      { tenantId: tenant.id, campaignId: id },
      {
        onSuccess: () => toast.success("Reintentando la música"),
        onError: (e: unknown) =>
          toast.error("No pudimos reintentar la música", {
            description: e instanceof Error ? e.message : undefined,
          }),
      },
    );
  };

  const openRate =
    stats && stats.emails_sent > 0
      ? (stats.emails_opened / stats.emails_sent) * 100
      : null;
  const clickRate =
    stats && stats.emails_sent > 0
      ? (stats.emails_clicked / stats.emails_sent) * 100
      : null;

  const metricCards: { label: string; value: string; hint?: string }[] = [
    {
      label: "Emails enviados",
      value: (stats?.emails_sent ?? 0).toLocaleString("es-ES"),
    },
    {
      label: "Tasa de apertura",
      value: openRate !== null ? `${openRate.toFixed(1)}%` : "—",
      hint: stats ? `${stats.emails_opened.toLocaleString("es-ES")} aperturas` : undefined,
    },
    {
      label: "Tasa de clics",
      value: clickRate !== null ? `${clickRate.toFixed(1)}%` : "—",
      hint: stats ? `${stats.emails_clicked.toLocaleString("es-ES")} clics` : undefined,
    },
    {
      label: "Bajas",
      value: (stats?.unsubscribes ?? 0).toLocaleString("es-ES"),
    },
  ];

  const playCompletionRate =
    experience && experience.play_count > 0
      ? Math.round((experience.completion_count / experience.play_count) * 100)
      : null;

  const playbackMetricCards: { label: string; value: string; hint?: string }[] =
    experience
      ? [
          {
            label: "Reproducciones",
            value: experience.play_count.toLocaleString("es-ES"),
          },
          {
            label: "Oyentes únicos",
            value: experience.unique_visitors.toLocaleString("es-ES"),
          },
          {
            label: "Completadas",
            value: experience.completion_count.toLocaleString("es-ES"),
            hint:
              playCompletionRate !== null
                ? `${playCompletionRate}% tasa`
                : undefined,
          },
          {
            label: "Descargas",
            value: experience.download_count.toLocaleString("es-ES"),
          },
        ]
      : [];

  const configRows = configSummary
    ? buildCampaignConfigRows(configSummary)
    : [];

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <BackLink />

      {/* Cabecera */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-display text-2xl font-bold sm:text-3xl">
              {campaign.name}
            </h1>
            <CampaignStatusBadge status={campaign.status} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {campaign.vertical} ·{" "}
            {campaign.total_contacts.toLocaleString("es-ES")} contactos
          </p>
        </div>
        <Button asChild variant="outline" size="sm" className="shrink-0">
          <Link to="/campaigns/$id/queue" params={{ id }}>
            <ListChecks className="mr-1.5 h-4 w-4" />
            Ver cola
          </Link>
        </Button>
      </div>

      {/* Acciones (solo en borrador) */}
      {canEdit ? (
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button asChild className="sm:w-auto">
            <Link to="/campaigns/$id/edit" params={{ id }}>
              <Pencil className="mr-1.5 h-4 w-4" />
              Editar campaña
            </Link>
          </Button>
          <Button
            className="sm:w-auto"
            onClick={() => setGenerateOpen(true)}
            disabled={!generationMode}
          >
            <Wand2 className="mr-1.5 h-4 w-4" />
            Generar campaña
          </Button>
        </div>
      ) : null}

      {/* Progreso de generación */}
      {hasGeneration ? (
        <CampaignGenerationPanel
          job={job ?? null}
          batch={batch ?? null}
          isRetryingLyrics={retryLyrics.isPending}
          isRetryingMusic={retryMusic.isPending}
          onRetryLyrics={handleRetryLyrics}
          onRetryMusic={handleRetryMusic}
        />
      ) : null}

      {/* Revisión y aprobación de versiones (Single Song) */}
      {inReviewPhase ? (
        <CampaignReviewPanel
          campaignId={id}
          status={campaign.status}
          assets={assets ?? []}
          approvedAssetId={approvedAssetId}
          onRegenerate={handleConfirmGeneration}
          isRegenerating={generateCampaign.isPending}
        />
      ) : null}

      {/* Página de experiencia (gated: solo desde campaña aprobada) */}
      {inReviewPhase ? (
        <ExperiencePanel
          campaignId={id}
          tenantId={tenant?.id}
          generationJobId={job?.id ?? null}
          audioAssetId={approvedAudioAsset?.id ?? null}
          lyricsAssetId={lyricsAsset?.id ?? null}
          defaultTitle={campaign.name}
          approved={isApproved}
        />
      ) : null}

      {/* Configuración de AI Music Studio */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-display text-lg">
            <Sparkles className="h-4 w-4 text-primary" />
            Configuración de {AI_MUSIC_STUDIO}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <dl className="divide-y divide-border rounded-xl border">
            {configRows.map((r) => (
              <div
                key={r.label}
                className="flex items-center justify-between gap-4 px-4 py-3"
              >
                <dt className="text-sm text-muted-foreground">{r.label}</dt>
                <dd className="text-right text-sm font-medium">{r.value}</dd>
              </div>
            ))}
          </dl>

          {configSummary?.lyricsGoal ? (
            <div className="rounded-xl border p-4">
              <p className="text-xs font-medium text-muted-foreground">
                Objetivo de la campaña
              </p>
              <p className="mt-1 text-sm">{configSummary.lyricsGoal}</p>
            </div>
          ) : null}

          {configSummary?.lyricsPrompt ? (
            <div className="rounded-xl border p-4">
              <p className="text-xs font-medium text-muted-foreground">
                Instrucciones para la letra
              </p>
              <p className="mt-1 text-sm">{configSummary.lyricsPrompt}</p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Estadísticas */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="font-display text-lg">Estadísticas</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => syncStats.mutate()}
            disabled={syncStats.isPending}
          >
            {syncStats.isPending ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-1.5 h-4 w-4" />
            )}
            Sincronizar
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <p className="mb-2 text-sm font-medium text-muted-foreground">
              Email
            </p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {metricCards.map((m) => (
                <Metric key={m.label} {...m} />
              ))}
            </div>
          </div>

          {playbackMetricCards.length > 0 ? (
            <div>
              <p className="mb-2 text-sm font-medium text-muted-foreground">
                Analítica de reproducción
              </p>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {playbackMetricCards.map((m) => (
                  <Metric key={m.label} {...m} />
                ))}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <GenerateCampaignDialog
        open={generateOpen}
        onOpenChange={setGenerateOpen}
        campaignName={campaign.name}
        generationMode={generationMode}
        audienceSize={audienceSize}
        estimatedCredits={estimatedCredits}
        isPending={generateCampaign.isPending}
        onConfirm={handleConfirmGeneration}
      />
    </div>
  );
}

function BackLink() {
  return (
    <Link
      to="/campaigns"
      className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="mr-1 h-4 w-4" />
      Campañas
    </Link>
  );
}

function Metric({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: LucideIcon;
}) {
  return (
    <div className="rounded-xl border bg-muted/30 p-4">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-2xl font-bold">{value}</p>
      {hint ? (
        <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}


function DetailSkeleton() {
  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-9 w-64" />
      <Skeleton className="h-20 w-full rounded-2xl" />
      <Skeleton className="h-40 w-full rounded-2xl" />
      <Skeleton className="h-40 w-full rounded-2xl" />
    </div>
  );
}
