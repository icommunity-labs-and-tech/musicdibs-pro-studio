import { Info } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

/**
 * Advisory shown wherever a user connects/configures a mailing platform.
 *
 * Confirmed against the official MailerLite Campaign API
 * (https://developers.mailerlite.com/api/campaigns):
 *
 * - The API DOES expose schedule AND send:
 *   `POST /api/campaigns/{id}/schedule` with `delivery` =
 *   `instant` (send now) | `scheduled` | `timezone_based` | `smart_sending`.
 * - Those operations are gated by plan + account permissions on MailerLite's
 *   side: the sender email/domain must be verified, the account must be
 *   approved for sending, and advanced delivery modes (`smart_sending`,
 *   `timezone_based`) require higher-tier paid plans. Free/trial or
 *   unverified accounts can create drafts but cannot actually send.
 *
 * MusicDibs is an AI Music Experience Layer and NEVER schedules or sends
 * emails — it only creates DRAFT campaigns. The user always reviews and sends
 * manually from inside MailerLite.
 */
export function MailerLitePlanNotice({
  variant = "full",
}: {
  /** "full" for settings pages, "compact" for dialogs. */
  variant?: "full" | "compact";
}) {
  if (variant === "compact") {
    return (
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription className="text-xs leading-relaxed">
          MusicDibs solo crea <strong>borradores</strong>. La programación y el
          envío se hacen en MailerLite y requieren un{" "}
          <strong>remitente verificado</strong> y un{" "}
          <strong>plan que permita enviar</strong>. Las opciones avanzadas
          (envío inteligente / por zona horaria) requieren planes superiores.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert>
      <Info className="h-4 w-4" />
      <AlertTitle>Programación y envío: limitados por plan y permisos</AlertTitle>
      <AlertDescription className="space-y-2 text-xs leading-relaxed">
        <p>
          La API de MailerLite <strong>sí permite</strong> programar y enviar
          campañas (<code>POST /campaigns/&#123;id&#125;/schedule</code> con
          entrega <em>instant</em>, <em>scheduled</em>, <em>timezone_based</em> o{" "}
          <em>smart_sending</em>), pero esas operaciones dependen de tu cuenta:
        </p>
        <ul className="ml-4 list-disc space-y-1">
          <li>
            El <strong>remitente</strong> (email/dominio) debe estar verificado
            en MailerLite.
          </li>
          <li>
            La cuenta debe estar <strong>aprobada para enviar</strong>: las
            cuentas gratuitas o en revisión pueden crear borradores pero no
            enviar.
          </li>
          <li>
            El envío y los límites de volumen requieren un{" "}
            <strong>plan de pago</strong>; el envío inteligente y por zona
            horaria requieren <strong>planes superiores</strong>.
          </li>
        </ul>
        <p>
          MusicDibs es una capa de experiencia musical y{" "}
          <strong>nunca envía ni programa correos</strong>: solo crea borradores.
          Tú revisas y envías manualmente desde MailerLite.
        </p>
      </AlertDescription>
    </Alert>
  );
}
