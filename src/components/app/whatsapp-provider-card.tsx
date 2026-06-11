import { useEffect, useState } from "react";
import { Loader2, Plug, RefreshCw, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

import whatsappLogo from "@/assets/logos/whatsapp.svg";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
  useConnectWhatsApp,
  useDisconnectProvider,
  useSyncAudiences,
  useWhatsAppStatus,
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

export function WhatsAppProviderCard({
  tenantId,
  connection,
}: {
  tenantId: string | undefined;
  connection: ProviderConnection | undefined;
}) {
  const [open, setOpen] = useState(false);
  const disconnect = useDisconnectProvider(tenantId);
  const sync = useSyncAudiences(tenantId);
  const waStatus = useWhatsAppStatus(tenantId);

  const status: ProviderStatus = connection?.status ?? "disconnected";
  const isConnected = status === "connected";
  const statusMeta = STATUS_META[status];

  async function handleDisconnect() {
    try {
      await disconnect.mutateAsync("whatsapp");
      toast.success("WhatsApp Business desconectado");
    } catch (e) {
      toast.error("No pudimos desconectar WhatsApp", {
        description: e instanceof Error ? e.message : undefined,
      });
    }
  }

  async function handleSync() {
    try {
      const result = await sync.mutateAsync("whatsapp");
      toast.success(`${result.synced_count} audiencias sincronizadas`);
    } catch (e) {
      toast.error("No pudimos sincronizar las audiencias", {
        description: e instanceof Error ? e.message : undefined,
      });
    }
  }

  const phoneNumberId = waStatus.data?.phone_number_id?.trim();
  const templateName = waStatus.data?.template_name?.trim();
  const templateLanguage = waStatus.data?.template_language?.trim();

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border bg-card">
              <img src={whatsappLogo} alt="WhatsApp Business" className="h-6 w-6" />
            </div>
            <CardTitle className="font-display text-lg">WhatsApp Business</CardTitle>
          </div>
          <Badge variant={statusMeta.variant}>{statusMeta.label}</Badge>
        </div>
        <CardDescription>
          Entrega la Experiencia Musical por WhatsApp con plantillas aprobadas
          vía la API de WhatsApp Business (Cloud) de Meta. Canal adicional: puede
          convivir con tu proveedor de email.
        </CardDescription>
      </CardHeader>
      <CardContent className="mt-auto space-y-3">
        <Alert variant="default" className="bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-950/30 dark:text-amber-100 dark:border-amber-800">
          <ShieldAlert className="h-4 w-4 text-amber-700 dark:text-amber-300" />
          <AlertDescription className="text-xs">
            Necesitas una <strong>plantilla de marketing aprobada</strong> en Meta
            cuyo cuerpo tenga dos variables: <strong>{"{{1}}"}</strong> nombre y{" "}
            <strong>{"{{2}}"}</strong> enlace de la experiencia.
          </AlertDescription>
        </Alert>
        {isConnected && (phoneNumberId || templateName) ? (
          <div className="rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground">
            {phoneNumberId ? (
              <p>
                Phone Number ID:{" "}
                <span className="font-medium text-foreground">{phoneNumberId}</span>
              </p>
            ) : null}
            {templateName ? (
              <p>
                Plantilla:{" "}
                <span className="font-medium text-foreground">
                  {templateName}
                  {templateLanguage ? ` (${templateLanguage})` : ""}
                </span>
              </p>
            ) : (
              <p className="text-amber-600 dark:text-amber-400">
                Sin plantilla configurada — no podrás enviar todavía.
              </p>
            )}
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
              <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
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

      <WhatsAppConnectDialog
        open={open}
        onOpenChange={setOpen}
        tenantId={tenantId}
        initialPhoneNumberId={phoneNumberId ?? ""}
        initialWabaId={waStatus.data?.waba_id ?? ""}
        initialTemplateName={templateName ?? ""}
        initialTemplateLanguage={templateLanguage ?? "es"}
        hasSavedCredentials={!!waStatus.data?.has_api_key}
      />
    </Card>
  );
}

function WhatsAppConnectDialog({
  open,
  onOpenChange,
  tenantId,
  initialPhoneNumberId,
  initialWabaId,
  initialTemplateName,
  initialTemplateLanguage,
  hasSavedCredentials,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId: string | undefined;
  initialPhoneNumberId: string;
  initialWabaId: string;
  initialTemplateName: string;
  initialTemplateLanguage: string;
  hasSavedCredentials: boolean;
}) {
  const [accessToken, setAccessToken] = useState("");
  const [phoneNumberId, setPhoneNumberId] = useState(initialPhoneNumberId);
  const [wabaId, setWabaId] = useState(initialWabaId);
  const [templateName, setTemplateName] = useState(initialTemplateName);
  const [templateLanguage, setTemplateLanguage] = useState(
    initialTemplateLanguage || "es",
  );
  const connect = useConnectWhatsApp(tenantId);

  // Prefill non-secret fields from saved status whenever the dialog opens.
  useEffect(() => {
    if (open) {
      setPhoneNumberId(initialPhoneNumberId);
      setWabaId(initialWabaId);
      setTemplateName(initialTemplateName);
      setTemplateLanguage(initialTemplateLanguage || "es");
    }
  }, [
    open,
    initialPhoneNumberId,
    initialWabaId,
    initialTemplateName,
    initialTemplateLanguage,
  ]);

  function close() {
    setAccessToken("");
    onOpenChange(false);
  }

  async function handleConnect() {
    const token = accessToken.trim();
    const phone = phoneNumberId.trim();

    // When credentials are already stored, the Access Token can be left blank to
    // keep the saved one (the edge function merges with existing credentials).
    if (!hasSavedCredentials && (!token || token.length < 20)) {
      toast.error("Introduce un Access Token válido");
      return;
    }
    if (!phone || !/^\d{6,}$/.test(phone)) {
      toast.error("Phone Number ID inválido (debe ser numérico)");
      return;
    }

    try {
      await connect.mutateAsync({
        accessToken: token,
        phoneNumberId: phone,
        wabaId: wabaId.trim(),
        templateName: templateName.trim(),
        templateLanguage: templateLanguage.trim() || "es",
      });
      toast.success("WhatsApp Business conectado");
      close();
    } catch (e) {
      toast.error("No pudimos conectar WhatsApp", {
        description: e instanceof Error ? e.message : undefined,
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? onOpenChange(o) : close())}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Conectar WhatsApp Business</DialogTitle>
          <DialogDescription>
            Validamos tus credenciales con la Cloud API de Meta mediante una
            lectura del número (sin coste ni envíos). Las credenciales se
            almacenan cifradas en el servidor.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="wa-token">
              Access Token {hasSavedCredentials ? "(opcional)" : ""}
            </Label>
            <Input
              id="wa-token"
              type="password"
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
              placeholder="••••••••••••"
              autoComplete="off"
            />
            {hasSavedCredentials ? (
              <p className="text-xs text-muted-foreground">
                Deja el token vacío para conservar el guardado.
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Token permanente del System User con permiso whatsapp_business_messaging.
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="wa-phone">Phone Number ID</Label>
            <Input
              id="wa-phone"
              value={phoneNumberId}
              onChange={(e) => setPhoneNumberId(e.target.value)}
              placeholder="1234567890"
              autoComplete="off"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="wa-waba">WhatsApp Business Account ID (WABA)</Label>
            <Input
              id="wa-waba"
              value={wabaId}
              onChange={(e) => setWabaId(e.target.value)}
              placeholder="opcional"
              autoComplete="off"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="wa-template">Nombre de plantilla aprobada</Label>
            <Input
              id="wa-template"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="cancion_personalizada"
              autoComplete="off"
            />
            <p className="text-xs text-muted-foreground">
              La plantilla debe tener el cuerpo con {"{{1}}"} nombre y {"{{2}}"}{" "}
              enlace de la experiencia.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="wa-lang">Idioma de la plantilla</Label>
            <Input
              id="wa-lang"
              value={templateLanguage}
              onChange={(e) => setTemplateLanguage(e.target.value)}
              placeholder="es"
              autoComplete="off"
            />
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
