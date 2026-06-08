import { useState } from "react";
import { createFileRoute, Link, Navigate, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { FullScreenLoader } from "@/components/app/full-screen-loader";
import { AuthCardLayout } from "@/components/auth/auth-card-layout";
import { PasswordInput } from "@/components/auth/password-input";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { acceptInvitation } from "@/lib/accept-invitation";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search.token === "string" ? search.token : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Entrar · Musicdibs Enterprise" },
      {
        name: "description",
        content:
          "Accede a tu cuenta de Musicdibs Enterprise para gestionar campañas, contactos y métricas de marketing experiencial.",
      },
      { property: "og:title", content: "Entrar · Musicdibs Enterprise" },
      {
        property: "og:description",
        content:
          "Inicia sesión para gestionar tus campañas de marketing sonoro.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { session, loading, refresh } = useAuth();
  const { token } = Route.useSearch();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (loading) return <FullScreenLoader />;
  if (session) return <Navigate to="/dashboard" />;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setSubmitting(false);
      toast.error("No pudimos iniciar sesión", { description: error.message });
      return;
    }

    // Accept a pending invitation if the user arrived from an invite link.
    if (token && data.user) {
      const ok = await acceptInvitation(token, data.user.id);
      if (ok) {
        await refresh();
        toast.success("Invitación aceptada");
      }
    }
    setSubmitting(false);
    toast.success("Sesión iniciada");
    void navigate({ to: "/dashboard" });
  }

  return (
    <AuthCardLayout
      title="Accede a tu cuenta de Musicdibs Enterprise"
      subtitle="Entra para gestionar tus campañas"
      footer={
        <>
          ¿No tienes cuenta?{" "}
          <Link
            to="/signup"
            search={{ token }}
            className="font-medium text-gold-dark dark:text-gold-light hover:underline"
          >
            Crear una
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@empresa.com"
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Contraseña</Label>
            <Link
              to="/forgot-password"
              className="text-xs font-medium text-gold-dark dark:text-gold-light hover:underline"
            >
              ¿Olvidaste tu contraseña?
            </Link>
          </div>
          <PasswordInput
            id="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </div>
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Entrar"}
        </Button>
      </form>
    </AuthCardLayout>
  );
}
