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
  useConnectTwilio,
  useDisconnectProvider,
  useSyncAudiences,
  useTwilioStatus,
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

export function TwilioProviderCard({
  tenantId,
  connection,
}: {
  tenantId: string | undefined;
  connection: ProviderConnection | undefined;
}) {
  const [open, setOpen] = useState(false);
  const disconnect = useDisconnectProvider(tenantId);
  const sync = useSyncAudiences(tenantId);
  const twilioStatus = useTwilioStatus(tenantId);

  const status: ProviderStatus = connection?.status ?? "disconnected";
  const isConnected = status === "connected";
  const statusMeta = STATUS_META[status];

  async function handleDisconnect() {
    try {
      await disconnect.mutateAsync("twilio");
      toast.success("WhatsApp / SMS (Twilio) desconectado");
    } catch (e) {
      toast.error("No pudimos desconectar Twilio", {
        description: e instanceof Error ? e.message : undefined,
      });
    }
  }

  async function handleSync() {
    try {
      const result = await sync.mutateAsync("twilio");
      toast.success(`${result.synced_count} audiencias sincronizadas`);
    } catch (e) {
      toast.error("No pudimos sincronizar las audiencias", {
        description: e instanceof Error ? e.message : undefined,
      });
    }
  }

  const whatsappFrom = twilioStatus.data?.whatsapp_from?.trim();
  const smsFrom = twilioStatus.data?.sms_from?.trim();

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border bg-card">
              <img src={whatsappLogo} alt="Twilio WhatsApp/SMS" className="h-6 w-6" />
            </div>
            <CardTitle className="font-display text-lg">WhatsApp / SMS</CardTitle>
          </div>
          <Badge variant={statusMeta.variant}>{statusMeta.label}</Badge>
        </div>
        <CardDescription>
          Entrega la Experiencia Musical por WhatsApp o SMS vía Twilio. Canal
          adicional: puede convivir con tu proveedor de email.
        </CardDescription>
      </CardHeader>
      <CardContent className="mt-auto space-y-3">
        {isConnected && (whatsappFrom || smsFrom) ? (
          <div className="rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground">
            {whatsappFrom ? (
              <p>
                WhatsApp From:{" "}
                <span className="font-medium text-foreground">{whatsappFrom}</span>
              </p>
            ) : null}
            {smsFrom ? (
              <p>
                SMS From:{" "}
                <span className="font-medium text-foreground">{smsFrom}</span>
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

      <TwilioConnectDialog
        open={open}
        onOpenChange={setOpen}
        tenantId={tenantId}
        initialWhatsappFrom={whatsappFrom ?? ""}
        initialSmsFrom={smsFrom ?? ""}
        hasSavedCredentials={!!twilioStatus.data?.has_api_key}
      />
    </Card>
  );
}

function TwilioConnectDialog({
  open,
  onOpenChange,
  tenantId,
  initialWhatsappFrom,
  initialSmsFrom,
  hasSavedCredentials,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId: string | undefined;
  initialWhatsappFrom: string;
  initialSmsFrom: string;
  hasSavedCredentials: boolean;
}) {
  const [accountSid, setAccountSid] = useState("");
  const [authToken, setAuthToken] = useState("");
  const [whatsappFrom, setWhatsappFrom] = useState(initialWhatsappFrom);
  const [smsFrom, setSmsFrom] = useState(initialSmsFrom);
  const connect = useConnectTwilio(tenantId);

  // Prefill From values from saved status whenever the dialog opens.
  useEffect(() => {
    if (open) {
      setWhatsappFrom(initialWhatsappFrom);
      setSmsFrom(initialSmsFrom);
    }
  }, [open, initialWhatsappFrom, initialSmsFrom]);

  function close() {
    setAccountSid("");
    setAuthToken("");
    onOpenChange(false);
  }

  async function handleConnect() {
    const sid = accountSid.trim();
    const token = authToken.trim();
    const wa = whatsappFrom.trim();
    const sms = smsFrom.trim();

    // When credentials are already stored, SID/token can be left blank to keep
    // the saved ones (the edge function merges with existing credentials).
    if (!hasSavedCredentials) {
      if (!sid || !sid.startsWith("AC") || sid.length !== 34) {
        toast.error("Account SID inválido (debe empezar por 'AC' y tener 34 caracteres)");
        return;
      }
      if (!token || token.length < 30) {
        toast.error("Auth Token inválido");
        return;
      }
    } else if (sid && (!sid.startsWith("AC") || sid.length !== 34)) {
      toast.error("Account SID inválido (debe empezar por 'AC' y tener 34 caracteres)");
      return;
    }

    if (!wa && !sms) {
      toast.error("Rellena al menos un origen: WhatsApp From o SMS From");
      return;
    }
    if (wa && !wa.startsWith("whatsapp:+")) {
      toast.error('WhatsApp From debe tener el formato "whatsapp:+1415..."');
      return;
    }
    if (sms && !sms.startsWith("+")) {
      toast.error('SMS From debe tener formato E.164 (ej. "+1415...")');
      return;
    }

    try {
      await connect.mutateAsync({
        accountSid: sid,
        authToken: token,
        whatsappFrom: wa,
        smsFrom: sms,
      });
      toast.success("WhatsApp / SMS (Twilio) conectado");
      close();
    } catch (e) {
      toast.error("No pudimos conectar Twilio", {
        description: e instanceof Error ? e.message : undefined,
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? onOpenChange(o) : close())}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Conectar WhatsApp / SMS (Twilio)</DialogTitle>
          <DialogDescription>
            Validamos tus credenciales con los números de prueba de Twilio, sin
            coste ni envíos reales. Las credenciales se almacenan cifradas en el
            servidor.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="twilio-sid">
              Account SID {hasSavedCredentials ? "(opcional)" : ""}
            </Label>
            <Input
              id="twilio-sid"
              value={accountSid}
              onChange={(e) => setAccountSid(e.target.value)}
              placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              autoComplete="off"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="twilio-token">
              Auth Token {hasSavedCredentials ? "(opcional)" : ""}
            </Label>
            <Input
              id="twilio-token"
              type="password"
              value={authToken}
              onChange={(e) => setAuthToken(e.target.value)}
              placeholder="••••••••••••"
              autoComplete="off"
            />
            {hasSavedCredentials ? (
              <p className="text-xs text-muted-foreground">
                Deja SID y token vacíos para conservar las credenciales guardadas.
              </p>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="twilio-wa">WhatsApp From</Label>
            <Input
              id="twilio-wa"
              value={whatsappFrom}
              onChange={(e) => setWhatsappFrom(e.target.value)}
              placeholder="whatsapp:+14155238886"
              autoComplete="off"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="twilio-sms">SMS From</Label>
            <Input
              id="twilio-sms"
              value={smsFrom}
              onChange={(e) => setSmsFrom(e.target.value)}
              placeholder="+14155238886"
              autoComplete="off"
            />
            <p className="text-xs text-muted-foreground">
              Rellena al menos uno de los dos orígenes (WhatsApp o SMS).
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
