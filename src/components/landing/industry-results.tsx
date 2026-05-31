import { Quote } from "lucide-react";

import { AudioPlayer } from "@/components/app/audio-player";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AUDIO_DEMOS, INDUSTRY_RESULTS } from "@/lib/landing-content";

export function IndustryResults() {
  return (
    <section id="resultados" className="scroll-mt-20 bg-muted/30 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-teal">
            Resultados por industria
          </p>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            Lo que consiguen nuestros clientes
          </h2>
          <p className="mt-4 text-muted-foreground">
            Resultados observados en pilotos y campañas iniciales. Comparativa contra benchmarks del sector.
          </p>
        </div>

        <Tabs id="industrias" defaultValue="seguros" className="mt-12 scroll-mt-24">
          <TabsList className="mx-auto flex h-auto w-full max-w-xl flex-wrap justify-center gap-1 sm:h-9">
            {INDUSTRY_RESULTS.map((ind) => (
              <TabsTrigger key={ind.key} value={ind.key} className="gap-1.5">
                <span aria-hidden>{ind.icon}</span>
                {ind.name}
              </TabsTrigger>
            ))}
          </TabsList>

          {INDUSTRY_RESULTS.map((ind) => {
            const demo = AUDIO_DEMOS.find((d) => d.key === ind.key);
            return (
              <TabsContent key={ind.key} value={ind.key} className="mt-8">
                <div className="grid gap-6 lg:grid-cols-5">
                  <div className="lg:col-span-3">
                    <div className="grid gap-4 sm:grid-cols-3">
                      {ind.metrics.map((m) => (
                        <div
                          key={m.label}
                          className="rounded-2xl border border-border bg-card p-5"
                        >
                          <p className="font-display text-3xl font-semibold text-gold-dark dark:text-gold-light">
                            {m.value}
                          </p>
                          <p className="mt-2 text-sm font-medium">{m.label}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            vs {m.benchmark}
                          </p>
                        </div>
                      ))}
                    </div>

                    <figure className="mt-4 rounded-2xl border border-border bg-card p-6">
                      <Quote className="size-6 text-teal" aria-hidden />
                      <blockquote className="mt-3 text-balance text-lg leading-relaxed">
                        {ind.quote}
                      </blockquote>
                      <figcaption className="mt-4 text-sm text-muted-foreground">
                        — {ind.author}
                      </figcaption>
                    </figure>
                  </div>

                  {demo && (
                    <div className="lg:col-span-2">
                      <div className="flex h-full flex-col justify-center rounded-2xl border border-border bg-gradient-to-br from-gold/5 to-teal/5 p-6">
                        <p className="text-sm font-medium text-muted-foreground">
                          Escucha la pieza de esta campaña
                        </p>
                        <p className="mt-1 font-display text-lg font-semibold">
                          {demo.objective}
                        </p>
                        <AudioPlayer src={demo.src} className="mt-4" />
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>
            );
          })}
        </Tabs>

        <p className="mx-auto mt-10 max-w-2xl text-center text-xs text-muted-foreground">
          Datos de pilotos realizados entre Q4 2024 y Q1 2025. Los resultados varían según
          sector, tamaño de lista y configuración de campaña.
        </p>
      </div>
    </section>
  );
}
