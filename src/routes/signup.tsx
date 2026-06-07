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

export const Route = createFileRoute("/signup")({
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search.token === "string" ? search.token : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Crear cuenta · Musicdibs Enterprise" },
      {
        name: "description",
        content:
          "Crea tu cuenta en Musicdibs Enterprise y empieza a lanzar campañas de marketing experiencial con audio generado por IA.",
      },
      { property: "og:title", content: "Crear cuenta · Musicdibs Enterprise" },
      {
        property: "og:description",
        content:
          "Regístrate para gestionar y enviar campañas de marketing sonoro desde una sola plataforma B2B.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SignupPage,
});

function SignupPage() {
  const { session, loading, refresh } = useAuth();
  const { token } = Route.useSearch();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [accountExists, setAccountExists] = useState(false);

  if (loading) return <FullScreenLoader />;
  if (session) return <Navigate to="/dashboard" />;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("La contraseña debe tener al menos 8 caracteres");
      return;
    }
    setAccountExists(false);
    setSubmitting(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: { full_name: fullName },
      },
    });

    if (error) {
      setSubmitting(false);
      // Existing accounts can't sign up again — guide them to log in instead,
      // carrying the invitation token so they can accept it after signing in.
      if (/already|registrado|registered|exists/i.test(error.message)) {
        setAccountExists(true);
        return;
      }
      toast.error("No pudimos crear la cuenta", { description: error.message });
      return;
    }

    // Link the new user to the invited tenant when arriving from an invite.
    if (token && data.user) {
      await acceptInvitation(token, data.user.id);
    }
    setSubmitting(false);

    if (data.session) {
      await refresh();
      toast.success("Cuenta creada");
      void navigate({ to: "/dashboard" });
    } else {
      toast.success("Revisa tu email", {
        description: "Te enviamos un enlace para confirmar tu cuenta.",
      });
      void navigate({ to: "/login", search: token ? { token } : {} });
    }
  }

  return (
    <AuthCardLayout
      title="Crea tu cuenta"
      subtitle="Empieza a crear campañas con música generada por IA"
      footer={
        <>
          ¿Ya tienes cuenta?{" "}
          <Link
            to="/login"
            search={token ? { token } : {}}
            className="font-medium text-gold-dark dark:text-gold-light hover:underline"
          >
            Entrar
          </Link>
        </>
      }
    >
      {accountExists ? (
        <div className="mb-4 rounded-lg border border-gold-dark/30 bg-gold-light/10 p-3 text-sm">
          <p className="font-medium">Ya existe una cuenta con este email.</p>
          <p className="mt-1 text-muted-foreground">
            Inicia sesión para continuar
            {token ? " y aceptar la invitación" : ""}.
          </p>
          <Link
            to="/login"
            search={token ? { token } : {}}
            className="mt-2 inline-block font-medium text-gold-dark dark:text-gold-light hover:underline"
          >
            Ir a iniciar sesión →
          </Link>
        </div>
      ) : null}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="fullName">Nombre completo</Label>
          <Input
            id="fullName"
            autoComplete="name"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Ada Lovelace"
          />
        </div>
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
          <PasswordInput
            id="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mínimo 8 caracteres"
          />
        </div>
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Crear cuenta"}
        </Button>
      </form>
    </AuthCardLayout>
  );
}
