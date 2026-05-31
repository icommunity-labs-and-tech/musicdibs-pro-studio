import { Check, Circle } from "lucide-react";

/**
 * "Una plataforma. Múltiples canales." — category vision, not feature list.
 * Communicates that MusicDibs is a new way of communicating with customers.
 */

const AVAILABLE = ["Email", "WhatsApp Business"];

const COMING_SOON = [
  "CRM journeys",
  "Customer onboarding",
  "Loyalty programs",
  "Customer experience",
];

export function ProductVision() {
  return (
    <section id="vision" className="scroll-mt-20 py-20 sm:py-28">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-gold/5 to-teal/5 p-8 sm:p-12">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-wider text-teal">
              Visión de producto
            </p>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              Una plataforma. Múltiples canales.
            </h2>
            <p className="mt-4 text-balance text-muted-foreground">
              Hoy email. Mañana cualquier canal donde la experiencia sonora pueda marcar la
              diferencia.
            </p>
          </div>

          <div className="mt-10 grid gap-6 sm:grid-cols-2">
            {/* Available */}
            <div className="rounded-2xl border border-border bg-card p-6">
              <p className="text-xs font-semibold uppercase tracking-wider text-teal-dark dark:text-teal-light">
                Disponible
              </p>
              <ul className="mt-4 space-y-3">
                {AVAILABLE.map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm font-medium">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-teal/15 text-teal-dark dark:text-teal-light">
                      <Check className="size-3.5" />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Coming soon */}
            <div className="rounded-2xl border border-dashed border-border bg-card/60 p-6">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Próximamente
              </p>
              <ul className="mt-4 space-y-3">
                {COMING_SOON.map((item) => (
                  <li
                    key={item}
                    className="flex items-center gap-3 text-sm font-medium text-muted-foreground"
                  >
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground/70">
                      <Circle className="size-3" />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <p className="mt-8 text-center font-display text-lg text-balance">
            No es una funcionalidad. Es una nueva forma de comunicarte con tus clientes.
          </p>
        </div>
      </div>
    </section>
  );
}
