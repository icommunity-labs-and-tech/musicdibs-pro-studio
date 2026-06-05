import { Download, Loader2, Music4, RefreshCw, Sparkles } from "lucide-react";

import { AudioPlayer } from "@/components/app/audio-player";
import { GenerationWaveform } from "@/components/app/generation-waveform";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AI_MUSIC_STUDIO } from "@/lib/campaign-generation-options";
import type {
  GenerationAsset,
  GenerationBatchRow,
  GenerationJob,
} from "@/hooks/use-generation";

type StageStatus = "pending" | "processing" | "completed" | "failed" | string;

const STAGE_LABELS: Record<string, string> = {
  pending: "Pendiente",
  processing: "Procesando",
  completed: "Completado",
  failed: "Fallido",
};

const STAGE_CLASSES: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  processing: "bg-teal text-night-900",
  completed: "bg-success text-success-foreground",
  failed: "bg-destructive text-destructive-foreground",
};

function StageBadge({ status }: { status: StageStatus }) {
  const cls = STAGE_CLASSES[status] ?? "bg-muted text-muted-foreground";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}
    >
      {status === "processing" ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : null}
      {STAGE_LABELS[status] ?? status}
    </span>
  );
}

function formatDuration(seconds: number | null): string {
  if (!seconds || !Number.isFinite(seconds)) return "—";
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function StudioFooter() {
  return (
    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <Sparkles className="h-3.5 w-3.5 text-primary" />
      {AI_MUSIC_STUDIO}
    </p>
  );
}

export interface CampaignGenerationPanelProps {
  job: GenerationJob | null;
  batch: GenerationBatchRow | null;
  assets: GenerationAsset[];
  isRetryingLyrics: boolean;
  isRetryingMusic: boolean;
  onRetryLyrics: () => void;
  onRetryMusic: () => void;
}

export function CampaignGenerationPanel({
  job,
  batch,
  assets,
  isRetryingLyrics,
  isRetryingMusic,
  onRetryLyrics,
  onRetryMusic,
}: CampaignGenerationPanelProps) {
  const lyricsStatus = job?.lyrics_status ?? "pending";
  const musicStatus = job?.music_status ?? "pending";
  const audioAssets = assets.filter((a) => a.asset_type === "audio" && a.public_url);
  const isCompleted = musicStatus === "completed" && audioAssets.length > 0;
  const isActive =
    job != null &&
    job.status !== "completed" &&
    job.status !== "failed" &&
    (lyricsStatus === "processing" || musicStatus === "processing");

  const lyricsFailed = lyricsStatus === "failed";
  const musicFailed = musicStatus === "failed";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-display text-lg">
          <Music4 className="h-4 w-4 text-primary" />
          Progreso de generación
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Stage status */}
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border bg-muted/30 p-4">
            <p className="text-xs font-medium text-muted-foreground">Letra</p>
            <div className="mt-2">
              <StageBadge status={lyricsStatus} />
            </div>
          </div>
          <div className="rounded-xl border bg-muted/30 p-4">
            <p className="text-xs font-medium text-muted-foreground">Música</p>
            <div className="mt-2">
              <StageBadge status={musicStatus} />
            </div>
          </div>
          <div className="rounded-xl border bg-muted/30 p-4">
            <p className="text-xs font-medium text-muted-foreground">Lote</p>
            <div className="mt-2">
              <StageBadge status={batch?.status ?? "pending"} />
            </div>
          </div>
        </div>

        {/* Active animation */}
        {isActive ? (
          <div className="flex items-center gap-4 rounded-xl border p-4">
            <GenerationWaveform />
            <div>
              <p className="font-medium">
                {lyricsStatus === "processing"
                  ? "Generando la letra…"
                  : "Componiendo la música…"}
              </p>
              <p className="text-sm text-muted-foreground">
                Esto puede tardar unos minutos.
              </p>
            </div>
          </div>
        ) : null}

        {/* Errors + retries */}
        {lyricsFailed || musicFailed ? (
          <div className="space-y-3 rounded-xl border border-destructive/40 bg-destructive/5 p-4">
            <p className="text-sm font-medium text-destructive">
              {job?.error_message ?? "La generación ha fallado."}
            </p>
            <div className="flex flex-wrap gap-2">
              {lyricsFailed ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onRetryLyrics}
                  disabled={isRetryingLyrics}
                >
                  {isRetryingLyrics ? (
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-1.5 h-4 w-4" />
                  )}
                  Reintentar letra
                </Button>
              ) : null}
              {musicFailed ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onRetryMusic}
                  disabled={isRetryingMusic}
                >
                  {isRetryingMusic ? (
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-1.5 h-4 w-4" />
                  )}
                  Reintentar música
                </Button>
              ) : null}
            </div>
          </div>
        ) : null}

        {/* Generated songs */}
        {isCompleted ? (
          <div className="space-y-3">
            <h3 className="font-display text-base font-semibold">Canciones generadas</h3>
            <div className="space-y-4">
              {audioAssets.map((asset, index) => {
                const versionLabel = `Versión ${String.fromCharCode(65 + index)}`;
                const title =
                  (asset.metadata?.title as string | undefined) ?? versionLabel;
                return (
                  <div key={asset.id} className="space-y-2 rounded-xl border p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold">{versionLabel}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {title} · {formatDuration(asset.duration_seconds)}
                        </p>
                      </div>
                      <Button asChild size="sm" variant="outline">
                        <a href={asset.public_url ?? "#"} download>
                          <Download className="mr-1.5 h-4 w-4" />
                          Descargar
                        </a>
                      </Button>
                    </div>
                    {asset.public_url ? <AudioPlayer src={asset.public_url} /> : null}
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        <StudioFooter />
      </CardContent>
    </Card>
  );
}
