import { Brain, Clock, Sparkles, Target } from "lucide-react";

/**
 * "¿Por qué funciona?" — emotional value proposition.
 * Corporate tone, no pseudo-scientific claims.
 */

const REASONS = [
  {
    icon: Target,
    title: "Mayor atención",
    body: "Las experiencias sonoras destacan frente al ruido habitual de los canales digitales.",
  },
  {
    icon: Brain,
    title: "Más recuerdo de marca",
    body: "Los usuarios recuerdan mejor una experiencia que un mensaje tradicional.",
  },
  {
    icon: Clock,
    title: "Más tiempo de interacción",
    body: "El audio aumenta el tiempo de permanencia y la conexión emocional.",
  },
  {
    icon: Sparkles,
    title: "Más conversión",
    body: "Más atención y más engagement generan mejores resultados de negocio.",
  },
];

export function WhyItWorks() {
  return (
    <section id="por-que-funciona" className="scroll-mt-20 bg-muted/30 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-teal">
            ¿Por qué funciona?
          </p>
          <h2 className="mt-3 text-balance font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            La emoción genera atención. La atención genera resultados.
          </h2>
          <p className="mt-4 text-muted-foreground">
            La música activa mecanismos emocionales que el texto y las imágenes no consiguen
            por sí solos.
          </p>
        </div>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {REASONS.map((r) => {
            const Icon = r.icon;
            return (
              <div
                key={r.title}
                className="rounded-2xl border border-border bg-card p-6 transition-shadow hover:shadow-lg"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-gold/15 to-teal/15 text-gold-dark dark:text-gold-light">
                  <Icon className="size-5" />
                </span>
                <h3 className="mt-5 font-display text-lg font-semibold">{r.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{r.body}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
