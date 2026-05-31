import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { PARTNER_CLIENT_RANGES } from "@/lib/landing-content";

export function PartnerDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [clients, setClients] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    // TODO: conectar a endpoint de captación de leads (submit-lead).
    setTimeout(() => {
      setSubmitting(false);
      onOpenChange(false);
      setClients("");
      toast.success("Solicitud enviada", {
        description: "Te contactamos en menos de 24h con la información del programa de partners.",
      });
    }, 600);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">
            Programa de partners
          </DialogTitle>
          <DialogDescription>
            Cuéntanos sobre tu agencia y te enviamos toda la información.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Field id="p-agency" label="Nombre de la agencia" required />
          <Field id="p-name" label="Nombre y cargo" required />
          <Field id="p-email" label="Email" type="email" required />

          <div>
            <Label className="mb-1 block text-sm font-medium">Clientes activos</Label>
            <Select value={clients} onValueChange={setClients} required>
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Selecciona un rango" />
              </SelectTrigger>
              <SelectContent>
                {PARTNER_CLIENT_RANGES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="p-message" className="mb-1 block text-sm font-medium">
              Mensaje (opcional)
            </Label>
            <Textarea id="p-message" rows={3} placeholder="Cuéntanos qué buscas…" />
          </div>

          <Button type="submit" size="lg" className="w-full" disabled={submitting}>
            {submitting ? "Enviando…" : "Solicitar información →"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({
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
      <Label htmlFor={id} className="mb-1 block text-sm font-medium">
        {label}
      </Label>
      <Input id={id} type={type} required={required} className="h-10" />
    </div>
  );
}
