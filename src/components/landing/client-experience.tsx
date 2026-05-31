import { ArrowDown, Check, MoreVertical, Play, Reply, Star } from "lucide-react";

/**
 * "Así lo vive tu cliente" — shows the recipient-side experience across
 * channels (Email today, WhatsApp Business soon) with realistic, hand-built
 * mockups (no stock imagery) so any visitor understands the product in <10s.
 */

const EMAIL_FLOW = [
  "Email recibido",
  'Botón "Escuchar mensaje"',
  "Landing personalizada con audio",
  "Conversión",
];

const WHATSAPP_FLOW = [
  "Mensaje recibido",
  "Audio personalizado",
  "Experiencia sonora de marca",
  "Conversión",
];

export function ClientExperience() {
  return (
    <section id="experiencia" className="scroll-mt-20 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-teal">
            La experiencia del destinatario
          </p>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            Así lo vive tu cliente
          </h2>
          <p className="mt-4 text-muted-foreground">
            Una experiencia sonora integrada en tus canales habituales.
          </p>
        </div>

        <div className="mt-14 grid gap-8 lg:grid-cols-2 lg:gap-10">
          {/* EMAIL */}
          <ChannelColumn
            label="Email"
            status="Disponible hoy"
            statusTone="live"
            flow={EMAIL_FLOW}
            mockup={<EmailMockup />}
          />

          {/* WHATSAPP */}
          <ChannelColumn
            label="WhatsApp Business"
            status="Muy pronto"
            statusTone="soon"
            flow={WHATSAPP_FLOW}
            mockup={<WhatsAppMockup />}
          />
        </div>
      </div>
    </section>
  );
}

function ChannelColumn({
  label,
  status,
  statusTone,
  flow,
  mockup,
}: {
  label: string;
  status: string;
  statusTone: "live" | "soon";
  flow: string[];
  mockup: React.ReactNode;
}) {
  return (
    <div className="flex flex-col rounded-3xl border border-border bg-card p-6 sm:p-8">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-xl font-semibold">{label}</h3>
        <span
          className={
            statusTone === "live"
              ? "inline-flex items-center gap-1.5 rounded-full bg-teal/10 px-3 py-1 text-xs font-medium text-teal-dark dark:text-teal-light"
              : "inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground"
          }
        >
          <span
            className={
              statusTone === "live"
                ? "size-1.5 rounded-full bg-teal"
                : "size-1.5 rounded-full bg-muted-foreground/60"
            }
          />
          {status}
        </span>
      </div>

      <div className="mt-6 flex flex-1 items-center justify-center rounded-2xl bg-muted/40 p-5 sm:p-7">
        {mockup}
      </div>

      <ol className="mt-6 flex flex-col items-center gap-1 text-center">
        {flow.map((step, i) => (
          <li key={step} className="flex flex-col items-center">
            <span className="text-sm font-medium">{step}</span>
            {i < flow.length - 1 && (
              <ArrowDown className="my-1 size-3.5 text-muted-foreground/50" aria-hidden />
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}

/* ── Email mockup (inbox-style card) ─────────────────────────────── */
function EmailMockup() {
  return (
    <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-border bg-background shadow-lg">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-full bg-gradient-to-br from-gold to-teal font-display text-sm font-bold text-night-900">
            M
          </span>
          <div className="leading-tight">
            <p className="text-sm font-semibold">Musicdibs · Tu aseguradora</p>
            <p className="text-xs text-muted-foreground">para ti · ahora</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Star className="size-4" aria-hidden />
          <Reply className="size-4" aria-hidden />
        </div>
      </div>

      <div className="px-4 py-4">
        <p className="font-display text-base font-semibold">
          Tenemos algo que queremos que escuches
        </p>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Hemos preparado un mensaje sonoro pensado solo para ti. Dura 20 segundos.
        </p>

        <button
          type="button"
          tabIndex={-1}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-gold to-teal px-4 py-3 text-sm font-semibold text-night-900 shadow-sm"
        >
          <Play className="size-4 fill-current" />
          Escuchar mensaje
        </button>
      </div>
    </div>
  );
}

/* ── WhatsApp mockup (chat with voice note) ──────────────────────── */
function WhatsAppMockup() {
  return (
    <div className="w-full max-w-[18rem] overflow-hidden rounded-2xl border border-border shadow-lg">
      {/* Chat header */}
      <div className="flex items-center justify-between bg-[#075E54] px-3 py-2.5 text-white">
        <div className="flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-full bg-white/15 font-display text-xs font-bold">
            M
          </span>
          <div className="leading-tight">
            <p className="flex items-center gap-1 text-sm font-semibold">
              Musicdibs
              <Check className="size-3 rounded-full bg-white/90 p-px text-[#075E54]" aria-hidden />
            </p>
            <p className="text-[10px] text-white/70">cuenta de empresa</p>
          </div>
        </div>
        <MoreVertical className="size-4 text-white/80" aria-hidden />
      </div>

      {/* Chat body */}
      <div className="space-y-2 bg-[#ECE5DD] px-3 py-4 dark:bg-[#0b141a]">
        <div className="ml-auto max-w-[90%] rounded-xl rounded-tr-sm bg-[#DCF8C6] px-2.5 py-2 dark:bg-[#005c4b]">
          {/* Voice note */}
          <div className="flex items-center gap-2.5">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#25D366] text-white">
              <Play className="size-3.5 fill-current" />
            </span>
            <div className="flex h-6 flex-1 items-center gap-[2px]" aria-hidden>
              {[6, 12, 9, 16, 11, 20, 14, 8, 18, 10, 22, 13, 7, 15, 9].map((h, i) => (
                <span
                  key={i}
                  className="w-[2px] rounded-full bg-[#075E54]/60 dark:bg-white/50"
                  style={{ height: `${h}px` }}
                />
              ))}
            </div>
            <span className="shrink-0 text-[10px] text-[#075E54]/70 dark:text-white/60">0:18</span>
          </div>
          <p className="mt-1.5 text-[11px] leading-snug text-[#075E54]/80 dark:text-white/80">
            Mensaje sonoro personalizado de tu marca
          </p>
          <p className="mt-1 text-right text-[9px] text-[#075E54]/50 dark:text-white/50">
            12:24 ✓✓
          </p>
        </div>
      </div>
    </div>
  );
}
