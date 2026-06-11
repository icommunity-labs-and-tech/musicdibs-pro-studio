import { useEffect, useState } from "react";
import { Cloud, Loader2, Plug, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import {
  useConnectSalesforce,
  useDisconnectProvider,
  useSalesforceStatus,
  useSyncAudiences,
  type ProviderConnection,
} from "@/hooks/use-providers";
import type { ProviderStatus } from "@/lib/providers";

const STATUS_META: Record<
  ProviderStatus,
  { label: string; variant: "default" | "secondary" | "destructive" }
> = {
  connected: { label: "Conectado", variant: "default" },
  disconnected: { label: "Desconectado", variant: "secondary" },
  error: { label: "Error", variant: "destructive" },
};

export function SalesforceProviderCard({
  tenantId,
  connection,
}: {
  tenantId: string | undefined;
  connection: ProviderConnection | undefined;
}) {
  const [open, setOpen] = useState(false);
  const disconnect = useDisconnectProvider(tenantId);
  const sync = useSyncAudiences(tenantId);
  const sfStatus = useSalesforceStatus(tenantId);

  const status: ProviderStatus = connection?.status ?? "disconnected";
  const isConnected = status === "connected";
  const statusMeta = STATUS_META[status];

  async function handleDisconnect() {
    try {
      await disconnect.mutateAsync("salesforce_crm");
      toast.success("Salesforce CRM desconectado");
    } catch (e) {
      toast.error("No pudimos desconectar Salesforce", {
        description: e instanceof Error ? e.message : undefined,
      });
    }
  }

  async function handleSync() {
    try {
      const result = await sync.mutateAsync("salesforce_crm");
      toast.success(`${result.synced_count} audiencias sincronizadas`);
    } catch (e) {
      toast.error("No pudimos sincronizar las audiencias", {
        description: e instanceof Error ? e.message : undefined,
      });
    }
  }

  const instanceUrl = sfStatus.data?.instance_url?.trim();
  const campaignFilter = sfStatus.data?.campaign_filter?.trim();

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border bg-card">
              <Cloud className="h-6 w-6 text-[#00A1E0]" />
            </div>
            <CardTitle className="font-display text-lg">Salesforce CRM</CardTitle>
            <Badge variant="outline" className="text-[10px] font-normal">
              Audiencias
            </Badge>
          </div>
          <Badge variant={statusMeta.variant}>{statusMeta.label}</Badge>
        </div>
        <CardDescription>
          Importa Campaigns de Salesforce Sales Cloud como audiencias y
          sincroniza sus contactos (CampaignMember → Contact). Fuente
          adicional: convive con tu proveedor de email y canales WhatsApp/SMS.
        </CardDescription>
      </CardHeader>
      <CardContent className="mt-auto space-y-3">
        {isConnected && (instanceUrl || campaignFilter) ? (
          <div className="rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground">
            {instanceUrl ? (
              <p>
                My Domain:{" "}
                <span className="font-medium text-foreground">{instanceUrl}</span>
              </p>
            ) : null}
            {campaignFilter ? (
              <p>
                Filtro de Campaigns:{" "}
                <span className="font-medium text-foreground">{campaignFilter}</span>
              </p>
            ) : null}
          </div>
        ) : null}
        <p className="text-xs text-muted-foreground">
          {connection?.last_sync_at
            ? `Última sincronización: ${new Date(
                connection.last_sync_at,
              ).toLocaleDateString("es-ES")}`
            : "Sin sincronizar"}
        </p>
        <div className="flex flex-wrap justify-end gap-2">
          {isConnected ? (
            <>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleSync}
                disabled={sync.isPending}
              >
                {sync.isPending ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-1.5 h-4 w-4" />
                )}
                Sincronizar audiencias
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setOpen(true)}
              >
                Editar
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDisconnect}
                disabled={disconnect.isPending}
              >
                {disconnect.isPending ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : null}
                Desconectar
              </Button>
            </>
          ) : (
            <Button size="sm" onClick={() => setOpen(true)}>
              <Plug className="mr-1.5 h-4 w-4" />
              Conectar
            </Button>
          )}
        </div>
      </CardContent>

      <SalesforceConnectDialog
        open={open}
        onOpenChange={setOpen}
        tenantId={tenantId}
        initialInstanceUrl={instanceUrl ?? ""}
        initialCampaignFilter={campaignFilter ?? ""}
        initialApiVersion={sfStatus.data?.api_version?.trim() ?? ""}
        hasSavedCredentials={!!sfStatus.data?.has_api_key}
      />
    </Card>
  );
}

