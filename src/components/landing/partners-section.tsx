import { Check } from "lucide-react";

import { Button } from "@/components/ui/button";

const PROGRAM = [
  "Margen de partner del 25% sobre cada cliente referido",
  "Acceso a panel de gestión multi-cliente",
  "Materiales de venta listos (deck, casos de uso, calculadora ROI)",
  "Demo exclusiva para agencias (sin compromiso)",
  "Formación técnica y de producto",
  "Co-branding disponible",
];

export function PartnersSection({ onPartnerInquiry }: { onPartnerInquiry: () => void }) {
  return (
    <section id="partners" className="scroll-mt-20 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-3xl border border-border bg-night-900 text-sand">
          <div className="grid gap-10 p-8 sm:p-12 lg:grid-cols-2 lg:gap-16">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-teal-light">
                Para agencias de marketing
              </p>
              <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
                Ofrece algo que ninguna otra agencia puede replicar todavía
              </h2>
              <p className="mt-5 text-sand-200">
                Tus clientes llevan años enviando las mismas comunicaciones. Musicdibs te permite
                ofrecerles la primera experiencia de comunicación emocional, en email y, muy pronto, WhatsApp.
              </p>
              <p className="mt-3 font-display text-lg text-sand">
                No es otro servicio. Es una ventaja competitiva.
              </p>
              <Button
                size="lg"
                onClick={onPartnerInquiry}
                className="mt-8 h-12 px-8 text-base"
              >
                Solicitar información del programa →
              </Button>
            </div>

            <ul className="space-y-4">
              {PROGRAM.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-teal/20 text-teal-light">
                    <Check className="size-3.5" />
                  </span>
                  <span className="text-sand-200">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
