import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2, Save } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useTenantSettings,
  useUpdateTenantName,
  useUpdateTenantSettings,
} from "@/hooks/use-tenant-settings";

export const Route = createFileRoute("/_authenticated/_shell/settings")({
  head: () => ({ meta: [{ title: "Ajustes · Musicdibs Enterprise" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const { tenant, refresh } = useAuth();
  const tenantId = tenant?.id;
  const settings = useTenantSettings(tenantId);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold sm:text-3xl">Ajustes</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Configura tu espacio de trabajo.
        </p>
      </div>

      {settings.isLoading ? (
        <Skeleton className="h-48 rounded-2xl" />
      ) : (
        <ProfileCard
          tenantId={tenantId}
          tenantName={tenant?.name ?? ""}
          plan={tenant?.plan}
          onTenantUpdated={refresh}
          supportEmail={settings.data?.support_email ?? ""}
          website={settings.data?.website ?? ""}
        />
      )}
    </div>
  );
}


function ProfileCard({
  tenantId,
  tenantName,
  plan,
  onTenantUpdated,
  supportEmail,
  website,
}: {
  tenantId: string | undefined;
  tenantName: string;
  plan: string | undefined;
  onTenantUpdated: () => Promise<void>;
  supportEmail: string;
  website: string;
}) {
  const [name, setName] = useState(tenantName);
  const [email, setEmail] = useState(supportEmail);
  const [web, setWeb] = useState(website);

  useEffect(() => setName(tenantName), [tenantName]);
  useEffect(() => setEmail(supportEmail), [supportEmail]);
  useEffect(() => setWeb(website), [website]);

  const updateName = useUpdateTenantName(tenantId);
  const updateSettings = useUpdateTenantSettings(tenantId);
  const saving = updateName.isPending || updateSettings.isPending;

  async function handleSave() {
    try {
      if (name.trim() && name.trim() !== tenantName) {
        await updateName.mutateAsync(name);
        await onTenantUpdated();
      }
      await updateSettings.mutateAsync({
        support_email: email.trim() || null,
        website: web.trim() || null,
      });
      toast.success("Ajustes guardados");
    } catch (e) {
      toast.error("No pudimos guardar los cambios", {
        description: e instanceof Error ? e.message : undefined,
      });
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="font-display text-lg">
            Perfil del espacio
          </CardTitle>
          {plan ? (
            <Badge variant="secondary" className="capitalize">
              Plan {plan}
            </Badge>
          ) : null}
        </div>
        <CardDescription>
          Información general de tu organización.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="tenant-name">Nombre de la empresa</Label>
          <Input
            id="tenant-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="support-email">Email de soporte</Label>
            <Input
              id="support-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="soporte@empresa.com"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="website">Sitio web</Label>
            <Input
              id="website"
              value={web}
              onChange={(e) => setWeb(e.target.value)}
              placeholder="https://empresa.com"
            />
          </div>
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

