import { useCallback, useState } from "react";
import { Check, Play, Quote } from "lucide-react";

import { AudioPlayer } from "@/components/app/audio-player";
import { DemoCta } from "@/components/landing/demo-cta";
import { HowItWorks } from "@/components/landing/how-it-works";
import { IntegrationsStrip } from "@/components/landing/integrations-strip";
import { LandingFooter } from "@/components/landing/landing-footer";
import { LandingNav } from "@/components/landing/landing-nav";
import { LandingWaveform } from "@/components/landing/landing-waveform";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  VERTICAL_LIST,
  type VerticalContent,
} from "@/lib/vertical-content";

export function VerticalLanding({ data }: { data: VerticalContent }) {
  const scrollToDemo = useCallback(() => {
    document
      .getElementById("solicitar-demo")
      ?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const scrollToAudio = useCallback(() => {
    document.getElementById("audio-demo")?.scrollIntoView({ behavior: "smooth" });
  }, []);

  return (
    <div className="min-h-dvh bg-background">
      {/* Nav links point back to the main landing sections */}
      <LandingNav onListen={scrollToAudio} onRequestDemo={scrollToDemo} linkBase="/" />

      <main>
        <VerticalHero data={data} onListen={scrollToAudio} onRequestDemo={scrollToDemo} />
        <VerticalAudioDemo data={data} onRequestDemo={scrollToDemo} />
        <VerticalProblem data={data} />
        <HowItWorks />
        <VerticalSolution data={data} />
        <VerticalMetrics data={data} />
        <VerticalUseCases data={data} />
        <VerticalTestimonial data={data} />
        <IntegrationsStrip />
        <DemoCta
          defaultSector={data.label}
          title={
            <>
              {data.cta.title.split(" ").slice(0, -1).join(" ")}{" "}
              <span className="ld-gradient-text">
                {data.cta.title.split(" ").slice(-1)}
              </span>
            </>
          }
          subtitle={data.cta.subtitle}
        />
      </main>

      <VerticalCrossLinks currentKey={data.key} />
      <LandingFooter />
    </div>
  );
}

function VerticalHero({
  data,
  onListen,
  onRequestDemo,
}: {
  data: VerticalContent;
  onListen: () => void;
  onRequestDemo: () => void;
}) {
  return (
    <section id="top" className="ld-hero-surface relative overflow-hidden text-sand">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="ld-float absolute left-[8%] top-[22%] h-2 w-2 rounded-full bg-gold/60" />
        <div className="ld-float absolute right-[12%] top-[30%] h-1.5 w-1.5 rounded-full bg-teal/70" style={{ animationDelay: "1.2s" }} />
        <div className="ld-float absolute left-[20%] bottom-[18%] h-1.5 w-1.5 rounded-full bg-gold-light/60" style={{ animationDelay: "2.1s" }} />
        <div className="ld-float absolute right-[24%] bottom-[26%] h-2 w-2 rounded-full bg-teal-light/50" style={{ animationDelay: "0.6s" }} />
      </div>

      <div className="relative mx-auto flex max-w-4xl flex-col items-center px-4 pb-20 pt-32 text-center sm:px-6 sm:pt-40 lg:pb-28">
        <span className="ld-fade-up mb-6 inline-flex items-center gap-2 rounded-full border border-sand/15 bg-sand/5 px-4 py-1.5 text-xs font-medium text-sand-200 backdrop-blur">
          <span aria-hidden>{data.icon}</span>
          {data.hero.eyebrow}
        </span>

        <h1
          className="ld-fade-up font-display text-4xl font-semibold leading-[1.08] tracking-tight text-sand sm:text-5xl lg:text-6xl"
          style={{ animationDelay: "0.08s" }}
        >
          {data.hero.headline}
        </h1>

        <p
          className="ld-fade-up mt-6 max-w-2xl text-balance text-lg text-sand-200 sm:text-xl"
          style={{ animationDelay: "0.16s" }}
        >
          {data.hero.subtitle}
        </p>

        <div
          className="ld-fade-up mt-10 flex w-full flex-col items-center gap-3 sm:w-auto sm:flex-row"
          style={{ animationDelay: "0.3s" }}
        >
          <Button
            size="lg"
            onClick={onRequestDemo}
            className="h-12 w-full px-8 text-base shadow-lg shadow-gold/20 sm:w-auto"
          >
            Solicitar demo
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={onListen}
            className="h-12 w-full border-sand/25 bg-transparent px-8 text-base text-sand hover:bg-sand/10 hover:text-sand sm:w-auto"
          >
            <Play className="size-5" />
            Escuchar ejemplo
          </Button>
        </div>

        <div
          className="ld-fade-up mt-16 h-24 w-full max-w-2xl sm:h-32"
          style={{ animationDelay: "0.38s" }}
        >
          <LandingWaveform bars={56} />
        </div>
      </div>
    </section>
  );
}

function VerticalAudioDemo({
  data,
  onRequestDemo,
}: {
  data: VerticalContent;
  onRequestDemo: () => void;
}) {
  return (
    <section id="audio-demo" className="scroll-mt-20 border-b border-border bg-background py-16 sm:py-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-border bg-gradient-to-br from-gold/5 to-teal/5 p-6 sm:p-8">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className="text-2xl" aria-hidden>
                🎵
              </span>
              <div>
                <h2 className="font-display text-lg font-semibold sm:text-xl">
                  {data.hero.audioLabel}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {data.hero.audioMeta}
                </p>
              </div>
            </div>
            <Badge className="shrink-0 bg-teal text-night-900">Demo</Badge>
          </div>
          <AudioPlayer src={data.hero.audioSrc} className="mt-5 bg-card" />
          <Button onClick={onRequestDemo} variant="outline" className="mt-5 w-full">
            Quiero un audio para mi campaña → Solicitar demo
          </Button>
        </div>
      </div>
    </section>
  );
}

function VerticalProblem({ data }: { data: VerticalContent }) {
  return (
    <section className="bg-muted/30 py-20 sm:py-28">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <p className="text-sm font-semibold uppercase tracking-wider text-teal">
          El problema
        </p>
        <h2 className="mt-3 text-balance font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          Qué no funciona hoy
        </h2>
        <div className="mt-8 space-y-4">
          {data.problem.map((line, i) => (
            <p
              key={i}
              className={cn(
                "text-lg leading-relaxed",
                i === data.problem.length - 1
                  ? "font-medium text-foreground"
                  : "text-muted-foreground",
              )}
            >
              {line}
            </p>
          ))}
        </div>
      </div>
    </section>
  );
}

function VerticalSolution({ data }: { data: VerticalContent }) {
  return (
    <section className="bg-background py-20 sm:py-28">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <p className="text-sm font-semibold uppercase tracking-wider text-teal">
          La solución
        </p>
        <h2 className="mt-3 text-balance font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          Cómo lo resuelve MusicDibs
        </h2>
        <ul className="mt-8 space-y-4">
          {data.solution.map((line, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="mt-1 flex size-6 shrink-0 items-center justify-center rounded-full bg-teal/15 text-teal">
                <Check className="size-4" />
              </span>
              <span className="text-lg leading-relaxed text-muted-foreground">
                {line}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function VerticalMetrics({ data }: { data: VerticalContent }) {
  return (
    <section id="resultados" className="scroll-mt-20 bg-muted/30 py-20 sm:py-28">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-teal">
            Resultados
          </p>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            Datos de {data.label.toLowerCase()} con MusicDibs
          </h2>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {data.metrics.map((m) => (
            <div
              key={m.label}
              className="rounded-2xl border border-border bg-card p-6 text-center"
            >
              <p className="font-display text-4xl font-semibold text-gold-dark dark:text-gold-light">
                {m.value}
              </p>
              <p className="mt-3 text-sm font-medium">{m.label}</p>
              <p className="mt-1 text-xs text-muted-foreground">vs {m.comparison}</p>
            </div>
          ))}
        </div>

        <p className="mx-auto mt-8 max-w-2xl text-center text-xs text-muted-foreground">
          {data.metricsNote}
        </p>
      </div>
    </section>
  );
}

function VerticalUseCases({ data }: { data: VerticalContent }) {
  return (
    <section className="bg-background py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-teal">
            Casos de uso
          </p>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            Campañas pensadas para tu sector
          </h2>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {data.useCases.map((uc, i) => (
            <div
              key={uc.title}
              className="rounded-2xl border border-border bg-card p-6 transition-shadow hover:shadow-lg"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-gold/15 to-teal/15 font-display text-lg font-semibold text-gold-dark dark:text-gold-light">
                {i + 1}
              </span>
              <h3 className="mt-5 font-display text-lg font-semibold">{uc.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {uc.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function VerticalTestimonial({ data }: { data: VerticalContent }) {
  return (
    <section className="bg-muted/30 py-20 sm:py-28">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <figure className="rounded-3xl border border-border bg-card p-8 sm:p-10">
          <Quote className="size-8 text-teal" aria-hidden />
          <blockquote className="mt-4 text-balance font-display text-xl leading-relaxed sm:text-2xl">
            {data.testimonial.quote}
          </blockquote>
          <figcaption className="mt-6 text-sm text-muted-foreground">
            — <span className="font-semibold text-foreground">{data.testimonial.author}</span>
            , {data.testimonial.company}
          </figcaption>
        </figure>
      </div>
    </section>
  );
}

function VerticalCrossLinks({ currentKey }: { currentKey: VerticalContent["key"] }) {
  return (
    <section className="border-t border-border bg-background">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center gap-5 text-center">
          <p className="text-sm font-medium text-muted-foreground">
            ¿No es tu sector? Mira el resto de verticales:
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {VERTICAL_LIST.filter((v) => v.key !== currentKey).map((v) => (
              <a
                key={v.key}
                href={v.path}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium transition-colors hover:border-teal hover:text-teal"
              >
                <span aria-hidden>{v.icon}</span>
                {v.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
