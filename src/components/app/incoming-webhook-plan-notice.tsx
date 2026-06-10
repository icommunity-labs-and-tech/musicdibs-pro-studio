import { AlertTriangle } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

/**
 * Advisory shown on the MailerLite / Brevo provider cards.
 *
 * Real-time campaign stats (aperturas, clics, bajas, rebotes) llegan a
 * MusicDibs mediante un *webhook entrante* que el proveedor envía a nuestra
 * URL cuando ocurre un evento. Esa capacidad está limitada por plan en cada
 * proveedor:
 *
 * - Brevo: los webhooks de eventos de marketing en tiempo real requieren el
 *   plan **Enterprise**.
 * - MailerLite: los webhooks requieren un **plan superior** (Advanced/Enterprise);
 *   en planes inferiores no se pueden registrar endpoints de webhook.
 *
 * Sin el webhook entrante la integración sigue funcionando (sincronización de
 * audiencias y creación de borradores), pero las estadísticas en tiempo real
 * no estarán disponibles.
 */
const COPY: Record<
  "brevo" | "mailerlite",
  { plan: string; detail: string }
> = {
  brevo: {
    plan: "Enterprise",
    detail:
      "En Brevo, los webhooks de eventos de marketing en tiempo real (aperturas, clics, rebotes, bajas) requieren el plan Enterprise.",
  },
  mailerlite: {
    plan: "superior",
    detail:
      "En MailerLite, registrar endpoints de webhook requiere un plan superior (Advanced/Enterprise). En planes inferiores no podrás recibir eventos en tiempo real.",
  },
};

export function IncomingWebhookPlanNotice({
  provider,
  className,
}: {
  provider: "brevo" | "mailerlite";
  className?: string;
}) {
  const { plan, detail } = COPY[provider];

  return (
    <Alert
      className={`border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-100 ${className ?? ""}`}
    >
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle className="text-xs font-semibold">
        Estadísticas en tiempo real: requieren plan {plan}
      </AlertTitle>
      <AlertDescription className="text-xs leading-relaxed">
        {detail} Sin el webhook entrante, la sincronización de audiencias y la
        creación de borradores siguen funcionando, pero no recibirás las
        estadísticas de campaña.
      </AlertDescription>
    </Alert>
  );
}
