import { useState } from "react";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  CheckCheck,
  ClipboardCopy,
} from "lucide-react";
import { toast } from "sonner";

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

/**
 * Brevo no se integra por API Key tradicional para las estadísticas: usa
 * webhooks. MusicDibs distingue dos sentidos:
 *
 * - Webhook ENTRANTE (Brevo → MusicDibs): Brevo envía eventos de campaña
 *   (envíos, aperturas, clics, rebotes, bajas) a nuestra URL. Requiere plan
 *   Enterprise en Brevo. Esta es la URL que se pega en Brevo.
 * - Webhook SALIENTE (MusicDibs → Brevo): se usaría para disparar acciones en
 *   Brevo. Su configuración se realiza desde el panel de Brevo.
 *
 * La verificación de origen se hace mediante el token de tenant (`t`) incluido
 * en la URL del endpoint.
 */
export function BrevoWebhookSetup({
  tenantId,
}: {
  tenantId: string | undefined;
}) {
  const [copied, setCopied] = useState(false);

  const webhookUrl = tenantId
    ? `${SUPABASE_FUNCTIONS_URL}/brevo-webhook?t=${tenantId}`
    : "";

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

  return (
    <div className="space-y-3 rounded-xl border bg-muted/30 p-3">
      <p className="text-sm font-medium">Webhooks de Brevo</p>

      <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
        <div className="flex items-start gap-2 rounded-lg border bg-card/50 p-2">
          <ArrowDownToLine className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <div>
            <p className="font-medium text-foreground">Entrante (Brevo → MusicDibs)</p>
            <p>
              Brevo envía los eventos de campaña a MusicDibs. Requiere plan
              Enterprise.
            </p>
          </div>
        </div>
        <div className="flex items-start gap-2 rounded-lg border bg-card/50 p-2">
          <ArrowUpFromLine className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <div>
            <p className="font-medium text-foreground">Saliente (MusicDibs → Brevo)</p>
            <p>Se configura desde el panel de Brevo según tus automatizaciones.</p>
          </div>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">URL del webhook entrante</Label>
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
          Cómo configurar el webhook en Brevo
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2">
          <ol className="list-decimal space-y-1.5 pl-4 text-xs text-muted-foreground">
            <li>
              Entra en tu cuenta de Brevo (plan Enterprise) →{" "}
              <strong>Campañas</strong> → <strong>Configuración</strong> →{" "}
              <strong>Webhooks</strong>.
            </li>
            <li>
              Crea un webhook de tipo <strong>Marketing</strong> y pega la URL de
              arriba como URL del endpoint.
            </li>
            <li>
              Activa los eventos relevantes: <em>enviado</em>, <em>entregado</em>,{" "}
              <em>abierto</em>, <em>clic</em>, <em>rebote duro/blando</em>,{" "}
              <em>baja</em> y <em>spam</em>.
            </li>
            <li>
              Guarda. La seguridad del endpoint se garantiza mediante el token{" "}
              <code className="rounded bg-muted px-1">t</code> incluido en la URL.
            </li>
          </ol>
          <p className="mt-2 text-xs text-muted-foreground">
            Documentación oficial:{" "}
            <a
              href="https://developers.brevo.com/docs/how-to-use-webhooks"
              target="_blank"
              rel="noreferrer"
              className="text-primary underline underline-offset-2"
            >
              How to use webhooks (Brevo)
            </a>
            .
          </p>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
