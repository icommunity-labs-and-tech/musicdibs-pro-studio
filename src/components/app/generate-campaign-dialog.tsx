import { Loader2, Sparkles, Wand2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AI_MUSIC_STUDIO,
  GENERATION_MODES,
  type GenerationMode,
} from "@/lib/campaign-generation-options";

export interface GenerateCampaignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignName: string;
  generationMode: GenerationMode | null;
  audienceSize: number;
  estimatedCredits: number;
  isPending: boolean;
  onConfirm: () => void;
}

export function GenerateCampaignDialog({
  open,
  onOpenChange,
  campaignName,
  generationMode,
  audienceSize,
  estimatedCredits,
  isPending,
  onConfirm,
}: GenerateCampaignDialogProps) {
  const isSingle = generationMode === "single_song";
  const modeLabel =
    GENERATION_MODES.find((m) => m.value === generationMode)?.label ?? "—";

  const songsSentence = isSingle
    ? "Esta campaña generará 1 canción."
    : `Esta campaña generará ${audienceSize.toLocaleString("es-ES")} canciones personalizadas.`;

  const rows: { label: string; value: string }[] = [
    { label: "Campaña", value: campaignName || "—" },
    { label: "Modo de generación", value: modeLabel },
    {
      label: "Tamaño de la audiencia",
      value: isSingle ? "1 canción" : audienceSize.toLocaleString("es-ES"),
    },
    {
      label: "Créditos estimados",
      value: estimatedCredits.toLocaleString("es-ES"),
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display">
            <Sparkles className="h-4 w-4 text-primary" />
            Generar campaña
          </DialogTitle>
          <DialogDescription>
            {songsSentence} {AI_MUSIC_STUDIO}.
          </DialogDescription>
        </DialogHeader>

        <dl className="divide-y divide-border rounded-xl border">
          {rows.map((r) => (
            <div
              key={r.label}
              className="flex items-center justify-between gap-4 px-4 py-3"
            >
              <dt className="text-sm text-muted-foreground">{r.label}</dt>
              <dd className="text-right text-sm font-medium">{r.value}</dd>
            </div>
          ))}
        </dl>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancelar
          </Button>
          <Button onClick={onConfirm} disabled={isPending || !generationMode}>
            {isPending ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Wand2 className="mr-1.5 h-4 w-4" />
            )}
            Confirmar generación
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
