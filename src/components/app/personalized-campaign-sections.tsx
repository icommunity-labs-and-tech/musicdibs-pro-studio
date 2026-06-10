import { useEffect, useState } from "react";
import { BarChart2, Loader2, Save, Send, Share2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  usePersonalizedExperienceContent,
  usePersonalizedPlaybackStats,
  useUpdatePersonalizedExperienceContent,
} from "@/hooks/use-personalized-experience";
import type { PersonalizedDelivery } from "@/hooks/use-generation";

function Metric({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
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

// ── CARD 1 · Experience page content ─────────────────────────────────────────
export function PersonalizedExperienceContentCard({
  campaignId,
}: {
  campaignId: string;
}) {
  const { data, isLoading } = usePersonalizedExperienceContent(campaignId);
  const update = useUpdatePersonalizedExperienceContent(campaignId);

  const [message, setMessage] = useState("");
  const [ctaTitle, setCtaTitle] = useState("");
  const [ctaUrl, setCtaUrl] = useState("");

  useEffect(() => {
    if (!data) return;
    setMessage(data.message_content ?? data.email_body ?? "");
    setCtaTitle(data.cta_title ?? "");
    setCtaUrl(data.cta_url ?? "");
  }, [data]);

  const handleSave = () => {
    update.mutate(
      { message, ctaTitle, ctaUrl },
      {
        onSuccess: () => toast.success("Experiencia actualizada"),
        onError: (e: unknown) =>
          toast.error("No se pudo actualizar la experiencia", {
            description: e instanceof Error ? e.message : undefined,
          }),
      },
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-display text-lg">
          <Share2 className="h-4 w-4 text-primary" />
          Página de experiencia
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Configura el mensaje y el botón que aparecen en todas las páginas de
          experiencia individuales de esta campaña.
        </p>

        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <Label htmlFor="pe-message">Mensaje</Label>
              <Textarea
                id="pe-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Gracias por formar parte de nuestra comunidad..."
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pe-cta-title">Título del botón</Label>
              <Input
                id="pe-cta-title"
                value={ctaTitle}
                onChange={(e) => setCtaTitle(e.target.value)}
                placeholder="Descubre más"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pe-cta-url">URL del botón</Label>
              <Input
                id="pe-cta-url"
                value={ctaUrl}
                onChange={(e) => setCtaUrl(e.target.value)}
                placeholder="https://tu-web.com"
              />
            </div>
            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={update.isPending}>
                {update.isPending ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-1.5 h-4 w-4" />
                )}
                Guardar
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ── CARD 2 · Distribution (Resend) ───────────────────────────────────────────
export function PersonalizedDistributionCard({
  status,
  deliveries,
  onSend,
  isSending,
}: {
  status: string;
  deliveries: PersonalizedDelivery[];
  onSend: () => void;
  isSending: boolean;
}) {
  const [sendStep, setSendStep] = useState<0 | 1 | 2>(0);
  const [pendingStep, setPendingStep] = useState<0 | 1 | 2>(0);

  const readyCount = deliveries.filter((d) => d.status === "ready").length;
  const sentCount = deliveries.filter((d) => d.status === "sent").length;
  const failedCount = deliveries.filter((d) => d.status === "failed").length;
  const total = deliveries.length;
  const successRate = total > 0 ? Math.round((sentCount / total) * 100) : 0;

  const isGenerating = status === "draft" || status === "generating";
  const isReadyToSend = status === "ready_to_send";
  const isSent = status === "sent";

  // Deliveries that became ready after the first send batch (e.g. late
  // fallback generations) and were therefore never sent.
  const pendingDeliveries = isSent
    ? deliveries.filter((d) => d.status === "ready")
    : [];

  const handleSend = () => {
    setSendStep(0);
    onSend();
  };

  const handleSendPending = () => {
    setPendingStep(0);
    onSend();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-display text-lg">
          <Send className="h-4 w-4 text-primary" />
          Distribución
          <Badge variant="outline" className="ml-auto">
            Resend
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* State A — generating */}
        {isGenerating ? (
          <p className="text-sm text-muted-foreground">
            Las canciones se están generando. Cuando todas estén listas, podrás
            enviarlas por email a cada contacto.
          </p>
        ) : null}

        {/* State B — ready to send */}
        {isReadyToSend ? (
          <div className="space-y-4">
            <p className="text-sm">
              <span className="font-semibold">{readyCount}</span> canciones
              listas para enviar
            </p>
            <Button
              className="bg-gold text-night-900 hover:bg-gold-dark"
              onClick={() => setSendStep(1)}
              disabled={isSending}
            >
              {isSending ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-1.5 h-4 w-4" />
              )}
              Enviar canciones personalizadas
            </Button>
          </div>
        ) : null}

        {/* State C — sent */}
        {isSent ? (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Metric
                label="Emails enviados"
                value={sentCount.toLocaleString("es-ES")}
              />
              <Metric
                label="Fallidos"
                value={failedCount.toLocaleString("es-ES")}
              />
              <Metric label="Tasa de éxito" value={`${successRate}%`} />
              <Metric
                label="Total contactos"
                value={total.toLocaleString("es-ES")}
              />
            </div>

            {/* Pending deliveries that were not part of the first batch */}
            {pendingDeliveries.length > 0 ? (
              <div className="space-y-3 rounded-xl border border-amber-300/60 bg-amber-50 p-4 dark:border-amber-500/30 dark:bg-amber-500/10">
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  Hay {pendingDeliveries.length} entrega(s) lista(s) que no se
                  enviaron en el primer lote (p. ej. generación de fallback que
                  terminó tarde).
                </p>
                <Button
                  variant="outline"
                  onClick={() => setPendingStep(1)}
                  disabled={isSending}
                >
                  {isSending ? (
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="mr-1.5 h-4 w-4" />
                  )}
                  Enviar pendientes ({pendingDeliveries.length})
                </Button>
              </div>
            ) : null}
          </div>
        ) : null}
      </CardContent>


      {/* Send — step 1: irreversible warning */}
      <Dialog
        open={sendStep === 1}
        onOpenChange={(o) => {
          if (!o) setSendStep(0);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enviar canciones personalizadas</DialogTitle>
            <DialogDescription>
              Cada contacto recibirá su canción única por email a través de
              Resend en los próximos minutos. Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSendStep(0)}>
              Cancelar
            </Button>
            <Button
              className="bg-gold text-night-900 hover:bg-gold-dark"
              onClick={() => setSendStep(2)}
            >
              Continuar →
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send — step 2: final confirmation */}
      <Dialog
        open={sendStep === 2}
        onOpenChange={(o) => {
          if (!o && !isSending) setSendStep(0);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Confirmas el envío?</DialogTitle>
            <DialogDescription>
              Una vez enviadas, las canciones no podrán cancelarse ni
              modificarse.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSendStep(0)}
              disabled={isSending}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleSend}
              disabled={isSending}
            >
              {isSending ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-1.5 h-4 w-4" />
              )}
              Enviar ahora
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send pending — step 1: recipient list */}
      <Dialog
        open={pendingStep === 1}
        onOpenChange={(o) => {
          if (!o) setPendingStep(0);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enviar entregas pendientes</DialogTitle>
            <DialogDescription>
              Se enviará la canción a los {pendingDeliveries.length}{" "}
              destinatario(s) que quedaron listos después del primer envío.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-64 space-y-1 overflow-y-auto rounded-lg border p-2">
            {pendingDeliveries.map((d) => (
              <div
                key={d.id}
                className="flex items-center justify-between gap-3 rounded-md px-2 py-1.5 text-sm"
              >
                <span className="truncate">
                  {d.first_name?.trim() || "Anónimo"}
                </span>
                <Badge variant="outline" className="shrink-0">
                  Lista
                </Badge>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingStep(0)}>
              Cancelar
            </Button>
            <Button
              className="bg-gold text-night-900 hover:bg-gold-dark"
              onClick={() => setPendingStep(2)}
            >
              Continuar →
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send pending — step 2: final confirmation */}
      <Dialog
        open={pendingStep === 2}
        onOpenChange={(o) => {
          if (!o && !isSending) setPendingStep(0);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Confirmas el envío?</DialogTitle>
            <DialogDescription>
              Una vez enviadas, las canciones no podrán cancelarse ni
              modificarse.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPendingStep(0)}
              disabled={isSending}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleSendPending}
              disabled={isSending}
            >
              {isSending ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-1.5 h-4 w-4" />
              )}
              Enviar ahora
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>

  );
}

// ── CARD 3 · Playback analytics ──────────────────────────────────────────────
export function PersonalizedPlaybackCard({
  campaignId,
}: {
  campaignId: string;
}) {
  const { data } = usePersonalizedPlaybackStats(campaignId, true);

  const totalPlays = data?.totalPlays ?? 0;
  const totalUnique = data?.totalUnique ?? 0;
  const totalCompletions = data?.totalCompletions ?? 0;
  const completionRate =
    totalPlays > 0 ? Math.round((totalCompletions / totalPlays) * 100) : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-display text-lg">
          <BarChart2 className="h-4 w-4 text-primary" />
          Analítica de reproducción
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-3">
          <Metric
            label="Reproducciones"
            value={totalPlays.toLocaleString("es-ES")}
          />
          <Metric
            label="Oyentes únicos"
            value={totalUnique.toLocaleString("es-ES")}
          />
          <Metric
            label="Completadas"
            value={totalCompletions.toLocaleString("es-ES")}
            hint={completionRate > 0 ? `${completionRate}% tasa` : undefined}
          />
        </div>
      </CardContent>
    </Card>
  );
}
