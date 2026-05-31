import { INTEGRATIONS } from "@/lib/landing-content";

export function IntegrationsStrip() {
  return (
    <section className="border-y border-border bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <p className="text-center text-sm font-medium text-muted-foreground">
          Tu ecosistema de comunicación, ahora memorable
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-5">
          {INTEGRATIONS.map((name) => (
            <span
              key={name}
              className="font-display text-lg font-semibold text-foreground/70 transition-colors hover:text-foreground"
            >
              {name}
            </span>
          ))}
        </div>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          No sustituyes tu stack actual. Lo haces más memorable.
        </p>
      </div>
    </section>
  );
}
