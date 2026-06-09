import { useState } from "react";
import { ExternalLink, Mail, MailCheck, Music2, RotateCcw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { buildExperienceUrl } from "@/lib/experience";
import { useRetryDelivery } from "@/hooks/useRetryDelivery";
import type { PersonalizedDelivery } from "@/hooks/use-generation";

const RETRY_LIMIT = 3;

const STATUS_META: Record<
  string,
  { label: string; className: string }
> = {
  pending: { label: "Pendiente", className: "bg-muted text-muted-foreground" },
  generating: {
    label: "Generando",
    className: "bg-primary/10 text-primary border-primary/30",
  },
  ready: {
    label: "Lista",
    className: "bg-success/20 text-success-foreground border-success/30",
  },
  sent: {
    label: "Enviada",
    className: "bg-primary/20 text-primary border-primary/30",
  },
  failed: {
    label: "Fallida",
    className: "bg-destructive/20 text-destructive border-destructive/30",
  },
};

interface Props {
  deliveries: PersonalizedDelivery[];
  isLoading: boolean;
  campaignId: string;
}

export function PersonalizedDeliveriesPanel({
  deliveries,
  isLoading,
  campaignId,
}: Props) {
  const { retry, retrying } = useRetryDelivery(campaignId);
  // Optimistic per-delivery overrides so the UI reflects retry results
  // (new count / cap reached) immediately, without a full reload.
  const [overrides, setOverrides] = useState<
    Record<string, { retryCount?: number; capped?: boolean }>
  >({});

  if (isLoading) return null;
  if (deliveries.length === 0) return null;

  const total = deliveries.length;
  const ready = deliveries.filter((d) => d.status === "ready").length;
  const sent = deliveries.filter((d) => d.status === "sent").length;
  const failed = deliveries.filter((d) => d.status === "failed").length;

  const handleRetry = async (d: PersonalizedDelivery) => {
    const result = await retry(d.id, d.first_name ?? "");
    if (result.capped) {
      setOverrides((prev) => ({
        ...prev,
        [d.id]: { retryCount: result.retryCount ?? RETRY_LIMIT, capped: true },
      }));
    } else if (result.ok && result.retryCount != null) {
      setOverrides((prev) => ({
        ...prev,
        [d.id]: { retryCount: result.retryCount ?? undefined },
      }));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-display text-lg">
          <Music2 className="h-4 w-4 text-primary" />
          Entregas personalizadas
          <Badge variant="secondary" className="ml-auto">
            {total} contactos
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary stats */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: "Total", value: total, dim: false },
            { label: "Listas", value: ready, dim: ready === 0 },
            { label: "Enviadas", value: sent, dim: sent === 0 },
            { label: "Fallidas", value: failed, dim: failed === 0 },
          ].map((s) => (
            <div
              key={s.label}
              className={cn(
                "flex flex-col items-center rounded-lg border py-2",
                s.dim && "opacity-50",
              )}
            >
              <span className="text-lg font-semibold">{s.value}</span>
              <span className="text-xs text-muted-foreground">
                {s.label}
              </span>
            </div>
          ))}
        </div>

        {/* Deliveries table */}
        <TooltipProvider delayDuration={150}>
          <div className="divide-y divide-border rounded-xl border">
            {deliveries.map((d) => {
              const meta = STATUS_META[d.status] ?? STATUS_META.pending;
              const name = d.first_name?.trim() || "Anónimo";
              const expUrl = d.experience_token
                ? buildExperienceUrl(d.experience_token)
                : null;
              const emailSent = Boolean(d.email_sent_at);

              const override = overrides[d.id];
              const retryCount = override?.retryCount ?? d.retry_count ?? 0;
              const capped =
                Boolean(override?.capped) || retryCount >= RETRY_LIMIT;
              const isRetrying = retrying === d.id;

              return (
                <div
                  key={d.id}
                  className="flex items-center justify-between gap-3 px-4 py-3"
                >
                  {/* Name + contact id */}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {d.external_contact_id}
                    </p>
                    {d.error_message && d.status === "failed" ? (
                      <p className="mt-0.5 truncate text-xs text-destructive">
                        {d.error_message}
                      </p>
                    ) : null}
                  </div>

                  {/* Right side: status + icons */}
                  <div className="flex shrink-0 items-center gap-2">
                    {d.is_fallback_generation ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="inline-flex items-center rounded-full border border-amber-300 bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-400">
                            versión genérica
                          </span>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          La canción se generó sin personalizar el nombre porque
                          el servicio rechazó el nombre del contacto.
                        </TooltipContent>
                      </Tooltip>
                    ) : null}
                    <span title={emailSent ? "Email enviado" : "Email pendiente"}>
                      {emailSent ? (
                        <MailCheck className="h-4 w-4 text-success" />
                      ) : (
                        <Mail className="h-4 w-4 text-muted-foreground" />
                      )}
                    </span>
                    {expUrl ? (
                      <a
                        href={expUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground transition-colors hover:text-primary"
                        title="Ver Experience Page"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    ) : (
                      <Music2 className="h-4 w-4 text-muted-foreground/40" />
                    )}
                    <Badge
                      variant="outline"
                      className={cn("text-xs", meta.className)}
                    >
                      {meta.label}
                    </Badge>
                    {d.status === "failed" && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          {/* span wrapper keeps tooltip working on a disabled button */}
                          <span className="inline-flex">
                            <Button
                              variant="ghost"
                              size="sm"
                              className={cn(
                                "h-7 px-2 text-xs text-amber-600 hover:bg-amber-50 hover:text-amber-700",
                                capped &&
                                  "cursor-not-allowed text-muted-foreground opacity-50 hover:bg-transparent hover:text-muted-foreground",
                              )}
                              onClick={() => handleRetry(d)}
                              disabled={isRetrying || capped}
                              aria-disabled={isRetrying || capped}
                            >
                              <RotateCcw
                                className={cn(
                                  "mr-1 h-3 w-3",
                                  isRetrying && "animate-spin",
                                )}
                              />
                              {isRetrying ? "Reintentando..." : "Reintentar"}
                            </Button>
                          </span>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          {capped
                            ? `Máximo de reintentos alcanzado (${RETRY_LIMIT}/${RETRY_LIMIT}). Este contacto no puede recibir más intentos de generación.`
                            : `Reintentar generación (intento ${retryCount + 1}/${RETRY_LIMIT})`}
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}
