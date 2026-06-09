import { createFileRoute } from "@tanstack/react-router";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import {
  BarChart3,
  CheckCircle2,
  Download,
  MailOpen,
  MousePointerClick,
  Play,
  Send,
  UserMinus,
  Users2,
  type LucideIcon,
} from "lucide-react";

import { useAuth } from "@/components/auth/auth-provider";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useAnalytics, useGenerationMetrics } from "@/hooks/use-analytics";

export const Route = createFileRoute("/_authenticated/_shell/analytics")({
  head: () => ({ meta: [{ title: "Analytics · Musicdibs Enterprise" }] }),
  component: AnalyticsPage,
});

const barConfig: ChartConfig = {
  opened: { label: "Aperturas", color: "var(--primary)" },
  clicked: { label: "Clics", color: "var(--teal)" },
};

const funnelConfig: ChartConfig = {
  value: { label: "Emails" },
};

function AnalyticsPage() {
  const { tenant } = useAuth();
  const { data, isLoading, isError, refetch } = useAnalytics(tenant?.id);
  const { data: genMetrics, isLoading: genLoading } = useGenerationMetrics(tenant?.id);

  if (isError) {
    return (
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <h1 className="font-display text-2xl font-bold sm:text-3xl">Analytics</h1>
        <EmptyState
          icon={BarChart3}
          title="No pudimos cargar las métricas"
          action={
            <Button variant="outline" onClick={() => refetch()}>
              Reintentar
            </Button>
          }
        />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <h1 className="font-display text-2xl font-bold sm:text-3xl">Analytics</h1>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    );
  }

  const noData = !data || data.totalsSent === 0;

  const kpis: { label: string; value: string; hint?: string; icon: LucideIcon }[] =
    [
      {
        label: "Emails enviados",
        value: (data?.totalsSent ?? 0).toLocaleString("es-ES"),
        icon: Send,
      },
      {
        label: "Tasa de apertura",
        value: data?.openRate != null ? `${data.openRate.toFixed(1)}%` : "—",
        hint: `${(data?.totalsOpened ?? 0).toLocaleString("es-ES")} aperturas`,
        icon: MailOpen,
      },
      {
        label: "Tasa de clics",
        value: data?.clickRate != null ? `${data.clickRate.toFixed(1)}%` : "—",
        hint: `${(data?.totalsClicked ?? 0).toLocaleString("es-ES")} clics`,
        icon: MousePointerClick,
      },
      {
        label: "Bajas",
        value: (data?.totalsUnsubscribes ?? 0).toLocaleString("es-ES"),
        hint:
          data?.unsubscribeRate != null
            ? `${data.unsubscribeRate.toFixed(2)}% del total`
            : undefined,
        icon: UserMinus,
      },
    ];

  const funnelData = [
    { stage: "Enviados", value: data?.totalsSent ?? 0, fill: "var(--muted-foreground)" },
    { stage: "Abiertos", value: data?.totalsOpened ?? 0, fill: "var(--primary)" },
    { stage: "Clics", value: data?.totalsClicked ?? 0, fill: "var(--teal)" },
  ];

  const topCampaigns = (data?.perCampaign ?? []).slice(0, 8).map((c) => ({
    name: c.name.length > 18 ? `${c.name.slice(0, 17)}…` : c.name,
    opened: c.opened,
    clicked: c.clicked,
  }));

  const engagement: {
    label: string;
    value: string;
    hint?: string;
    icon: LucideIcon;
  }[] = [
    {
      label: "Reproducciones",
      value: (genMetrics?.totalPlays ?? 0).toLocaleString("es-ES"),
      icon: Play,
    },
    {
      label: "Oyentes únicos",
      value: (genMetrics?.uniqueVisitors ?? 0).toLocaleString("es-ES"),
      icon: Users2,
    },
    {
      label: "Escuchas completas",
      value: (genMetrics?.completionCount ?? 0).toLocaleString("es-ES"),
      icon: CheckCircle2,
    },
    {
      label: "Descargas",
      value: (genMetrics?.downloadCount ?? 0).toLocaleString("es-ES"),
      icon: Download,
    },
  ];

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold sm:text-3xl">Analytics</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Rendimiento de tus campañas y de la audiencia
        </p>
      </div>

      {/* Campaign performance section */}
      <div className="space-y-4">
        <h2 className="font-display text-lg font-semibold">Campañas</h2>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {kpis.map((k) => (
            <Card key={k.label}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-muted-foreground">
                    {k.label}
                  </p>
                  <k.icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="mt-2 font-display text-2xl font-bold">{k.value}</p>
                {k.hint ? (
                  <p className="mt-0.5 text-xs text-muted-foreground">{k.hint}</p>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>

        {noData ? (
          <EmptyState
            icon={BarChart3}
            title="Sin datos de envío todavía"
            description="Cuando envíes campañas verás aquí las métricas de rendimiento."
          />
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
            <Card className="min-w-0">
              <CardHeader>
                <CardTitle className="font-display text-lg">
                  Rendimiento por campaña
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={barConfig} className="h-80 w-full">
                  <BarChart data={topCampaigns} margin={{ left: -16 }}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis
                      dataKey="name"
                      tickLine={false}
                      axisLine={false}
                      interval={0}
                      angle={-30}
                      textAnchor="end"
                      height={70}
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="opened" fill="var(--color-opened)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="clicked" fill="var(--color-clicked)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="font-display text-lg">
                  Embudo de conversión
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={funnelConfig} className="mx-auto h-56 w-full">
                  <PieChart>
                    <ChartTooltip content={<ChartTooltipContent nameKey="stage" />} />
                    <Pie
                      data={funnelData}
                      dataKey="value"
                      nameKey="stage"
                      innerRadius={50}
                      outerRadius={80}
                    >
                      {funnelData.map((d) => (
                        <Cell key={d.stage} fill={d.fill} />
                      ))}
                    </Pie>
                  </PieChart>
                </ChartContainer>
                <ul className="mt-2 space-y-1.5 text-sm">
                  {funnelData.map((d) => (
                    <li key={d.stage} className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ background: d.fill }}
                        />
                        {d.stage}
                      </span>
                      <span className="font-medium tabular-nums">
                        {d.value.toLocaleString("es-ES")}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      <Separator />

      {/* Audience engagement section */}
      <div className="space-y-4">
        <div>
          <h2 className="font-display text-lg font-semibold">Engagement de la audiencia</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Cómo interactúan tus contactos con la música de tus campañas
          </p>
        </div>
        {genLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {engagement.map((k) => (
              <Card key={k.label}>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-muted-foreground">
                      {k.label}
                    </p>
                    <k.icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="mt-2 font-display text-2xl font-bold">{k.value}</p>
                  {k.hint ? (
                    <p className="mt-0.5 text-xs text-muted-foreground">{k.hint}</p>
                  ) : null}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
