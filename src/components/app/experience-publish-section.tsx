import { useMemo, useState } from "react";
import {
  AlertTriangle,
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
import { Checkbox } from "@/components/ui/checkbox";
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
import { useCreateDraftCampaign } from "@/hooks/use-provider-campaigns";
import {
  useCampaignStats,
  useProviderCampaign,
  useProviderCampaignActions,
} from "@/hooks/use-provider-campaign";
import { CAMPAIGN_STATUS_LABELS, type CampaignStatus } from "@/lib/providers";
import { buildExperienceUrl, type ExperiencePage } from "@/lib/experience";

const ML_DASHBOARD_URL = "https://dashboard.mailerlite.com/campaigns";

const STATUS_CLASSES: Record<CampaignStatus, string> = {
  draft: "bg-warning text-warning-foreground",
  scheduled: "bg-teal text-night-900",
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
  const settings = useTenantSettings(tenantId ?? undefined);
  const providerCampaign = useProviderCampaign(experience.id, tenantId);

  const mailerlite = connections.data?.find(
    (c) => c.provider_type === "mailerlite",
  );
  const connected = mailerlite?.status === "connected";
  const isPublished = experience.status === "published";

  const senderName = settings.data?.sender_name?.trim() ?? "";
  const senderEmail = settings.data?.sender_email?.trim() ?? "";
  const senderConfigured = !!senderName && !!senderEmail;

  if (!isPublished || !connected) return null;

  const campaign = providerCampaign.data;

  return (
    <div className="space-y-4 rounded-xl border p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-medium">Distribución</p>
      </div>

      {/* Sender guard — never fall back to a default sender for real sends. */}
      {!senderConfigured ? (
        <div className="flex items-start gap-3 rounded-lg border border-warning/40 bg-warning/5 p-4">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
          <div className="space-y-2">
            <p className="text-sm">
              Falta configurar el remitente (nombre y email). Complétalo antes
              de distribuir para evitar problemas de entregabilidad o un
              remitente no verificado en MailerLite.
            </p>
            <Button asChild variant="outline" size="sm">
              <Link to="/settings/sender">
                <Settings2 className="mr-1.5 h-4 w-4" />
                Configurar remitente
              </Link>
            </Button>
          </div>
        </div>
      ) : null}

      {providerCampaign.isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando…</p>
      ) : campaign ? (
        <DistributionCard
          experience={experience}
          tenantId={tenantId}
          campaign={campaign}
          senderConfigured={senderConfigured}
        />
      ) : (
        <CreateDraftFlow
          experience={experience}
          tenantId={tenantId}
          mailerliteConnectionId={mailerlite?.id}
          senderConfigured={senderConfigured}
          senderName={senderName}
          senderEmail={senderEmail}
        />
      )}
    </div>
  );
}