function SalesforceConnectDialog({
  open,
  onOpenChange,
  tenantId,
  initialInstanceUrl,
  initialCampaignFilter,
  initialApiVersion,
  hasSavedCredentials,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId: string | undefined;
  initialInstanceUrl: string;
  initialCampaignFilter: string;
  initialApiVersion: string;
  hasSavedCredentials: boolean;
}) {
  const [instanceUrl, setInstanceUrl] = useState(initialInstanceUrl);
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [apiVersion, setApiVersion] = useState(initialApiVersion);
  const [campaignFilter, setCampaignFilter] = useState(initialCampaignFilter);
  const connect = useConnectSalesforce(tenantId);

  // Prefill non-secret values from saved status whenever the dialog opens.
  useEffect(() => {
    if (open) {
      setInstanceUrl(initialInstanceUrl);
      setApiVersion(initialApiVersion);
      setCampaignFilter(initialCampaignFilter);
    }
  }, [open, initialInstanceUrl, initialApiVersion, initialCampaignFilter]);

  function close() {
    setClientId("");
    setClientSecret("");
    onOpenChange(false);
  }

  async function handleConnect() {
    const url = instanceUrl.trim();
    const cid = clientId.trim();
    const secret = clientSecret.trim();
    const version = apiVersion.trim();
    const filter = campaignFilter.trim();

    // When credentials are already stored, Consumer Key/Secret can be left
    // blank to keep the saved ones (the edge function merges with existing
    // credentials).
    if (!hasSavedCredentials) {
      if (!url || !/^https:\/\/.+\.salesforce\.com\/?$/.test(url)) {
        toast.error("My Domain URL inválida (debe ser https://...salesforce.com)");
        return;
      }
      if (!cid || cid.length < 10) {
        toast.error("Consumer Key inválido");
        return;
      }
      if (!secret || secret.length < 10) {
        toast.error("Consumer Secret inválido");
        return;
      }
    } else if (url && !/^https:\/\/.+\.salesforce\.com\/?$/.test(url)) {
      toast.error("My Domain URL inválida (debe ser https://...salesforce.com)");
      return;
    }

    try {
      await connect.mutateAsync({
        instanceUrl: url,
        clientId: cid,
        clientSecret: secret,
        apiVersion: version,
        campaignFilter: filter,
      });
      toast.success("Salesforce CRM conectado");
      close();
    } catch (e) {
      toast.error("No pudimos conectar Salesforce", {
        description: e instanceof Error ? e.message : undefined,
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? onOpenChange(o) : close())}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Conectar Salesforce CRM</DialogTitle>
          <DialogDescription>
            Usa un Connected App (External Client App) con{" "}
            <strong>Client Credentials Flow</strong> habilitado, scope{" "}
            <code>api</code>, y un usuario "Run As" con acceso de lectura a
            Campaign, CampaignMember y Contact. Las credenciales se almacenan
            cifradas en el servidor.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="sf-instance-url">My Domain URL</Label>
            <Input
              id="sf-instance-url"
              value={instanceUrl}
              onChange={(e) => setInstanceUrl(e.target.value)}
              placeholder="https://mycompany.my.salesforce.com"
              autoComplete="off"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sf-client-id">
              Consumer Key {hasSavedCredentials ? "(opcional)" : ""}
            </Label>
            <Input
              id="sf-client-id"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              placeholder="3MVG9..."
              autoComplete="off"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sf-client-secret">
              Consumer Secret {hasSavedCredentials ? "(opcional)" : ""}
            </Label>
            <Input
              id="sf-client-secret"
              type="password"
              value={clientSecret}
              onChange={(e) => setClientSecret(e.target.value)}
              placeholder="••••••••••••"
              autoComplete="off"
            />
            {hasSavedCredentials ? (
              <p className="text-xs text-muted-foreground">
                Deja Consumer Key y Secret vacíos para conservar las
                credenciales guardadas.
              </p>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sf-api-version">API Version (opcional)</Label>
            <Input
              id="sf-api-version"
              value={apiVersion}
              onChange={(e) => setApiVersion(e.target.value)}
              placeholder="v61.0"
              autoComplete="off"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sf-campaign-filter">
              Filtro de Campaigns (opcional, SOQL WHERE)
            </Label>
            <Input
              id="sf-campaign-filter"
              value={campaignFilter}
              onChange={(e) => setCampaignFilter(e.target.value)}
              placeholder="Type = 'Email' AND Status = 'In Progress'"
              autoComplete="off"
            />
            <p className="text-xs text-muted-foreground">
              Por defecto se importan todas las Campaigns activas
              (IsActive = true).
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={close}>
            Cancelar
          </Button>
          <Button onClick={handleConnect} disabled={connect.isPending}>
            {connect.isPending ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : null}
            Conectar / Probar conexión
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
