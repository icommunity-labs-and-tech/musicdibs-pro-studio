import { Play } from "lucide-react";

import { Button } from "@/components/ui/button";
import { LandingWaveform } from "@/components/landing/landing-waveform";

export function HeroSection({
  onListen,
  onRequestDemo,
}: {
  onListen: () => void;
  onRequestDemo: () => void;
}) {
  return (
    <section
      id="top"
      className="ld-hero-surface relative overflow-hidden text-sand"
    >
      {/* Ambient floating sound rings */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="ld-float absolute left-[8%] top-[22%] h-2 w-2 rounded-full bg-gold/60" />
        <div className="ld-float absolute right-[12%] top-[30%] h-1.5 w-1.5 rounded-full bg-teal/70" style={{ animationDelay: "1.2s" }} />
        <div className="ld-float absolute left-[20%] bottom-[18%] h-1.5 w-1.5 rounded-full bg-gold-light/60" style={{ animationDelay: "2.1s" }} />
        <div className="ld-float absolute right-[24%] bottom-[26%] h-2 w-2 rounded-full bg-teal-light/50" style={{ animationDelay: "0.6s" }} />
      </div>

      <div className="relative mx-auto flex max-w-4xl flex-col items-center px-4 pb-20 pt-32 text-center sm:px-6 sm:pt-40 lg:pb-28">
        <span className="ld-fade-up mb-6 inline-flex items-center gap-2 rounded-full border border-sand/15 bg-sand/5 px-4 py-1.5 text-xs font-medium text-sand-200 backdrop-blur">
          <span className="relative flex h-2 w-2">
            <span className="ld-pulse-ring absolute inline-flex h-full w-full rounded-full bg-teal" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-teal" />
          </span>
          Bienvenido al nuevo Marketing Experiencial
        </span>

        <h1
          className="ld-fade-up font-display text-4xl font-semibold leading-[1.05] tracking-tight text-sand sm:text-6xl lg:text-7xl"
          style={{ animationDelay: "0.08s" }}
        >
          Marketing experiencial con audio personalizado para email y WhatsApp<br />
          <span className="ld-gradient-text">Convierte tus campañas en experiencias sonoras memorables</span>
        </h1>

        <p
          className="ld-fade-up mt-6 max-w-2xl text-balance text-lg text-sand-200 sm:text-xl"
          style={{ animationDelay: "0.16s" }}
        >
          La primera plataforma que convierte tus campañas de email y WhatsApp en
          experiencias sonoras personalizadas capaces de multiplicar aperturas, engagement y conversión.
        </p>

        <p
          className="ld-fade-up mt-3 max-w-xl text-sm text-sand-500"
          style={{ animationDelay: "0.22s" }}
        >
          Cada campaña genera una pieza musical única adaptada a tu sector, segmento y objetivo.
        </p>

        <div
          className="ld-fade-up mt-10 flex w-full flex-col items-center gap-3 sm:w-auto sm:flex-row"
          style={{ animationDelay: "0.3s" }}
        >
          <Button
            size="lg"
            onClick={onListen}
            className="h-12 w-full px-8 text-base shadow-lg shadow-gold/20 sm:w-auto"
          >
            <Play className="size-5" />
            Escuchar un ejemplo
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={onRequestDemo}
            className="h-12 w-full border-sand/25 bg-transparent px-8 text-base text-sand hover:bg-sand/10 hover:text-sand sm:w-auto"
          >
            Solicitar demo
          </Button>
        </div>

        {/* Hero waveform visual (not a dashboard mockup) */}
        <div
          className="ld-fade-up mt-16 h-28 w-full max-w-2xl sm:h-36"
          style={{ animationDelay: "0.38s" }}
        >
          <LandingWaveform bars={56} />
        </div>
      </div>
    </section>
  );
}
