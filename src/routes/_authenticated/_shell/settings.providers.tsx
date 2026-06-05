import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Coins, Loader2, Plug, RefreshCw, Users2 } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/components/auth/auth-provider";
import { EmptyState } from "@/components/empty-state";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  useConnectProvider,
  useDisconnectProvider,
  useProviderAudiences,
  useProviderConnections,
  useSyncAudiences,
  type ProviderConnection,
} from "@/hooks/use-providers";
import { PROVIDERS, type ProviderMeta, type ProviderStatus } from "@/lib/providers";

// Providers with a real metadata-sync integration available today.
const SYNC_ENABLED: Record<string, boolean> = { mailerlite: true, brevo: false };

export const Route = createFileRoute("/_authenticated/_shell/settings/providers")({
  component: ProvidersPage,
});

function ProvidersPage() {
  const { tenant } = useAuth();
  const tenantId = tenant?.id;
  const connections = useProviderConnections(tenantId);

  const connectionFor = (type: string): ProviderConnection | undefined =>
    connections.data?.find((c) => c.provider_type === type);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl font-bold">Proveedores</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Conecta tu plataforma de marketing para sincronizar audiencias y
          campañas.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {connections.isLoading
          ? PROVIDERS.map((p) => (
              <Skeleton key={p.type} className="h-44 rounded-2xl" />
            ))
          : PROVIDERS.map((provider) => (
              <ProviderCard
                key={provider.type}
                provider={provider}
                tenantId={tenantId}
                connection={connectionFor(provider.type)}
              />
            ))}
      </div>

      <AudiencesSection tenantId={tenantId} />
    </div>
  );
}

const STATUS_META: Record<
  ProviderStatus,
  { label: string; variant: "default" | "secondary" | "destructive" }
> = {
  connected: { label: "Conectado", variant: "default" },
  disconnected: { label: "Desconectado", variant: "secondary" },
  error: { label: "Error", variant: "destructive" },
};

function ProviderCard({
  provider,
  tenantId,
  connection,
}: {
  provider: ProviderMeta;
  tenantId: string | undefined;
  connection: ProviderConnection | undefined;
}) {
  const [open, setOpen] = useState(false);
  const disconnect = useDisconnectProvider(tenantId);

  const status: ProviderStatus = connection?.status ?? "disconnected";
  const isConnected = status === "connected";
  const statusMeta = STATUS_META[status];

  async function handleDisconnect() {
    try {
      await disconnect.mutateAsync(provider.type);
      toast.success(`${provider.label} desconectado`);
    } catch (e) {
      toast.error("No pudimos desconectar el proveedor", {
        description: e instanceof Error ? e.message : undefined,
      });
    }
  }

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border bg-card">
              <img
                src={provider.logo}
                alt={provider.label}
                className="h-6 w-6"
              />
            </div>
            <CardTitle className="font-display text-lg">
              {provider.label}
            </CardTitle>
          </div>
          <Badge variant={statusMeta.variant}>{statusMeta.label}</Badge>
        </div>
        <CardDescription>{provider.description}</CardDescription>
      </CardHeader>
      <CardContent className="mt-auto space-y-3">
        <p className="text-xs text-muted-foreground">
          {connection?.last_sync_at
            ? `Última sincronización: ${new Date(
                connection.last_sync_at,
              ).toLocaleDateString("es-ES")}`
            : "Sin sincronizar"}
        </p>
        <div className="flex justify-end gap-2">
          {isConnected ? (
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
          ) : (
            <Button size="sm" onClick={() => setOpen(true)}>
              <Plug className="mr-1.5 h-4 w-4" />
              Conectar
            </Button>
          )}
        </div>
      </CardContent>

      <ConnectDialog
        open={open}
        onOpenChange={setOpen}
        provider={provider}
        tenantId={tenantId}
      />
    </Card>
  );
}

function ConnectDialog({
  open,
  onOpenChange,
  provider,
  tenantId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  provider: ProviderMeta;
  tenantId: string | undefined;
}) {
  const [apiKey, setApiKey] = useState("");
  const connect = useConnectProvider(tenantId);

  function close() {
    setApiKey("");
    onOpenChange(false);
  }

  async function handleConnect() {
    if (!apiKey.trim()) {
      toast.error("Introduce una API key");
      return;
    }
    try {
      await connect.mutateAsync({
        providerType: provider.type,
        apiKey: apiKey.trim(),
      });
      toast.success(`${provider.label} conectado`);
      close();
    } catch (e) {
      toast.error("No pudimos conectar el proveedor", {
        description: e instanceof Error ? e.message : undefined,
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? onOpenChange(o) : close())}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Conectar {provider.label}</DialogTitle>
          <DialogDescription>
            Introduce tu API key. Sólo se almacenan metadatos de tus audiencias.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5">
          <Label htmlFor="provider-api-key">API Key</Label>
          <Input
            id="provider-api-key"
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="••••••••••••"
            autoComplete="off"
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={close}>
            Cancelar
          </Button>
          <Button onClick={handleConnect} disabled={connect.isPending}>
            {connect.isPending ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : null}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AudiencesSection({ tenantId }: { tenantId: string | undefined }) {
  const audiences = useProviderAudiences(tenantId);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-display text-lg">
          <Users2 className="h-4 w-4" />
          Audiencias
        </CardTitle>
        <CardDescription>
          Listas, segmentos y automatizaciones sincronizadas desde tus
          proveedores.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {audiences.isLoading ? (
          <Skeleton className="h-24 w-full rounded-xl" />
        ) : (audiences.data?.length ?? 0) === 0 ? (
          <EmptyState
            icon={Users2}
            title="Sin audiencias"
            description="Aún no hay audiencias sincronizadas."
          />
        ) : (
          <div className="space-y-2">
            {audiences.data!.map((a) => (
              <div
                key={a.id}
                className="flex items-center gap-3 rounded-xl border bg-card/50 px-3 py-2.5"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{a.name}</p>
                  <p className="text-xs capitalize text-muted-foreground">
                    {a.audience_type}
                  </p>
                </div>
                <Badge variant="secondary">{a.contacts_count} contactos</Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
