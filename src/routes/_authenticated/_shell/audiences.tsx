import { createFileRoute } from "@tanstack/react-router";
import { Loader2, RefreshCw, Radio } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/components/auth/auth-provider";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useProviderAudiences,
  useProviderConnections,
  useSyncAudiences,
  type ProviderConnection,
} from "@/hooks/use-providers";
import {
  PROVIDERS,
  getProviderMeta,
  type ProviderType,
} from "@/lib/providers";

// Providers with a real metadata-sync integration available today.
const SYNC_ENABLED: Record<string, boolean> = { mailerlite: true, brevo: false };

const AUDIENCE_TYPE_LABEL: Record<string, string> = {
  list: "Lista",
  segment: "Segmento",
  automation: "Automatización",
};

const numberFmt = new Intl.NumberFormat("es-ES");

export const Route = createFileRoute("/_authenticated/_shell/audiences")({
  head: () => ({ meta: [{ title: "Audiencias · Musicdibs Enterprise" }] }),
  component: AudiencesPage,
});

function AudiencesPage() {
  const { tenant } = useAuth();
  const tenantId = tenant?.id;

  const audiences = useProviderAudiences(tenantId);
  const connections = useProviderConnections(tenantId);
  const sync = useSyncAudiences(tenantId);

  const connectionById = new Map<string, ProviderConnection>(
    (connections.data ?? []).map((c) => [c.id, c]),
  );

  // Connected providers that support metadata sync.
  const syncableConnected = (connections.data ?? []).filter(
    (c) => c.status === "connected" && SYNC_ENABLED[c.provider_type],
  );

  async function handleSync(providerType: ProviderType) {
    try {
      const result = await sync.mutateAsync(providerType);
      toast.success(`${result.synced_count} audiencias sincronizadas`);
    } catch (e) {
      toast.error("No pudimos sincronizar las audiencias", {
        description: e instanceof Error ? e.message : undefined,
      });
    }
  }

  const isLoading = audiences.isLoading || connections.isLoading;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold sm:text-3xl">
            Audiencias
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Listas, segmentos y automatizaciones sincronizados desde tu
            plataforma de marketing. MusicDibs solo almacena metadatos — la
            fuente de verdad de los contactos es siempre tu proveedor.
          </p>
        </div>
        {syncableConnected.length > 0 ? (
          <div className="flex shrink-0 flex-wrap gap-2">
            {syncableConnected.map((c) => (
              <Button
                key={c.id}
                variant="secondary"
                size="sm"
                onClick={() => handleSync(c.provider_type)}
                disabled={sync.isPending}
              >
                {sync.isPending ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-1.5 h-4 w-4" />
                )}
                Sincronizar {getProviderMeta(c.provider_type).label}
              </Button>
            ))}
          </div>
        ) : null}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      ) : audiences.isError ? (
        <EmptyState
          icon={Radio}
          title="No pudimos cargar las audiencias"
          action={
            <Button variant="outline" onClick={() => audiences.refetch()}>
              Reintentar
            </Button>
          }
        />
      ) : (audiences.data?.length ?? 0) === 0 ? (
        <EmptyState
          icon={Radio}
          title="Sin audiencias"
          description="Conecta una plataforma de marketing en Ajustes › Proveedores y sincroniza para ver aquí tus listas y segmentos."
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Proveedor</TableHead>
                <TableHead>Audiencia</TableHead>
                <TableHead className="hidden sm:table-cell">Tipo</TableHead>
                <TableHead className="text-right">Contactos</TableHead>
                <TableHead className="hidden md:table-cell">
                  Última sincronización
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {audiences.data!.map((a) => {
                const connection = connectionById.get(a.provider_connection_id);
                const meta = connection
                  ? PROVIDERS.find((p) => p.type === connection.provider_type)
                  : undefined;
                return (
                  <TableRow key={a.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {meta ? (
                          <img
                            src={meta.logo}
                            alt={meta.label}
                            className="h-5 w-5 shrink-0"
                          />
                        ) : null}
                        <span className="text-sm font-medium">
                          {meta?.label ?? "—"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-medium">{a.name}</span>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Badge variant="secondary">
                        {AUDIENCE_TYPE_LABEL[a.audience_type] ?? a.audience_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-sm tabular-nums">
                      {numberFmt.format(a.contacts_count)}
                    </TableCell>
                    <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                      {a.last_sync_at
                        ? new Date(a.last_sync_at).toLocaleString("es-ES")
                        : "—"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
