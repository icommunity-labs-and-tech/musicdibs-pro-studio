import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Check,
  Code2,
  Copy,
  KeyRound,
  Loader2,
  Plus,
  Trash2,
  Webhook,
} from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
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
  useApiKeys,
  useCreateApiKey,
  useCreateWebhook,
  useDeleteWebhook,
  useRevokeApiKey,
  useWebhooks,
  WEBHOOK_EVENTS,
  type ApiKeyItem,
  type WebhookItem,
} from "@/hooks/use-developers";

export const Route = createFileRoute("/_authenticated/_shell/developers")({
  head: () => ({ meta: [{ title: "Desarrolladores · Musicdibs Enterprise" }] }),
  component: DevelopersPage,
});

function DevelopersPage() {
  const { tenant } = useAuth();
  const tenantId = tenant?.id;

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold sm:text-3xl">
          Desarrolladores
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Claves de API y webhooks para integrar Musicdibs con tus sistemas.
        </p>
      </div>

      <ApiKeysSection tenantId={tenantId} />
      <WebhooksSection tenantId={tenantId} />
    </div>
  );
}

// ── API keys ──────────────────────────────────────────────────────────────

function ApiKeysSection({ tenantId }: { tenantId: string | undefined }) {
  const keys = useApiKeys(tenantId);
  const [open, setOpen] = useState(false);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 font-display text-lg">
            <KeyRound className="h-4 w-4" />
            Claves de API
          </CardTitle>
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            Nueva clave
          </Button>
        </div>
        <CardDescription>
          Usa estas claves para autenticar peticiones a la API REST.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {keys.isLoading ? (
          Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-xl" />
          ))
        ) : (keys.data?.length ?? 0) === 0 ? (
          <EmptyState
            icon={KeyRound}
            title="Sin claves de API"
            description="Crea una clave para empezar a integrar."
          />
        ) : (
          keys.data!.map((k) => (
            <ApiKeyRow key={k.id} apiKey={k} tenantId={tenantId} />
          ))
        )}
      </CardContent>
      <CreateApiKeyDialog open={open} onOpenChange={setOpen} tenantId={tenantId} />
    </Card>
  );
}

