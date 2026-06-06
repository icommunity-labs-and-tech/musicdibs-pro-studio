import { useMemo, useState } from "react";
import {
  ExternalLink,
  Loader2,
  RefreshCw,
  Send,
  Settings2,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useProviderConnections, useProviderAudiences } from "@/hooks/use-providers";
import { useTenantSettings } from "@/hooks/use-tenant-settings";
import {
  useCreateDraftCampaign,
  useProviderCampaigns,
  useSyncCampaignStatus,
} from "@/hooks/use-provider-campaigns";
import {
  buildProviderCampaignUrl,
  CAMPAIGN_STATUS_LABELS,
  type CampaignStatus,
} from "@/lib/providers";
import { buildExperienceUrl, type ExperiencePage } from "@/lib/experience";

const STATUS_CLASSES: Record<CampaignStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  scheduled: "bg-warning text-warning-foreground",
  sent: "bg-success text-success-foreground",
  archived: "bg-muted text-muted-foreground",
};

export function ExperiencePublishSection({
  experience,
  tenantId,
}: {
  experience: ExperiencePage;
  tenantId: string | null | undefined;
}) {
  const connections = useProviderConnections(tenantId ?? undefined);
  const audiences = useProviderAudiences(tenantId ?? undefined);
  const settings = useTenantSettings(tenantId ?? undefined);
  const campaigns = useProviderCampaigns(experience.id);
  const createDraft = useCreateDraftCampaign(experience.id);
  const syncStatus = useSyncCampaignStatus(experience.id);

  const [open, setOpen] = useState(false);
  const [audienceId, setAudienceId] = useState<string>("");

  const mailerlite = connections.data?.find(
    (c) => c.provider_type === "mailerlite",
  );
  const connected = mailerlite?.status === "connected";
  const isPublished = experience.status === "published";

  // Only MailerLite audiences that can be targeted by a campaign (list/segment).
  const mlAudiences = useMemo(() => {
    if (!mailerlite) return [];
    return (audiences.data ?? []).filter(
      (a) => a.provider_connection_id === mailerlite.id,
    );
  }, [audiences.data, mailerlite]);

  const targetable = mlAudiences.filter((a) => a.audience_type !== "automation");
  const hasAutomations = mlAudiences.some((a) => a.audience_type === "automation");

  const senderName = settings.data?.sender_name?.trim() ?? "";
  const senderEmail = settings.data?.sender_email?.trim() ?? "";
  const senderConfigured = !!senderName && !!senderEmail;

  const selectedAudience = targetable.find((a) => a.external_id === audienceId);
  const experienceUrl = buildExperienceUrl(experience.experience_token);

  if (!isPublished || !connected) return null;

  const handleConfirm = () => {
    if (!selectedAudience) {
      toast.error("Selecciona una audiencia");
      return;
    }
    createDraft.mutate(
      {
        experiencePageId: experience.id,
        audienceExternalId: selectedAudience.external_id,
        audienceType: selectedAudience.audience_type,
        audienceName: selectedAudience.name,
      },
      {
        onSuccess: () => {
          toast.success("Draft campaign created successfully in MailerLite.");
          setOpen(false);
          setAudienceId("");
        },
        onError: (e: unknown) =>
          toast.error("Unable to create MailerLite draft campaign.", {
            description: e instanceof Error ? e.message : undefined,
          }),
      },
    );
  };

  return (
    <div className="space-y-4 rounded-xl border p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-medium">Publicar en MailerLite</p>
        <Button size="sm" onClick={() => setOpen(true)}>
          <Send className="mr-1.5 h-4 w-4" />
          Publish to MailerLite
        </Button>
      </div>

      {/* Published campaigns */}
      {campaigns.data && campaigns.data.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">
            Campañas publicadas
          </p>
          <div className="divide-y divide-border rounded-lg border">
            {campaigns.data.map((c) => {
              const url = buildProviderCampaignUrl(
                c.provider_type,
                c.provider_campaign_id,
              );
              return (
                <div
                  key={c.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {c.provider_campaign_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      MailerLite ·{" "}
                      {new Date(c.created_at).toLocaleDateString("es-ES")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      className={
                        STATUS_CLASSES[c.provider_campaign_status] ?? "bg-muted"
                      }
                    >
                      {CAMPAIGN_STATUS_LABELS[c.provider_campaign_status] ??
                        c.provider_campaign_status}
                    </Badge>
                    <Button
                      size="icon"
                      variant="outline"
                      aria-label="Sincronizar estado"
                      onClick={() =>
                        syncStatus.mutate(c.id, {
                          onSuccess: () => toast.success("Estado actualizado"),
                          onError: (e: unknown) =>
                            toast.error("No se pudo sincronizar", {
                              description:
                                e instanceof Error ? e.message : undefined,
                            }),
                        })
                      }
                      disabled={syncStatus.isPending}
                    >
                      <RefreshCw
                        className={
                          syncStatus.isPending ? "h-4 w-4 animate-spin" : "h-4 w-4"
                        }
                      />
                    </Button>
                    {url ? (
                      <Button
                        size="sm"
                        variant="outline"
                        asChild
                        aria-label="Abrir en MailerLite"
                      >
                        <a href={url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="mr-1.5 h-4 w-4" />
                          Open in MailerLite
                        </a>
                      </Button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* Confirmation modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear borrador en MailerLite</DialogTitle>
            <DialogDescription>
              MusicDibs crea un borrador. Tú lo revisas y lo envías desde
              MailerLite. Nunca enviamos correos por ti.
            </DialogDescription>
          </DialogHeader>

          {!senderConfigured ? (
            <div className="space-y-3 rounded-lg border border-destructive/40 bg-destructive/5 p-4">
              <p className="text-sm">
                Please configure your sender settings before publishing to
                MailerLite.
              </p>
              <Button asChild variant="outline" size="sm">
                <Link to="/settings/sender">
                  <Settings2 className="mr-1.5 h-4 w-4" />
                  Ir a Configuración del remitente
                </Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <DetailRow label="Experiencia" value={experience.title} />
              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground">URL de la experiencia</p>
                <p className="break-all font-mono text-xs">{experienceUrl}</p>
              </div>

              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground">Audiencia</p>
                {targetable.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No hay listas ni segmentos sincronizados. Sincroniza tus
                    audiencias en Ajustes → Proveedores.
                  </p>
                ) : (
                  <Select value={audienceId} onValueChange={setAudienceId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona una lista o segmento" />
                    </SelectTrigger>
                    <SelectContent>
                      {targetable.map((a) => (
                        <SelectItem key={a.id} value={a.external_id}>
                          {a.name} ·{" "}
                          {a.audience_type === "segment" ? "Segmento" : "Lista"} (
                          {a.contacts_count})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {hasAutomations ? (
                  <p className="text-xs text-muted-foreground">
                    Las automatizaciones no son compatibles como destino de
                    campaña.
                  </p>
                ) : null}
              </div>

              {selectedAudience ? (
                <DetailRow
                  label="Tamaño de audiencia"
                  value={String(selectedAudience.contacts_count)}
                />
              ) : null}
              <DetailRow label="Remitente" value={senderName} />
              <DetailRow label="Email del remitente" value={senderEmail} />
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={
                !senderConfigured || !selectedAudience || createDraft.isPending
              }
            >
              {createDraft.isPending ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-1.5 h-4 w-4" />
              )}
              Create MailerLite Draft
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-right text-sm font-medium">{value}</p>
    </div>
  );
}