// ── State B · Draft / Sent ────────────────────────────────────────────────────
function DistributionCard({
  experience,
  tenantId,
  campaign,
  senderConfigured,
}: {
  experience: ExperiencePage;
  tenantId: string | null | undefined;
  campaign: {
    provider_campaign_name: string;
    provider_campaign_status: CampaignStatus;
    updated_at: string;
  };
  senderConfigured: boolean;
}) {
  const actions = useProviderCampaignActions(experience.id);
  const status = campaign.provider_campaign_status;
  const isSent = status === "sent";
  const stats = useCampaignStats(experience.campaign_id, tenantId, isSent);

  // Two-step send confirmation: step 1 (warning) → step 2 (final confirm).
  const [sendStep, setSendStep] = useState<0 | 1 | 2>(0);

  const handleUpdate = () => {
    actions.updateDraft.mutate(undefined, {
      onSuccess: () => toast.success("Borrador actualizado en MailerLite"),
      onError: (e: unknown) =>
        toast.error("No se pudo actualizar el borrador", {
          description: e instanceof Error ? e.message : undefined,
        }),
    });
  };

  const handleSync = () => {
    actions.sync.mutate(undefined, {
      onSuccess: () => toast.success("Estado sincronizado"),
      onError: (e: unknown) =>
        toast.error("No se pudo sincronizar", {
          description: e instanceof Error ? e.message : undefined,
        }),
    });
  };

  const handleSend = () => {
    actions.sendNow.mutate(undefined, {
      onSuccess: () => {
        toast.success(
          "¡Campaña enviada! Se está distribuyendo a través de MailerLite.",
        );
        setConfirmOpen(false);
        setAcknowledged(false);
      },
      onError: (e: unknown) =>
        toast.error("No se pudo enviar la campaña", {
          description: e instanceof Error ? e.message : undefined,
        }),
    });
  };

  return (
    <div className="space-y-4 rounded-lg border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">
            {campaign.provider_campaign_name}
          </p>
          <p className="text-xs text-muted-foreground">
            MailerLite · Actualizada{" "}
            {new Date(campaign.updated_at).toLocaleString("es-ES")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={STATUS_CLASSES[status] ?? "bg-muted"}>
            {CAMPAIGN_STATUS_LABELS[status] ?? status}
          </Badge>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            aria-label="Sincronizar"
            onClick={handleSync}
            disabled={actions.isLoading}
          >
            <RefreshCw
              className={
                actions.sync.isPending ? "h-4 w-4 animate-spin" : "h-4 w-4"
              }
            />
          </Button>
        </div>
      </div>

      {/* Sent → show stats */}
      {isSent ? (
        <div className="space-y-3">
          {stats.data ? (
            <div className="flex flex-wrap gap-2">
              <MetricChip label="Enviados" value={stats.data.emails_sent} />
              <MetricChip label="Aperturas" value={stats.data.emails_opened} />
              <MetricChip label="Clics" value={stats.data.emails_clicked} />
              <MetricChip label="Bajas" value={stats.data.unsubscribes} />
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Aún no hay estadísticas. Sincroniza para obtener los datos de
              MailerLite.
            </p>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={handleSync}
            disabled={actions.isLoading}
          >
            <RefreshCw
              className={
                actions.sync.isPending
                  ? "mr-1.5 h-4 w-4 animate-spin"
                  : "mr-1.5 h-4 w-4"
              }
            />
            Sincronizar stats
          </Button>
        </div>
      ) : (
        /* Draft / scheduled → update + send + open ML */
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleUpdate}
            disabled={actions.isLoading || !senderConfigured}
          >
            <RefreshCw
              className={
                actions.updateDraft.isPending
                  ? "mr-1.5 h-4 w-4 animate-spin"
                  : "mr-1.5 h-4 w-4"
              }
            />
            Actualizar borrador
          </Button>

          <Button
            size="sm"
            className="bg-gold text-night-900 hover:bg-gold-dark"
            onClick={() => setConfirmOpen(true)}
            disabled={actions.isLoading || !senderConfigured}
          >
            <Send className="mr-1.5 h-4 w-4" />
            Enviar ahora
          </Button>

          <Button size="sm" variant="outline" asChild>
            <a href={ML_DASHBOARD_URL} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-1.5 h-4 w-4" />
              Editar y enviar desde MailerLite
            </a>
          </Button>
        </div>
      )}

      {/* Send Now — double visual confirmation */}
      <Dialog
        open={confirmOpen}
        onOpenChange={(o) => {
          setConfirmOpen(o);
          if (!o) setAcknowledged(false);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Enviar la campaña ahora?</DialogTitle>
            <DialogDescription>
              Se enviará inmediatamente a todos los contactos de la audiencia
              seleccionada. Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>

          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-warning/40 bg-warning/5 p-4">
            <Checkbox
              checked={acknowledged}
              onCheckedChange={(c) => setAcknowledged(c === true)}
              className="mt-0.5"
            />
            <span className="text-sm">
              Esta campaña se enviará inmediatamente desde tu cuenta MailerLite
              conectada. Esta acción no se puede deshacer.
            </span>
          </label>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setConfirmOpen(false);
                setAcknowledged(false);
              }}
            >
              Cancelar
            </Button>
            <Button
              className="bg-gold text-night-900 hover:bg-gold-dark"
              onClick={handleSend}
              disabled={!acknowledged || actions.sendNow.isPending}
            >
              {actions.sendNow.isPending ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-1.5 h-4 w-4" />
              )}
              Enviar ahora
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MetricChip({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border bg-muted/40 px-3 py-1.5 text-center">
      <p className="text-sm font-semibold">
        {value.toLocaleString("es-ES")}
      </p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}

// ── State A · No draft yet ────────────────────────────────────────────────────
function CreateDraftFlow({
  experience,
  tenantId,
  mailerliteConnectionId,
  senderConfigured,
  senderName,
  senderEmail,
}: {
  experience: ExperiencePage;
  tenantId: string | null | undefined;
  mailerliteConnectionId: string | undefined;
  senderConfigured: boolean;
  senderName: string;
  senderEmail: string;
}) {
  const audiences = useProviderAudiences(tenantId ?? undefined);
  const createDraft = useCreateDraftCampaign(experience.id);

  const [open, setOpen] = useState(false);
  const [audienceId, setAudienceId] = useState<string>("");

  const mlAudiences = useMemo(() => {
    if (!mailerliteConnectionId) return [];
    return (audiences.data ?? []).filter(
      (a) => a.provider_connection_id === mailerliteConnectionId,
    );
  }, [audiences.data, mailerliteConnectionId]);

  const targetable = mlAudiences.filter((a) => a.audience_type !== "automation");
  const hasAutomations = mlAudiences.some(
    (a) => a.audience_type === "automation",
  );

  const selectedAudience = targetable.find((a) => a.external_id === audienceId);
  const experienceUrl = buildExperienceUrl(experience.experience_token);

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
          toast.success("Borrador creado en MailerLite");
          setOpen(false);
          setAudienceId("");
        },
        onError: (e: unknown) =>
          toast.error("No se pudo crear el borrador", {
            description: e instanceof Error ? e.message : undefined,
          }),
      },
    );
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Crea un borrador en MailerLite con esta experiencia musical. Lo podrás
        actualizar y enviar desde aquí o desde MailerLite.
      </p>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Send className="mr-1.5 h-4 w-4" />
        Crear borrador en MailerLite
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear borrador en MailerLite</DialogTitle>
            <DialogDescription>
              MusicDibs crea un borrador. Tú lo revisas y lo envías. Nunca
              enviamos correos sin tu confirmación.
            </DialogDescription>
          </DialogHeader>

          {!senderConfigured ? (
            <div className="space-y-3 rounded-lg border border-destructive/40 bg-destructive/5 p-4">
              <p className="text-sm">
                Configura el remitente (nombre y email) antes de publicar en
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
                <p className="text-xs text-muted-foreground">
                  URL de la experiencia
                </p>
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
                          {a.audience_type === "segment" ? "Segmento" : "Lista"}{" "}
                          ({a.contacts_count})
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
              Crear borrador
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
