import { createFileRoute } from "@tanstack/react-router";

import { useAuth } from "@/components/auth/auth-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/_shell/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard · MusicDibs Enterprise" }] }),
  component: DashboardPage,
});

function DashboardPage() {
  const { profile, tenant } = useAuth();
  const firstName = profile?.full_name?.split(" ")[0];

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold sm:text-3xl">
          {firstName ? `Hola, ${firstName}` : "Bienvenido"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {tenant?.name
            ? `Panel de ${tenant.name}.`
            : "Tu panel de campañas."}{" "}
          Los KPIs y la actividad reciente llegan en la siguiente fase.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[
          { label: "Campañas activas", value: "—" },
          { label: "Emails enviados", value: "—" },
          { label: "Tasa de apertura", value: "—" },
        ].map((kpi) => (
          <Card key={kpi.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {kpi.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-display text-3xl font-bold">{kpi.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
