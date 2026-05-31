import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Megaphone,
  Users,
  Send,
  MailOpen,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";

import { useAuth } from "@/components/auth/auth-provider";
import { CampaignStatusBadge } from "@/components/app/campaign-status-badge";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboard, type RecentCampaign } from "@/hooks/use-dashboard";

export const Route = createFileRoute("/_authenticated/_shell/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard · MusicDibs Enterprise" }] }),
  component: DashboardPage,
});

function formatRelative(iso: string): string {
  const date = new Date(iso);
  const diffMs = date.getTime() - Date.now();
  const diffDays = Math.round(diffMs / 86_400_000);
  const rtf = new Intl.RelativeTimeFormat("es-ES", { numeric: "auto" });
  if (Math.abs(diffDays) >= 1) return rtf.format(diffDays, "day");
  const diffHours = Math.round(diffMs / 3_600_000);
  if (Math.abs(diffHours) >= 1) return rtf.format(diffHours, "hour");
  const diffMin = Math.round(diffMs / 60_000);
  return rtf.format(diffMin, "minute");
}

function DashboardPage() {
  const { profile, tenant } = useAuth();
  const firstName = profile?.full_name?.split(" ")[0];
  const { data, isLoading, isError, refetch } = useDashboard(tenant?.id);

  const kpis: { label: string; value: string; hint?: string; icon: LucideIcon }[] =
    [
      {
        label: "Campañas activas",
        value: data ? String(data.activeCampaigns) : "—",
        hint: data ? `${data.totalCampaigns} en total` : undefined,
        icon: Megaphone,
      },
      {
        label: "Contactos",
        value: data ? data.contactsCount.toLocaleString("es-ES") : "—",
        icon: Users,
      },
      {
        label: "Emails enviados",
        value: data ? data.emailsSent.toLocaleString("es-ES") : "—",
        icon: Send,
      },
      {
        label: "Tasa de apertura",
        value:
          data && data.openRate !== null
            ? `${data.openRate.toFixed(1)}%`
            : "—",
        hint:
          data && data.openRate !== null
            ? `${data.emailsOpened.toLocaleString("es-ES")} aperturas`
            : "Sin envíos todavía",
        icon: MailOpen,
      },
    ];

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold sm:text-3xl">
          {firstName ? `Hola, ${firstName}` : "Bienvenido"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {tenant?.name ? `Panel de ${tenant.name}.` : "Tu panel de campañas."}{" "}
          Un vistazo rápido a tu actividad.
        </p>
      </div>

      {isError ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <p className="text-sm text-muted-foreground">
              No pudimos cargar los datos del panel.
            </p>
            <Button variant="outline" onClick={() => void refetch()}>
              Reintentar
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {kpis.map((kpi) => (
              <Card key={kpi.label}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {kpi.label}
                  </CardTitle>
                  <kpi.icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <Skeleton className="h-9 w-20" />
                  ) : (
                    <p className="font-display text-3xl font-bold">{kpi.value}</p>
                  )}
                  {kpi.hint && !isLoading ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {kpi.hint}
                    </p>
                  ) : null}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Actividad reciente */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="font-display text-lg">
                Actividad reciente
              </CardTitle>
              {data && data.recentCampaigns.length > 0 ? (
                <Button asChild variant="ghost" size="sm">
                  <Link to="/campaigns">
                    Ver todas
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              ) : null}
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <RecentSkeleton />
              ) : data && data.recentCampaigns.length > 0 ? (
                <ul className="divide-y">
                  {data.recentCampaigns.map((c) => (
                    <RecentRow key={c.id} campaign={c} />
                  ))}
                </ul>
              ) : (
                <EmptyState
                  icon={Megaphone}
                  title="Aún no hay campañas"
                  description="Crea tu primera campaña para empezar a generar canciones y enviarlas a tus contactos."
                  action={
                    <Button asChild>
                      <Link to="/campaigns">Crear campaña</Link>
                    </Button>
                  }
                  className="border-0 bg-transparent py-10"
                />
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function RecentRow({ campaign }: { campaign: RecentCampaign }) {
  const when = campaign.sent_at ?? campaign.created_at;
  return (
    <li className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{campaign.name}</p>
        <p className="text-xs text-muted-foreground">
          {campaign.total_contacts.toLocaleString("es-ES")} contactos ·{" "}
          {formatRelative(when)}
        </p>
      </div>
      <CampaignStatusBadge status={campaign.status} />
    </li>
  );
}

function RecentSkeleton() {
  return (
    <ul className="divide-y">
      {Array.from({ length: 3 }).map((_, i) => (
        <li key={i} className="flex items-center gap-3 py-3 first:pt-0">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-28" />
          </div>
          <Skeleton className="h-6 w-16 rounded-full" />
        </li>
      ))}
    </ul>
  );
}
