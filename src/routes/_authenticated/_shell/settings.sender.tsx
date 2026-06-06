import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2, Mail, Save } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useTenantSettings,
  useUpdateTenantSettings,
} from "@/hooks/use-tenant-settings";

export const Route = createFileRoute("/_authenticated/_shell/settings/sender")({
  head: () => ({
    meta: [{ title: "Configuración del remitente · Musicdibs Enterprise" }],
  }),
  component: SenderSettingsPage,
});

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function SenderSettingsPage() {
  const { tenant } = useAuth();
  const tenantId = tenant?.id;
  const settings = useTenantSettings(tenantId);

  if (settings.isLoading) {
    return <Skeleton className="h-64 rounded-2xl" />;
  }

  return (
    <SenderCard
      tenantId={tenantId}
      senderName={settings.data?.sender_name ?? ""}
      senderEmail={settings.data?.sender_email ?? ""}
      replyTo={settings.data?.reply_to_email ?? ""}
    />
  );
}

function SenderCard({
  tenantId,
  senderName,
  senderEmail,
  replyTo,
}: {
  tenantId: string | undefined;
  senderName: string;
  senderEmail: string;
  replyTo: string;
}) {
  const [name, setName] = useState(senderName);
  const [email, setEmail] = useState(senderEmail);
  const [reply, setReply] = useState(replyTo);

  useEffect(() => setName(senderName), [senderName]);
  useEffect(() => setEmail(senderEmail), [senderEmail]);
  useEffect(() => setReply(replyTo), [replyTo]);

  const updateSettings = useUpdateTenantSettings(tenantId);
  const saving = updateSettings.isPending;

  const emailInvalid = email.trim().length > 0 && !EMAIL_RE.test(email.trim());
  const replyInvalid = reply.trim().length > 0 && !EMAIL_RE.test(reply.trim());

  async function handleSave() {
    if (!name.trim() || !email.trim()) {
      toast.error("El nombre y el email del remitente son obligatorios");
      return;
    }
    if (!EMAIL_RE.test(email.trim())) {
      toast.error("Introduce un email de remitente válido");
      return;
    }
    if (reply.trim() && !EMAIL_RE.test(reply.trim())) {
      toast.error("El email de respuesta no es válido");
      return;
    }
    try {
      await updateSettings.mutateAsync({
        sender_name: name.trim(),
        sender_email: email.trim(),
        reply_to_email: reply.trim() || null,
      });
      toast.success("Configuración del remitente guardada");
    } catch (e) {
      toast.error("No pudimos guardar la configuración", {
        description: e instanceof Error ? e.message : undefined,
      });
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-display text-lg">
          <Mail className="h-4 w-4 text-primary" />
          Configuración del remitente
        </CardTitle>
        <CardDescription>
          Estos datos se usan automáticamente al crear borradores de campaña en
          tu plataforma de marketing. Se configuran una vez y se reutilizan en
          todas las campañas.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="sender-name">
            Nombre del remitente <span className="text-destructive">*</span>
          </Label>
          <Input
            id="sender-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Tu marca"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sender-email">
            Email del remitente <span className="text-destructive">*</span>
          </Label>
          <Input
            id="sender-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="newsletter@empresa.com"
            aria-invalid={emailInvalid}
          />
          <p className="text-xs text-muted-foreground">
            Usa una dirección de remitente ya verificada en tu cuenta de
            MailerLite.
          </p>
          {emailInvalid ? (
            <p className="text-xs text-destructive">Email no válido.</p>
          ) : null}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="reply-to">Email de respuesta (opcional)</Label>
          <Input
            id="reply-to"
            type="email"
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder="respuestas@empresa.com"
            aria-invalid={replyInvalid}
          />
          {replyInvalid ? (
            <p className="text-xs text-destructive">Email no válido.</p>
          ) : null}
        </div>
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-1.5 h-4 w-4" />
            )}
            Guardar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
