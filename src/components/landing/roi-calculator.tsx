import { useMemo, useState } from "react";
import { TrendingUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { ROI_SECTORS } from "@/lib/landing-content";

const eur = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});
const num = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0 });

function pickPlan(emails: number): { name: string; price: number | null } {
  if (emails <= 50_000) return { name: "Starter", price: 399 };
  if (emails <= 200_000) return { name: "Professional", price: 999 };
  return { name: "Enterprise", price: null };
}

export function RoiCalculator({ onRequestDemo }: { onRequestDemo: () => void }) {
  const [emails, setEmails] = useState(50_000);
  const [openRate, setOpenRate] = useState(22);
  const [ticket, setTicket] = useState(120);
  const [conversion, setConversion] = useState(3);
  const [sector, setSector] = useState("seguros");

  const result = useMemo(() => {
    const uplift = ROI_SECTORS.find((s) => s.key === sector)?.upliftPP ?? 28;
    const newOpenRate = Math.min(openRate + uplift, 90);
    const extraOpens = emails * ((newOpenRate - openRate) / 100);
    const extraConversions = extraOpens * (conversion / 100);
    const extraRevenue = extraConversions * ticket;
    const plan = pickPlan(emails);
    const roi = plan.price ? extraRevenue / plan.price : null;
    const net = plan.price ? extraRevenue - plan.price : extraRevenue;
    return { newOpenRate, extraOpens, extraConversions, extraRevenue, plan, roi, net };
  }, [emails, openRate, ticket, conversion, sector]);

  return (
    <section id="roi" className="scroll-mt-20 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-teal">
            Calcula tu ROI
          </p>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            ¿Cuánto vale aumentar tu tasa de apertura?
          </h2>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          {/* Inputs */}
          <div className="rounded-3xl border border-border bg-card p-6 sm:p-8">
            <div className="space-y-7">
              <div>
                <Label className="mb-1 block text-sm font-medium">Sector</Label>
                <Select value={sector} onValueChange={setSector}>
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROI_SECTORS.map((s) => (
                      <SelectItem key={s.key} value={s.key}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <SliderRow
                label="Emails enviados por mes"
                value={`${num.format(emails)}`}
                min={1000}
                max={500_000}
                step={1000}
                current={emails}
                onChange={setEmails}
              />
              <SliderRow
                label="Open rate actual"
                value={`${openRate}%`}
                min={5}
                max={40}
                step={1}
                current={openRate}
                onChange={setOpenRate}
              />
              <div>
                <Label htmlFor="roi-ticket" className="mb-1 block text-sm font-medium">
                  Ticket medio / valor por conversión (€)
                </Label>
                <Input
                  id="roi-ticket"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  value={ticket}
                  onChange={(e) => setTicket(Math.max(0, Number(e.target.value) || 0))}
                  className="h-10"
                />
              </div>
              <SliderRow
                label="Tasa de conversión sobre abiertos"
                value={`${conversion}%`}
                min={0.5}
                max={10}
                step={0.5}
                current={conversion}
                onChange={setConversion}
              />
            </div>
          </div>

          {/* Output */}
          <div className="flex flex-col rounded-3xl border border-gold/30 bg-gradient-to-br from-gold/8 to-teal/8 p-6 sm:p-8">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <TrendingUp className="size-4 text-teal" />
              Con MusicDibs · open rate estimado {Math.round(result.newOpenRate)}%
            </div>

            <dl className="mt-6 space-y-4">
              <Stat label="Aperturas adicionales / mes" value={`+${num.format(result.extraOpens)}`} />
              <Stat
                label="Conversiones adicionales / mes"
                value={`+${num.format(result.extraConversions)}`}
              />
              <Stat
                label="Ingresos adicionales estimados"
                value={`+${eur.format(result.extraRevenue)}/mes`}
                emphasis
              />
            </dl>

            <div className="mt-6 rounded-2xl border border-border bg-background/60 p-5">
              <p className="text-sm text-muted-foreground">
                Plan recomendado:{" "}
                <span className="font-semibold text-foreground">
                  {result.plan.name}
                  {result.plan.price ? ` (${eur.format(result.plan.price)}/mes)` : ""}
                </span>
              </p>
              <div className="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-1">
                {result.roi !== null && (
                  <span className="font-display text-3xl font-semibold text-gold-dark dark:text-gold-light">
                    {Math.round(result.roi)}x ROI
                  </span>
                )}
                <span className="text-sm text-muted-foreground">
                  {result.net > 0 ? `+${eur.format(result.net)}/mes netos estimados` : "Estimación a medida"}
                </span>
              </div>
            </div>

            <Button size="lg" className="mt-6 w-full" onClick={onRequestDemo}>
              Validar este estimado con mi caso real →
            </Button>
            <p className="mt-3 text-center text-xs text-muted-foreground/70">
              Basado en la mejora media observada en pilotos del sector seleccionado.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function SliderRow({
  label,
  value,
  min,
  max,
  step,
  current,
  onChange,
}: {
  label: string;
  value: string;
  min: number;
  max: number;
  step: number;
  current: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <Label className="text-sm font-medium">{label}</Label>
        <span className="font-mono text-sm font-semibold text-foreground">{value}</span>
      </div>
      <Slider
        min={min}
        max={max}
        step={step}
        value={[current]}
        onValueChange={(v) => onChange(v[0])}
        aria-label={label}
      />
    </div>
  );
}

function Stat({
  label,
  value,
  emphasis,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border/60 pb-3 last:border-0 last:pb-0">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd
        className={
          emphasis
            ? "font-display text-xl font-semibold text-teal"
            : "font-mono text-base font-semibold"
        }
      >
        {value}
      </dd>
    </div>
  );
}
