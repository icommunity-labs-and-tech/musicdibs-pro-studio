import { useState, type FormEvent } from "react";
import { Clock, Mail } from "lucide-react";
import { toast } from "sonner";

import { LandingWaveform } from "@/components/landing/landing-waveform";
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
import { DEMO_LIST_SIZES, DEMO_SECTORS } from "@/lib/landing-content";

export function DemoCta() {
  const [sector, setSector] = useState("");
  const [listSize, setListSize] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    // TODO: conectar a endpoint de captación de leads (submit-lead).
    setTimeout(() => {
      setSubmitting(false);
      (e.target as HTMLFormElement).reset();
      setSector("");
      setListSize("");
      toast.success("Demo solicitada", {
        description: "Te respondemos en menos de 24h para mostrarte un audio de tu sector en directo.",
      });
    }, 600);
  }

  return (
    <section
      id="solicitar-demo"
      className="ld-hero-surface scroll-mt-20 py-20 text-sand sm:py-28"
    >
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <div>
            <h2 className="font-display text-3xl font-semibold tracking-tight text-sand sm:text-4xl">
              Empieza a <span className="ld-gradient-text">diferenciarte</span> hoy
            </h2>
            <p className="mt-4 text-sand-200">
              Solicita una demo de 30 minutos. Te mostramos un audio generado para tu sector
              en directo.
            </p>
            <div className="mt-8 h-16 max-w-sm">
              <LandingWaveform bars={36} />
            </div>
            <div className="mt-8 space-y-2 text-sm text-sand-200">
              <p className="flex items-center gap-2">
                <Clock className="size-4" /> Respuesta en menos de 24h
              </p>
              <p className="flex items-center gap-2">
                <Mail className="size-4" /> También puedes escribirnos:{" "}
                <a href="mailto:info@musicdibs.com" className="underline hover:text-sand">
                  info@musicdibs.com
                </a>
              </p>
            </div>
          </div>

          <form
            onSubmit={handleSubmit}
            className="rounded-3xl border border-sand/15 bg-sand/5 p-6 backdrop-blur sm:p-8"
          >
            <div className="space-y-4">
              <DarkField id="d-name" label="Nombre y apellido" required />
              <DarkField id="d-email" label="Email corporativo" type="email" required />
              <DarkField id="d-company" label="Empresa" required />

              <div>
                <Label className="mb-1 block text-sm font-medium text-sand-200">Sector</Label>
                <Select value={sector} onValueChange={setSector} required>
                  <SelectTrigger className="h-10 border-sand/20 bg-night-800/60 text-sand">
                    <SelectValue placeholder="Selecciona tu sector" />
                  </SelectTrigger>
                  <SelectContent>
                    {DEMO_SECTORS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="mb-1 block text-sm font-medium text-sand-200">
                  Contactos en tu lista
                </Label>
                <Select value={listSize} onValueChange={setListSize} required>
                  <SelectTrigger className="h-10 border-sand/20 bg-night-800/60 text-sand">
                    <SelectValue placeholder="Selecciona un rango" />
                  </SelectTrigger>
                  <SelectContent>
                    {DEMO_LIST_SIZES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button type="submit" size="lg" className="mt-6 w-full" disabled={submitting}>
              {submitting ? "Enviando…" : "Solicitar demo gratuita →"}
            </Button>
          </form>
        </div>
      </div>
    </section>
  );
}

function DarkField({
  id,
  label,
  type = "text",
  required,
}: {
  id: string;
  label: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <Label htmlFor={id} className="mb-1 block text-sm font-medium text-sand-200">
        {label}
      </Label>
      <Input
        id={id}
        type={type}
        required={required}
        className="h-10 border-sand/20 bg-night-800/60 text-sand placeholder:text-sand-500"
      />
    </div>
  );
}
