import { Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PRICING_PLANS } from "@/lib/landing-content";
import { cn } from "@/lib/utils";

export function PricingSection({ onRequestDemo }: { onRequestDemo: () => void }) {
  return (
    <section id="precios" className="scroll-mt-20 bg-muted/30 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-teal">
            Precios
          </p>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            Precios simples. ROI claro.
          </h2>
        </div>

        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {PRICING_PLANS.map((plan) => (
            <div
              key={plan.name}
              className={cn(
                "relative flex flex-col rounded-3xl border bg-card p-8",
                plan.highlight
                  ? "border-gold shadow-xl shadow-gold/10 lg:-mt-4 lg:mb-4"
                  : "border-border",
              )}
            >
              {plan.highlight && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gold px-3 py-1 text-xs font-semibold text-night-900">
                  Más popular
                </span>
              )}
              <h3 className="font-display text-xl font-semibold">{plan.name}</h3>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="font-display text-4xl font-semibold">{plan.price}</span>
                {plan.period && (
                  <span className="text-sm text-muted-foreground">{plan.period}</span>
                )}
              </div>

              <ul className="mt-6 flex-1 space-y-3">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm">
                    <Check className="mt-0.5 size-4 shrink-0 text-teal" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <Button
                onClick={onRequestDemo}
                variant={plan.highlight ? "default" : "outline"}
                size="lg"
                className="mt-8 w-full"
              >
                {plan.cta}
              </Button>
            </div>
          ))}
        </div>

        <div className="mx-auto mt-10 max-w-2xl text-center">
          <p className="text-sm text-muted-foreground">
            ¿Necesitas más volumen o condiciones especiales? Tenemos precios para agencias y
            grandes cuentas.
          </p>
          <p className="mt-3 text-sm font-medium">
            30 días de prueba sin compromiso. Cancela cuando quieras.
          </p>
        </div>
      </div>
    </section>
  );
}
