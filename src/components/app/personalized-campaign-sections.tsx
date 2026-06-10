import { useEffect, useState } from "react";
import {
  BarChart2,
  ExternalLink,
  Loader2,
  Save,
  Send,
  Share2,
} from "lucide-react";
import { toast } from "sonner";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { buildExperienceUrl } from "@/lib/experience/ExperienceService";
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
  usePersonalizedCampaignAnalytics,
  usePersonalizedExperienceContent,
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
  const [approved, setApproved] = useState(false);

  // Reset approval gate whenever we (re)enter the ready_to_send state.
  useEffect(() => {
    if (status !== "ready_to_send") setApproved(false);
  }, [status]);

  const readyCount = deliveries.filter((d) => d.status === "ready").length;
  const sampleDeliveries = deliveries
    .filter((d) => d.status === "ready" && d.experience_token)
    .slice(0, 5);

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

            {/* Pre-send preview / approval gate */}
            <div className="space-y-3 rounded-xl border bg-muted/30 p-4">
              <div>
                <p className="text-sm font-semibold">Vista previa antes de enviar</p>
                <p className="text-xs text-muted-foreground">
                  Revisa una muestra antes del envío masivo ({readyCount}{" "}
                  destinatarios listos)
                </p>
              </div>

              {sampleDeliveries.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Aún no hay experiencias generadas para previsualizar.
                </p>
              ) : (
                <ul className="space-y-2">
                  {sampleDeliveries.map((d) => (
                    <li
                      key={d.id}
                      className="flex items-center justify-between gap-3 rounded-lg border bg-background px-3 py-2"
                    >
                      <span className="truncate text-sm">
                        {d.first_name?.trim() || "Contacto"}
                      </span>
                      <a
                        href={buildExperienceUrl(d.experience_token as string)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-primary hover:underline"
                      >
                        Ver experiencia
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </li>
                  ))}
                </ul>
              )}

              <label className="flex items-start gap-2 text-sm">
                <Checkbox
                  checked={approved}
                  onCheckedChange={(v) => setApproved(v === true)}
                  disabled={sampleDeliveries.length === 0}
                  className="mt-0.5"
                />
                <span>
                  He revisado la muestra y apruebo el contenido y diseño para el
                  envío masivo.
                </span>
              </label>
            </div>

            <Button
              className="bg-gold text-night-900 hover:bg-gold-dark"
              onClick={() => setSendStep(1)}
              disabled={isSending || !approved || sampleDeliveries.length === 0}
            >
              {isSending ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-1.5 h-4 w-4" />
              )}
              Enviar canciones personalizadas
            </Button>
            {!approved ? (
              <p className="text-xs text-muted-foreground">
                Marca la casilla de aprobación para continuar.
              </p>
            ) : null}
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

// ── CARD 3 · Marketing analytics (personalized campaigns) ────────────────────

// Industry reference benchmarks for standard email marketing. These are
// sector averages used purely as a visual reference for the uplift comparison —
// NOT measurements of this tenant's own performance.
const BENCHMARK_OPEN_RATE = 0.22; // 22% — avg retail/CRM email open rate
const BENCHMARK_CTR = 0.025; // 2.5% — avg email marketing click-through rate

function formatPct(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function PersonalizedPlaybackCard({
  campaignId,
  sentAt,
}: {
  campaignId: string;
  sentAt?: string | null;
}) {
  const { data } = usePersonalizedCampaignAnalytics(campaignId);

  const sent = data?.sent ?? 0;
  const visited = data?.visited ?? 0;
  const played = data?.played ?? 0;
  const completedSum = data?.completedSum ?? 0;
  const playedSum = data?.playedSum ?? 0;
  const ctaClicksSum = data?.ctaClicksSum ?? 0;

  const visitRate = sent > 0 ? visited / sent : 0;
  const playRate = sent > 0 ? played / sent : 0;
  const completionRate = playedSum > 0 ? completedSum / playedSum : null;
  const ctaCtr = sent > 0 ? ctaClicksSum / sent : 0;

  const isRecent = sentAt
    ? Date.now() - new Date(sentAt).getTime() < 24 * 60 * 60 * 1000
    : false;

  // Uplift vs. benchmarks
  const visitUplift =
    BENCHMARK_OPEN_RATE > 0 ? visitRate / BENCHMARK_OPEN_RATE : 0;
  const ctrUplift = BENCHMARK_CTR > 0 ? ctaCtr / BENCHMARK_CTR : 0;

  const comparisonData = [
    {
      name: "Tasa de visita",
      Personalizada: Math.round(visitRate * 1000) / 10,
      "Promedio del sector": Math.round(BENCHMARK_OPEN_RATE * 1000) / 10,
    },
    {
      name: "CTR del CTA",
      Personalizada: Math.round(ctaCtr * 1000) / 10,
      "Promedio del sector": Math.round(BENCHMARK_CTR * 1000) / 10,
    },
  ];

  const funnelData = [
    { name: "Enviados", value: sent },
    { name: "Visitaron", value: visited },
    { name: "Reprodujeron", value: played },
    { name: "Completaron", value: completedSum },
    { name: "Click CTA", value: ctaClicksSum },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-display text-lg">
          <BarChart2 className="h-4 w-4 text-primary" />
          Analítica
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {sent === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aún no se ha enviado esta campaña — las métricas aparecerán aquí
            tras el envío.
          </p>
        ) : (
          <>
            {/* Key metrics */}
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
              <Metric label="Enviados" value={sent.toLocaleString("es-ES")} />
              <Metric
                label="Tasa de visita"
                value={formatPct(visitRate)}
                hint="Abrieron su experiencia"
              />
              <Metric
                label="Tasa de reproducción"
                value={formatPct(playRate)}
                hint="Reprodujeron la canción"
              />
              <Metric
                label="Finalización"
                value={completionRate === null ? "—" : formatPct(completionRate)}
                hint="De las reproducciones"
              />
              <Metric
                label="CTR del CTA"
                value={
                  ctaClicksSum === 0 && isRecent ? "—" : formatPct(ctaCtr)
                }
                hint={
                  ctaClicksSum === 0 && isRecent
                    ? "Los clicks pueden tardar en reflejarse"
                    : undefined
                }
              />
            </div>

            {/* Funnel */}
            <div>
              <p className="mb-2 text-sm font-semibold">Funnel de engagement</p>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={funnelData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" fontSize={12} />
                  <YAxis allowDecimals={false} fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {funnelData.map((_, i) => (
                      <Cell key={i} fill="var(--primary)" />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Uplift vs. standard email */}
            <div>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold">vs. email estándar</p>
                {visitUplift > 1 ? (
                  <Badge className="border-transparent bg-emerald-600 text-white hover:bg-emerald-600">
                    {visitUplift.toFixed(1)}x más visitas
                  </Badge>
                ) : null}
                {ctrUplift > 1 ? (
                  <Badge className="border-transparent bg-emerald-600 text-white hover:bg-emerald-600">
                    {ctrUplift.toFixed(1)}x más clicks
                  </Badge>
                ) : null}
              </div>
              <p className="mb-3 text-xs text-muted-foreground">
                El "Promedio del sector" es una referencia de email marketing
                estándar, no una medición de tu cuenta.
              </p>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={comparisonData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" fontSize={12} />
                  <YAxis unit="%" fontSize={12} />
                  <Tooltip formatter={(v: number) => `${v}%`} />
                  <Bar
                    dataKey="Personalizada"
                    fill="var(--primary)"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="Promedio del sector"
                    fill="var(--muted-foreground)"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

