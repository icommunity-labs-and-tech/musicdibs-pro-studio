import { useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCheck,
  CheckCircle,
  ClipboardCopy,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const SUPABASE_FUNCTIONS_URL =
  "https://asolssebjyjyfbggraew.supabase.co/functions/v1";

interface ConnectionStatus {
  connected: boolean;
  status: string;
  has_api_key: boolean;
  webhook_configured: boolean;
}

export function ResendWebhookSetup({
  tenantId,
  onConfiguredChange,
}: {
  tenantId: string | undefined;
  /** Notifies the parent card so its subtitle badge can update. */
  onConfiguredChange?: (configured: boolean) => void;
}) {
  const [loading, setLoading] = useState(true);
  const [webhookConfigured, setWebhookConfigured] = useState(false);
  const [secret, setSecret] = useState("");
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const webhookUrl = tenantId
    ? `${SUPABASE_FUNCTIONS_URL}/resend-webhook?t=${tenantId}`
    : "";

  useEffect(() => {
    let active = true;
    async function loadStatus() {
      setLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke(
          "manage-provider-connection",
          { body: { action: "get_connection_status", provider_type: "resend" } },
        );
        if (error) throw error;
        if (!active) return;
        const status = data as ConnectionStatus;
        setWebhookConfigured(!!status?.webhook_configured);
        onConfiguredChange?.(!!status?.webhook_configured);
      } catch {
        if (active) setWebhookConfigured(false);
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadStatus();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCopy() {
    if (!webhookUrl) return;
    try {
      await navigator.clipboard.writeText(webhookUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("No pudimos copiar la URL");
    }
  }

  async function handleSave() {
    const trimmed = secret.trim();
    if (!trimmed.startsWith("whsec_")) {
      toast.error("El signing secret debe empezar por whsec_");
      return;
    }
    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "manage-provider-connection",
        {
          body: {
            action: "update_webhook_secret",
            provider_type: "resend",
            webhook_secret: trimmed,
          },
        },
      );
      if (error) {
        // Surface the edge function's error message when present.
        const ctx = (error as { context?: { body?: unknown } }).context;
        let message = error.message;
        try {
          const body =
            typeof ctx?.body === "string" ? JSON.parse(ctx.body) : ctx?.body;
          if (body && typeof body === "object" && "error" in body) {
            message = String((body as { error: unknown }).error);
          }
        } catch {
          /* keep default message */
        }
        throw new Error(message);
      }
      const result = data as { success?: boolean; webhook_configured?: boolean };
      const configured = !!result?.webhook_configured;
      setWebhookConfigured(configured);
      onConfiguredChange?.(configured);
      setSecret("");
      toast.success("Webhook configurado correctamente");
    } catch (e) {
      toast.error("No pudimos configurar el webhook", {
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3 rounded-xl border bg-muted/30 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">Estadísticas en tiempo real</p>
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : webhookConfigured ? (
          <Badge className="gap-1 border-transparent bg-emerald-600 text-white hover:bg-emerald-600/90">
            <CheckCircle className="h-3 w-3" />
            Stats activos
          </Badge>
        ) : (
          <Badge className="gap-1 border-transparent bg-amber-500 text-white hover:bg-amber-500/90">
            <AlertTriangle className="h-3 w-3" />
            Stats no configurados
          </Badge>
        )}
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">URL del webhook</Label>
        <div className="flex items-center gap-2">
          <Input readOnly value={webhookUrl} className="font-mono text-xs" />
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handleCopy}
            disabled={!webhookUrl}
            title="Copiar URL"
          >
            {copied ? (
              <CheckCheck className="h-4 w-4 text-emerald-600" />
            ) : (
              <ClipboardCopy className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      <Collapsible>
        <CollapsibleTrigger className="text-xs font-medium text-primary underline-offset-2 hover:underline">
          Cómo configurar el webhook en Resend
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2">
          <ol className="list-decimal space-y-1.5 pl-4 text-xs text-muted-foreground">
            <li>
              Entra en tu dashboard de Resend → <strong>Webhooks</strong> →{" "}
              <strong>Add Endpoint</strong>.
            </li>
            <li>Pega la URL de arriba como endpoint URL.</li>
            <li>
              En "Events to listen to", selecciona:{" "}
              <code className="rounded bg-muted px-1">broadcast.sent</code> ·{" "}
              <code className="rounded bg-muted px-1">email.opened</code> ·{" "}
              <code className="rounded bg-muted px-1">email.clicked</code> ·{" "}
              <code className="rounded bg-muted px-1">email.unsubscribed</code> ·{" "}
              <code className="rounded bg-muted px-1">email.bounced</code>.
            </li>
            <li>
              Haz clic en <strong>Add</strong> y copia el Signing Secret
              (empieza por <code className="rounded bg-muted px-1">whsec_</code>).
            </li>
            <li>Pégalo en el campo de abajo y guarda.</li>
          </ol>
        </CollapsibleContent>
      </Collapsible>

      <div className="space-y-1.5">
        <Label htmlFor="resend-webhook-secret" className="text-xs">
          Signing Secret
        </Label>
        <div className="flex items-center gap-2">
          <Input
            id="resend-webhook-secret"
            type="password"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            placeholder="whsec_..."
            autoComplete="off"
          />
          <Button type="button" onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : null}
            Guardar secret
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          El signing secret se almacena de forma segura y se usa para verificar
          que los eventos recibidos provienen realmente de Resend. Sin él, las
          estadísticas de campañas (aperturas, clics, bajas) no estarán
          disponibles.
        </p>
      </div>
    </div>
  );
}
