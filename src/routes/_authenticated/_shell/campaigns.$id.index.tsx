import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  CheckCircle2,
  Layers,
  ListChecks,
  Loader2,
  Music2,
  Pencil,
  RefreshCw,
  Sparkles,
  Wand2,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

import { AudioPlayer } from "@/components/app/audio-player";
import { CampaignStatusBadge } from "@/components/app/campaign-status-badge";
import { GenerationWaveform } from "@/components/app/generation-waveform";
import { useAuth } from "@/components/auth/auth-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { isCampaignEditable } from "@/lib/campaign-status";
import {
  buildCampaignConfigRows,
  type CampaignConfigSummary,
} from "@/lib/campaign-generation-summary";
import { AI_MUSIC_STUDIO } from "@/lib/campaign-generation-options";
import { getProviderMeta } from "@/lib/providers";
import {
  useCampaignDetail,
  useGenerationJobsRealtime,
} from "@/hooks/use-campaign-detail";
import { useCampaignGenerationConfig } from "@/hooks/use-campaign-generation-config";
import {
  useProviderAudiences,
  useProviderConnections,
} from "@/hooks/use-providers";
import { useCampaignBatch, useGenerateCampaign } from "@/hooks/use-generation";
import { getBatchProgress } from "@/lib/generation";
import { GenerateCampaignDialog } from "@/components/app/generate-campaign-dialog";

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
  const generateCampaign = useGenerateCampaign();
  const [generateOpen, setGenerateOpen] = useState(false);

  useGenerationJobsRealtime(id);

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
      estimatedCredits:
        config?.estimated_credits ?? Number(campaign.cost_estimate ?? 0),
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
  const isGenerating = campaign.status === "generating";
  const canEdit = isCampaignEditable(campaign.status);
  const generatedPct =
    campaign.total_contacts > 0
      ? Math.round((campaign.generated_count / campaign.total_contacts) * 100)
      : 0;

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
            variant="secondary"
            disabled
            className="relative sm:w-auto"
            title="Disponible próximamente"
          >
            <Wand2 className="mr-1.5 h-4 w-4" />
            Generar campaña
            <Badge variant="secondary" className="ml-2 bg-muted text-xs">
              Próximamente
            </Badge>
          </Button>
        </div>
      ) : null}

      {/* Generación en curso */}
      {isGenerating ? (
        <Card>
          <CardContent className="flex flex-col gap-4 py-6 sm:flex-row sm:items-center">
            <GenerationWaveform />
            <div className="min-w-0 flex-1">
              <p className="font-medium">Generando canciones…</p>
              <p className="text-sm text-muted-foreground">
                {campaign.generated_count.toLocaleString("es-ES")} de{" "}
                {campaign.total_contacts.toLocaleString("es-ES")} listas
              </p>
              <Progress value={generatedPct} className="mt-2" />
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Audio */}
      {campaign.audio_url ? (
        <div className="space-y-2">
          <h2 className="font-display text-lg font-semibold">Audio</h2>
          <AudioPlayer src={campaign.audio_url} />
        </div>
      ) : !isGenerating ? (
        <Card>
          <CardContent className="flex items-center gap-3 py-6 text-sm text-muted-foreground">
            <Music2 className="h-5 w-5" />
            Todavía no hay audio para esta campaña.
          </CardContent>
        </Card>
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
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {metricCards.map((m) => (
              <Metric key={m.label} {...m} />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Detalles */}
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg">Detalles</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
            <Detail label="Vertical" value={campaign.vertical} />
            <Detail label="Canal" value={campaign.delivery_channel} />
            <Detail label="Creada" value={formatDateTime(campaign.created_at)} />
            <Detail
              label="Enviada"
              value={campaign.sent_at ? formatDateTime(campaign.sent_at) : "—"}
            />
          </dl>
        </CardContent>
      </Card>
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

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-dashed py-1.5 last:border-0">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium capitalize">{value}</dd>
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
