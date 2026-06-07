import { Info } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { ProviderType } from "@/lib/providers";

/**
 * Provider-specific advisory about what can be personalized / sent from
 * MusicDibs given each platform's plan rules.
 *
 * MusicDibs is an AI Music Experience Layer: it generates the experience and
 * (where the plan allows) the personalized HTML. The actual sending always
 * happens through the customer's connected provider.
 *
 * - MailerLite: injecting custom HTML into a campaign requires the Advanced
 *   plan. On lower plans the draft is created WITHOUT the custom content.
 * - Brevo: custom HTML campaigns are available on all plans; sending volume
 *   depends on the plan.
 * - Resend: custom HTML is available on all plans; a verified sending domain
 *   is required to deliver.
 */
const NOTICES: Record<
  ProviderType,
  { title: string; lines: string[] }
> = {
  mailerlite: {
    title: "MailerLite: personalización limitada por plan",
    lines: [
      "Personalizar la plantilla de correo (HTML) desde MusicDibs requiere el plan Advanced de MailerLite. En planes inferiores el borrador se crea, pero sin el contenido personalizado.",
      "El remitente debe estar verificado y la cuenta aprobada para enviar. MusicDibs solo crea borradores; tú revisas y envías desde MailerLite.",
    ],
  },
  brevo: {
    title: "Brevo: HTML disponible en todos los planes",
    lines: [
      "El envío de campañas con HTML personalizado está disponible en todos los planes de Brevo.",
      "Los límites de volumen de envío dependen de tu plan. El remitente debe estar verificado en Brevo.",
    ],
  },
  resend: {
    title: "Resend: HTML disponible en todos los planes",
    lines: [
      "Resend permite enviar HTML personalizado en todos los planes.",
      "Necesitas un dominio de envío verificado en Resend para entregar los correos.",
    ],
  },
};

export function ProviderPlanNotice({
  provider,
  variant = "full",
}: {
  provider: ProviderType;
  /** "full" for settings pages, "compact" for dialogs. */
  variant?: "full" | "compact";
}) {
  const notice = NOTICES[provider];
  if (!notice) return null;

  if (variant === "compact") {
    return (
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription className="text-xs leading-relaxed">
          {notice.lines[0]}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert>
      <Info className="h-4 w-4" />
      <AlertTitle>{notice.title}</AlertTitle>
      <AlertDescription className="space-y-2 text-xs leading-relaxed">
        {notice.lines.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </AlertDescription>
    </Alert>
  );
}
