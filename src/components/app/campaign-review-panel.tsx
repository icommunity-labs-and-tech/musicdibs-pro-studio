import { useMemo } from "react";
import {
  CheckCircle2,
  History,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

import { AudioPlayer } from "@/components/app/audio-player";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AI_MUSIC_STUDIO } from "@/lib/campaign-generation-options";
import { isCampaignApproved } from "@/lib/campaign-status";
import {
  useApproveCampaign,
  useSelectApprovedAsset,
  type GenerationAsset,
} from "@/hooks/use-generation";

/** Single Song campaigns include the first round + 2 regenerations. */
export const MAX_GENERATION_ROUNDS = 3;

function formatDuration(seconds: number | null): string {
  if (!seconds || !Number.isFinite(seconds)) return "—";
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface VersionItem {
  asset: GenerationAsset;
  /** Global letter (A, B, C, …) across all rounds. */
  letter: string;
}

interface RoundGroup {
  round: number;
  generatedAt: string;
  versions: VersionItem[];
}

export interface CampaignReviewPanelProps {
  campaignId: string;
  status: string;
  assets: GenerationAsset[];
  approvedAssetId: string | null;
  onRegenerate: () => void;
  isRegenerating: boolean;
}

export function CampaignReviewPanel({
  campaignId,
  status,
  assets,
  approvedAssetId,
  onRegenerate,
  isRegenerating,
}: CampaignReviewPanelProps) {
  const selectAsset = useSelectApprovedAsset(campaignId);
  const approve = useApproveCampaign(campaignId);

  const approved = isCampaignApproved(status);

  // Group audio assets into rounds (oldest round first), assigning global
  // version letters A/B, C/D, E/F across rounds.
  const { rounds, currentRound } = useMemo(() => {
    const audio = assets
      .filter((a) => a.asset_type === "audio" && a.public_url)
      .sort((a, b) => {
        if (a.generation_round !== b.generation_round)
          return a.generation_round - b.generation_round;
        return (
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
      });

    const byRound = new Map<number, GenerationAsset[]>();
    for (const a of audio) {
      const list = byRound.get(a.generation_round) ?? [];
      list.push(a);
      byRound.set(a.generation_round, list);
    }

    let letterIndex = 0;
    const groups: RoundGroup[] = [];
    for (const round of [...byRound.keys()].sort((a, b) => a - b)) {
      const list = byRound.get(round)!;
      const versions: VersionItem[] = list.map((asset) => ({
        asset,
        letter: String.fromCharCode(65 + letterIndex++),
      }));
      groups.push({
        round,
        generatedAt: list[0]?.created_at ?? new Date().toISOString(),
        versions,
      });
    }

    const maxRound = groups.length
      ? Math.max(...groups.map((g) => g.round))
      : 1;

    return { rounds: groups, currentRound: maxRound };
  }, [assets]);

  const remaining = Math.max(0, MAX_GENERATION_ROUNDS - currentRound);
  const canRegenerate = currentRound < MAX_GENERATION_ROUNDS;

  const latestRound = rounds[rounds.length - 1];

  const handleSelect = (assetId: string) => {
    selectAsset.mutate(assetId, {
      onSuccess: () => toast.success("Versión seleccionada"),
      onError: (e: unknown) =>
        toast.error("No pudimos guardar la selección", {
          description: e instanceof Error ? e.message : undefined,
        }),
    });
  };

  const handleApprove = () => {
    if (!approvedAssetId) return;
    approve.mutate(undefined, {
      onSuccess: () => toast.success("Versión aprobada"),
      onError: (e: unknown) =>
        toast.error("No pudimos aprobar la versión", {
          description: e instanceof Error ? e.message : undefined,
        }),
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-display text-lg">
          <ShieldCheck className="h-4 w-4 text-primary" />
          Revisar canciones generadas
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {approved ? (
          <div className="flex items-center gap-2 rounded-xl border border-success/40 bg-success/5 p-4 text-sm">
            <CheckCircle2 className="h-4 w-4 text-success" />
            <span>
              Has aprobado una versión. Ya puedes crear la experiencia y
              publicarla.
            </span>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Escucha las versiones generadas, elige la ganadora y apruébala. Solo
            las versiones aprobadas pueden usarse en experiencias y campañas.
          </p>
        )}

        {/* Latest round — selection workspace */}
        {latestRound ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-base font-semibold">
                Ronda {latestRound.round}
              </h3>
              <Badge variant="outline">
                Ronda {currentRound} de {MAX_GENERATION_ROUNDS}
              </Badge>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {latestRound.versions.map((v) => (
                <VersionCard
                  key={v.asset.id}
                  item={v}
                  selected={approvedAssetId === v.asset.id}
                  disabled={approved || selectAsset.isPending}
                  onSelect={() => handleSelect(v.asset.id)}
                />
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Aún no hay versiones generadas.
          </p>
        )}

        {/* Approve + regenerate actions */}
        {!approved ? (
          <div className="flex flex-wrap items-center gap-3 rounded-xl border p-4">
            <Button
              onClick={handleApprove}
              disabled={!approvedAssetId || approve.isPending}
            >
              {approve.isPending ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="mr-1.5 h-4 w-4" />
              )}
              Aprobar versión seleccionada
            </Button>

            {canRegenerate ? (
              <Button
                variant="outline"
                onClick={onRegenerate}
                disabled={isRegenerating}
              >
                {isRegenerating ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-1.5 h-4 w-4" />
                )}
                Regenerar canción
              </Button>
            ) : null}

            <p className="text-xs text-muted-foreground">
              {canRegenerate
                ? `${remaining} regeneración${remaining === 1 ? "" : "es"} restante${
                    remaining === 1 ? "" : "s"
                  }.`
                : "Has alcanzado el máximo de generaciones de revisión."}
            </p>
          </div>
        ) : null}

        {/* Generation history */}
        {rounds.length > 0 ? (
          <div className="space-y-3">
            <h3 className="flex items-center gap-2 font-display text-base font-semibold">
              <History className="h-4 w-4 text-primary" />
              Historial de generación
            </h3>
            <div className="divide-y divide-border rounded-xl border">
              {[...rounds].reverse().map((g) => {
                const approvedHere = g.versions.find(
                  (v) => v.asset.id === approvedAssetId,
                );
                return (
                  <div key={g.round} className="space-y-1 px-4 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-medium">Ronda {g.round}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDateTime(g.generatedAt)}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Versiones: {g.versions.map((v) => v.letter).join(", ")}
                      {approvedHere ? (
                        <span className="ml-2 inline-flex items-center gap-1 text-success">
                          <CheckCircle2 className="h-3 w-3" />
                          Aprobada: Versión {approvedHere.letter}
                        </span>
                      ) : null}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          {AI_MUSIC_STUDIO}
        </p>
      </CardContent>
    </Card>
  );
}

function VersionCard({
  item,
  selected,
  disabled,
  onSelect,
}: {
  item: VersionItem;
  selected: boolean;
  disabled: boolean;
  onSelect: () => void;
}) {
  const { asset, letter } = item;
  const title = (asset.metadata?.title as string | undefined) ?? null;

  return (
    <div
      className={`space-y-3 rounded-xl border p-4 ${
        selected ? "border-success ring-1 ring-success/40" : ""
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold">Versión {letter}</p>
          <p className="truncate text-xs text-muted-foreground">
            {title ? `${title} · ` : ""}
            {formatDuration(asset.duration_seconds)}
          </p>
        </div>
        {selected ? (
          <Badge className="bg-success text-success-foreground">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            Seleccionada
          </Badge>
        ) : null}
      </div>

      <p className="text-xs text-muted-foreground">
        Generada: {formatDateTime(asset.created_at)}
      </p>

      {asset.public_url ? <AudioPlayer src={asset.public_url} /> : null}

      <Button
        size="sm"
        variant={selected ? "outline" : "default"}
        className="w-full"
        onClick={onSelect}
        disabled={disabled || selected}
      >
        {selected ? "Versión seleccionada" : "Seleccionar versión"}
      </Button>
    </div>
  );
}