function ApiKeyRow({
  apiKey,
  tenantId,
}: {
  apiKey: ApiKeyItem;
  tenantId: string | undefined;
}) {
  const revoke = useRevokeApiKey(tenantId);
  const revoked = !!apiKey.revoked_at;

  async function handleRevoke() {
    try {
      await revoke.mutateAsync(apiKey.id);
      toast.success("Clave revocada");
    } catch (e) {
      toast.error("No pudimos revocar la clave", {
        description: e instanceof Error ? e.message : undefined,
      });
    }
  }

  return (
    <div className="flex items-center gap-3 rounded-xl border bg-card/50 px-3 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{apiKey.name}</p>
        <p className="font-mono text-xs text-muted-foreground">
          {apiKey.key_prefix}••••••••
        </p>
      </div>
      {revoked ? (
        <Badge variant="secondary">Revocada</Badge>
      ) : (
        <>
          <span className="hidden text-xs text-muted-foreground sm:inline">
            {apiKey.last_used_at
              ? `Usada ${new Date(apiKey.last_used_at).toLocaleDateString("es-ES")}`
              : "Nunca usada"}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            onClick={handleRevoke}
            disabled={revoke.isPending}
          >
            {revoke.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </Button>
        </>
      )}
    </div>
  );
}

function CreateApiKeyDialog({
  open,
  onOpenChange,
  tenantId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId: string | undefined;
}) {
  const [name, setName] = useState("");
  const [secret, setSecret] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const create = useCreateApiKey(tenantId);

  function close() {
    setName("");
    setSecret(null);
    setCopied(false);
    onOpenChange(false);
  }

  async function handleCreate() {
    try {
      const res = await create.mutateAsync({ name });
      setSecret(res.secret);
    } catch (e) {
      toast.error("No pudimos crear la clave", {
        description: e instanceof Error ? e.message : undefined,
      });
    }
  }

  async function copy() {
    if (!secret) return;
    await navigator.clipboard.writeText(secret);
    setCopied(true);
    toast.success("Clave copiada");
  }

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? onOpenChange(o) : close())}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nueva clave de API</DialogTitle>
          <DialogDescription>
            {secret
              ? "Copia la clave ahora. No volverá a mostrarse."
              : "Dale un nombre para identificar su uso."}
          </DialogDescription>
        </DialogHeader>

        {secret ? (
          <div className="space-y-2">
            <Label>Tu clave secreta</Label>
            <div className="flex items-center gap-2 rounded-lg border bg-muted/40 p-2">
              <code className="min-w-0 flex-1 truncate font-mono text-xs">
                {secret}
              </code>
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={copy}>
                {copied ? (
                  <Check className="h-4 w-4 text-success" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-1.5">
            <Label htmlFor="key-name">Nombre</Label>
            <Input
              id="key-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Producción, Zapier…"
            />
          </div>
        )}

        <DialogFooter>
          {secret ? (
            <Button onClick={close}>Hecho</Button>
          ) : (
            <>
              <Button variant="outline" onClick={close}>
                Cancelar
              </Button>
              <Button onClick={handleCreate} disabled={create.isPending}>
                {create.isPending ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : null}
                Crear clave
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Webhooks ────────────────────────────────────────────────────────────────

function WebhooksSection({ tenantId }: { tenantId: string | undefined }) {
  const webhooks = useWebhooks(tenantId);
  const [open, setOpen] = useState(false);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 font-display text-lg">
            <Webhook className="h-4 w-4" />
            Webhooks
          </CardTitle>
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            Nuevo webhook
          </Button>
        </div>
        <CardDescription>
          Recibe notificaciones HTTP cuando ocurran eventos en tu espacio.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {webhooks.isLoading ? (
          Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-xl" />
          ))
        ) : (webhooks.data?.length ?? 0) === 0 ? (
          <EmptyState
            icon={Webhook}
            title="Sin webhooks"
            description="Crea un webhook para conectar tus sistemas."
          />
        ) : (
          webhooks.data!.map((w) => (
            <WebhookRow key={w.id} webhook={w} tenantId={tenantId} />
          ))
        )}
      </CardContent>
      <CreateWebhookDialog
        open={open}
        onOpenChange={setOpen}
        tenantId={tenantId}
      />
    </Card>
  );
}

function WebhookRow({
  webhook,
  tenantId,
}: {
  webhook: WebhookItem;
  tenantId: string | undefined;
}) {
  const remove = useDeleteWebhook(tenantId);

  async function handleDelete() {
    try {
      await remove.mutateAsync(webhook.id);
      toast.success("Webhook eliminado");
    } catch (e) {
      toast.error("No pudimos eliminar el webhook", {
        description: e instanceof Error ? e.message : undefined,
      });
    }
  }

  return (
    <div className="flex items-center gap-3 rounded-xl border bg-card/50 px-3 py-2.5">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium">{webhook.name}</p>
          <Badge variant={webhook.active ? "default" : "secondary"}>
            {webhook.active ? "Activo" : "Inactivo"}
          </Badge>
        </div>
        <p className="truncate font-mono text-xs text-muted-foreground">
          {webhook.url}
        </p>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-muted-foreground hover:text-destructive"
        onClick={handleDelete}
        disabled={remove.isPending}
      >
        {remove.isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Trash2 className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}

function CreateWebhookDialog({
  open,
  onOpenChange,
  tenantId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId: string | undefined;
}) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [events, setEvents] = useState<string[]>(["campaign.sent"]);
  const create = useCreateWebhook(tenantId);

  function toggleEvent(value: string) {
    setEvents((prev) =>
      prev.includes(value)
        ? prev.filter((e) => e !== value)
        : [...prev, value],
    );
  }

  function close() {
    setName("");
    setUrl("");
    setEvents(["campaign.sent"]);
    onOpenChange(false);
  }

  async function handleCreate() {
    if (!url.startsWith("http")) {
      toast.error("Introduce una URL válida (https://…)");
      return;
    }
    try {
      await create.mutateAsync({ name, url, events });
      toast.success("Webhook creado");
      close();
    } catch (e) {
      toast.error("No pudimos crear el webhook", {
        description: e instanceof Error ? e.message : undefined,
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? onOpenChange(o) : close())}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nuevo webhook</DialogTitle>
          <DialogDescription>
            Enviaremos un POST a esta URL cuando ocurran los eventos elegidos.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="wh-name">Nombre</Label>
            <Input
              id="wh-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Mi integración"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="wh-url">URL del endpoint</Label>
            <Input
              id="wh-url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://api.miapp.com/webhooks"
            />
          </div>
          <div className="space-y-2">
            <Label>Eventos</Label>
            <div className="space-y-2">
              {WEBHOOK_EVENTS.map((ev) => (
                <label
                  key={ev.value}
                  className="flex items-center gap-2 text-sm"
                >
                  <Checkbox
                    checked={events.includes(ev.value)}
                    onCheckedChange={() => toggleEvent(ev.value)}
                  />
                  {ev.label}
                </label>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={close}>
            Cancelar
          </Button>
          <Button onClick={handleCreate} disabled={create.isPending}>
            {create.isPending ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : null}
            Crear webhook
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
