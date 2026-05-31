import { useState } from "react";
import { createFileRoute, Link, Navigate, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { FullScreenLoader } from "@/components/app/full-screen-loader";
import { AuthCardLayout } from "@/components/auth/auth-card-layout";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/login")({
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
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (loading) return <FullScreenLoader />;
  if (session) return <Navigate to="/dashboard" />;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setSubmitting(false);
    if (error) {
      toast.error("No pudimos iniciar sesión", { description: error.message });
      return;
    }
    toast.success("Sesión iniciada");
    void navigate({ to: "/dashboard" });
  }

  return (
    <AuthCardLayout
      title="Bienvenido de nuevo"
      subtitle="Entra para gestionar tus campañas"
      footer={
        <>
          ¿No tienes cuenta?{" "}
          <Link to="/signup" className="font-medium text-gold-dark dark:text-gold-light hover:underline">
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
          <Label htmlFor="password">Contraseña</Label>
          <Input
            id="password"
            type="password"
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
