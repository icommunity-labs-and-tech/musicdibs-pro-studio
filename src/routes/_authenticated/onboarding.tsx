import { useState } from "react";
import { createFileRoute, Navigate, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { FullScreenLoader } from "@/components/app/full-screen-loader";
import { AuthCardLayout } from "@/components/auth/auth-card-layout";
import { useAuth } from "@/components/auth/auth-provider";
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
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({ meta: [{ title: "Configura tu espacio · Musicdibs" }] }),
  component: OnboardingPage,
});

const VERTICALS = [
  { value: "music", label: "Música y artistas" },
  { value: "retail", label: "Retail y ecommerce" },
  { value: "events", label: "Eventos y ocio" },
  { value: "agency", label: "Agencia de marketing" },
  { value: "other", label: "Otro" },
];

function OnboardingPage() {
  const { tenant, loading, refresh } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [vertical, setVertical] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (loading) return <FullScreenLoader />;
  if (tenant?.setup_complete) return <Navigate to="/dashboard" />;

  if (!tenant) {
    return (
      <AuthCardLayout
        title="Preparando tu espacio"
        subtitle="Estamos terminando de configurar tu cuenta. Vuelve a intentarlo en unos segundos."
      >
        <Button className="w-full" onClick={() => void refresh()}>
          Reintentar
        </Button>
      </AuthCardLayout>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!tenant) return;
    setSubmitting(true);
    const { error } = await supabase
      .from("tenants")
      .update({
        name: name.trim() || tenant.name,
        vertical: vertical || tenant.vertical,
        setup_complete: true,
      })
      .eq("id", tenant.id);
    setSubmitting(false);

    if (error) {
      toast.error("No pudimos guardar la configuración", {
        description: error.message,
      });
      return;
    }

    await refresh();
    toast.success("¡Todo listo!");
    void navigate({ to: "/dashboard" });
  }

  return (
    <AuthCardLayout
      title="Configura tu espacio"
      subtitle="Solo un par de datos para personalizar tus campañas"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="company">Nombre de la empresa</Label>
          <Input
            id="company"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={tenant.name || "Mi empresa"}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="vertical">Sector</Label>
          <Select value={vertical} onValueChange={setVertical}>
            <SelectTrigger id="vertical">
              <SelectValue placeholder="Elige tu sector" />
            </SelectTrigger>
            <SelectContent>
              {VERTICALS.map((v) => (
                <SelectItem key={v.value} value={v.value}>
                  {v.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            "Entrar al panel"
          )}
        </Button>
      </form>
    </AuthCardLayout>
  );
}
