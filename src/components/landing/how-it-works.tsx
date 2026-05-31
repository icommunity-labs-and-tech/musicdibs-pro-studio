import { BarChart3, FileText, Music, Send } from "lucide-react";

import { HOW_IT_WORKS } from "@/lib/landing-content";

const ICONS = [FileText, Music, Send, BarChart3];

export function HowItWorks() {
  return (
    <section id="como-funciona" className="scroll-mt-20 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-teal">
            Cómo funciona
          </p>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            De la idea a la campaña en 4 pasos
          </h2>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {HOW_IT_WORKS.map((item, i) => {
            const Icon = ICONS[i];
            return (
              <div
                key={item.step}
                className="group relative rounded-2xl border border-border bg-card p-6 transition-shadow hover:shadow-lg"
              >
                <div className="flex items-center justify-between">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-gold/15 to-teal/15 text-gold-dark dark:text-gold-light">
                    <Icon className="size-5" />
                  </span>
                  <span className="font-mono text-sm text-muted-foreground">
                    {item.step}
                  </span>
                </div>
                <h3 className="mt-5 font-display text-xl font-semibold">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">{item.body}</p>
                <p className="mt-4 text-xs text-muted-foreground/70">{item.note}</p>
              </div>
            );
          })}
        </div>

        <p className="mx-auto mt-12 max-w-2xl text-center text-sm text-muted-foreground">
          El audio no se reproduce dentro del mensaje. Musicdibs añade un botón que lleva a una
          micro-landing con el player — funciona en cualquier canal, tanto email como WhatsApp, y
          además medimos quién abrió el mensaje, escuchó y convirtió.
        </p>
      </div>
    </section>
  );
}
