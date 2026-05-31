import { INTEGRATIONS } from "@/lib/landing-content";

export function IntegrationsStrip() {
  return (
    <section className="border-y border-border bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <p className="text-center font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Tu ecosistema de comunicación, ahora memorable
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-x-12 gap-y-8">
          {INTEGRATIONS.map((integration) => (
            <img
              key={integration.slug}
              src={`https://cdn.simpleicons.org/${integration.slug}`}
              alt={`Logo de ${integration.name}`}
              title={integration.name}
              loading="lazy"
              className="h-8 w-auto opacity-60 grayscale transition-all duration-300 hover:opacity-100 hover:grayscale-0"
            />
          ))}
        </div>
        <p className="mt-8 text-center text-sm text-muted-foreground">
          No sustituyes tu stack actual. Lo haces más memorable.
        </p>
      </div>
    </section>
  );
}
