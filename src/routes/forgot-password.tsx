import { useState } from "react";
import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { ArrowLeft, Loader2, MailCheck } from "lucide-react";
import { toast } from "sonner";

import { FullScreenLoader } from "@/components/app/full-screen-loader";
import { AuthCardLayout } from "@/components/auth/auth-card-layout";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Recuperar contraseña · Musicdibs Enterprise" },
      {
        name: "description",
        content:
          "Restablece la contraseña de tu cuenta de Musicdibs Enterprise.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const { session, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  if (loading) return <FullScreenLoader />;
  if (session) return <Navigate to="/dashboard" />;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setSubmitting(false);
    if (error) {
      toast.error("No pudimos enviar el email", { description: error.message });
      return;
    }
    setSent(true);
  }

  return (
    <AuthCardLayout
      title="Recupera tu contraseña"
      subtitle={
        sent ? undefined : "Te enviaremos un enlace para crear una nueva contraseña"
      }
      footer={
        <Link
          to="/login"
          search={{ token: undefined }}
          className="inline-flex items-center gap-1 font-medium text-gold-dark dark:text-gold-light hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Volver a iniciar sesión
        </Link>
      }
    >
      {sent ? (
        <div className="space-y-3 text-center">
          <MailCheck className="mx-auto h-10 w-10 text-gold-dark dark:text-gold-light" />
          <p className="text-sm text-muted-foreground">
            Si existe una cuenta con <strong className="text-foreground">{email}</strong>,
            recibirás un email con un enlace para restablecer tu contraseña.
          </p>
        </div>
      ) : (
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
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Enviar enlace de recuperación"
            )}
          </Button>
        </form>
      )}
    </AuthCardLayout>
  );
}
