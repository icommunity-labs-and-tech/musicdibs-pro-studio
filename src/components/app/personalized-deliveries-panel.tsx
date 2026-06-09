import { ExternalLink, Mail, MailCheck, Music2, RotateCcw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { buildExperienceUrl } from "@/lib/experience";
import { useRetryDelivery } from "@/hooks/useRetryDelivery";
import type { PersonalizedDelivery } from "@/hooks/use-generation";

const STATUS_META: Record<
  string,
  { label: string; className: string }
> = {
  pending: { label: "Pendiente", className: "bg-muted text-muted-foreground" },
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
  if (isLoading) return null;
  if (deliveries.length === 0) return null;

  const total = deliveries.length;
  const ready = deliveries.filter((d) => d.status === "ready").length;
  const sent = deliveries.filter((d) => d.status === "sent").length;
  const failed = deliveries.filter((d) => d.status === "failed").length;

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
        <div className="divide-y divide-border rounded-xl border">
          {deliveries.map((d) => {
            const meta = STATUS_META[d.status] ?? STATUS_META.pending;
            const name = d.first_name?.trim() || "Anónimo";
            const expUrl = d.experience_token
              ? buildExperienceUrl(d.experience_token)
              : null;
            const emailSent = Boolean(d.email_sent_at);

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
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
