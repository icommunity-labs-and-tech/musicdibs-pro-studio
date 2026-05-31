import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  FileEdit,
  FilePlus2,
  Mail,
  ScrollText,
  Send,
  ShieldOff,
  Trash2,
  type LucideIcon,
} from "lucide-react";

import { useAuth } from "@/components/auth/auth-provider";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AUDIT_ACTIONS,
  AUDIT_RESOURCES,
  labelFor,
  useAuditLogs,
  type AuditLogItem,
} from "@/hooks/use-audit-log";

export const Route = createFileRoute("/_authenticated/_shell/audit-log")({
  head: () => ({ meta: [{ title: "Registro de actividad · Musicdibs Enterprise" }] }),
  component: AuditLogPage,
});

const ACTION_ICON: Record<string, LucideIcon> = {
  create: FilePlus2,
  update: FileEdit,
  delete: Trash2,
  send: Send,
  invite: Mail,
  accept: Mail,
  revoke: ShieldOff,
};

const ACTION_TONE: Record<string, string> = {
  create: "text-success",
  update: "text-teal",
  delete: "text-destructive",
  send: "text-primary",
  revoke: "text-destructive",
};

function AuditLogPage() {
  const { tenant } = useAuth();
  const tenantId = tenant?.id;

  const [action, setAction] = useState<string>("all");
  const [resourceType, setResourceType] = useState<string>("all");

  const logs = useAuditLogs({
    tenantId,
    action: action === "all" ? null : action,
    resourceType: resourceType === "all" ? null : resourceType,
  });

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold sm:text-3xl">
          Registro de actividad
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Historial de acciones realizadas en tu espacio de trabajo.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Select value={action} onValueChange={setAction}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Acción" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las acciones</SelectItem>
            {AUDIT_ACTIONS.map((a) => (
              <SelectItem key={a.value} value={a.value}>
                {a.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={resourceType} onValueChange={setResourceType}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Recurso" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los recursos</SelectItem>
            {AUDIT_RESOURCES.map((r) => (
              <SelectItem key={r.value} value={r.value}>
                {r.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {logs.isError ? (
        <EmptyState
          icon={ScrollText}
          title="No pudimos cargar el registro"
          action={
            <Button variant="outline" onClick={() => logs.refetch()}>
              Reintentar
            </Button>
          }
        />
      ) : logs.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : (logs.data?.length ?? 0) === 0 ? (
        <EmptyState
          icon={ScrollText}
          title="Sin actividad"
          description="Aquí aparecerán las acciones a medida que uses la plataforma."
        />
      ) : (
        <ol className="space-y-2">
          {logs.data!.map((log) => (
            <LogRow key={log.id} log={log} />
          ))}
        </ol>
      )}
    </div>
  );
}

function LogRow({ log }: { log: AuditLogItem }) {
  const Icon = ACTION_ICON[log.action] ?? ScrollText;
  const tone = ACTION_TONE[log.action] ?? "text-muted-foreground";
  const when = new Date(log.created_at);

  return (
    <li className="flex items-start gap-3 rounded-xl border bg-card/50 px-3 py-3">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
        <Icon className={`h-4 w-4 ${tone}`} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm">
          <span className="font-medium">
            {labelFor(AUDIT_ACTIONS, log.action)}
          </span>{" "}
          de{" "}
          <span className="text-muted-foreground">
            {labelFor(AUDIT_RESOURCES, log.resource_type)}
          </span>
          {log.resource_name ? (
            <span className="font-medium"> · {log.resource_name}</span>
          ) : null}
        </p>
        <p className="text-xs text-muted-foreground">
          {log.actor_email ?? "Sistema"}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <Badge variant="secondary" className="font-normal">
          {when.toLocaleDateString("es-ES")}
        </Badge>
        <p className="mt-1 text-xs text-muted-foreground">
          {when.toLocaleTimeString("es-ES", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>
    </li>
  );
}
