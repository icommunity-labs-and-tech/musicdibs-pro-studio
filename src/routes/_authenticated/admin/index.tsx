import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, Building2, ChevronRight, Settings2, TrendingDown } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useAdminTenants,
  useAdminChurnSignals,
  usePlatformSettings,
  useUpdatePlatformSetting,
  type AdminTenant,
  type ChurnSignal,
} from "@/hooks/use-admin";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({ meta: [{ title: "Admin · Musicdibs Enterprise" }] }),
  component: AdminPage,
});

// ── Plan badge ────────────────────────────────────────────────────────────────

function PlanBadge({ plan }: { plan: string }) {
  const cls: Record<string, string> = {
    enterprise:   "bg-gold/20 text-gold-dark dark:text-gold border-gold/30",
    professional: "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 border-blue-200",
    starter:      "bg-muted text-muted-foreground border-border",
  };
  return (
    <Badge variant="outline" className={`capitalize ${cls[plan] ?? cls.starter}`}>
      {plan}
    </Badge>
  );
}

function ChurnBadge({ risk }: { risk: string }) {
  if (risk === "high") return <Badge variant="destructive" className="text-xs">Alto riesgo</Badge>;
  if (risk === "medium") return <Badge variant="outline" className="text-xs border-orange-300 text-orange-600">Riesgo medio</Badge>;
  return <Badge variant="outline" className="text-xs text-green-600 border-green-300">Bajo riesgo</Badge>;
}

// ── Tenants table ─────────────────────────────────────────────────────────────

function TenantsTab() {
  const { data: tenants = [], isLoading } = useAdminTenants();
  const { data: churn = [] } = useAdminChurnSignals();
  const [search, setSearch] = useState("");

  const churnMap = new Map(churn.map(c => [c.tenant_id, c]));

  const filtered = tenants.filter(t =>
    !search || t.tenant_name?.toLowerCase().includes(search.toLowerCase()) || t.slug?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Input
          placeholder="Buscar tenant…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <span className="text-sm text-muted-foreground">{filtered.length} tenants</span>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-0 divide-y">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-5 py-3.5">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-5 w-20 rounded-full ml-auto" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
              <Building2 className="h-8 w-8 opacity-40" />
              <p className="text-sm">Sin tenants</p>
            </div>
          ) : (
            <ul className="divide-y">
              {filtered.map(t => {
                const churnSignal = churnMap.get(t.tenant_id);
                return (
                  <li key={t.tenant_id}>
                    <Link
                      to="/admin/tenants/$id"
                      params={{ id: t.tenant_id }}
                      className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/50 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-sm">{t.tenant_name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {t.slug} · {t.user_count} usuario{t.user_count !== 1 ? "s" : ""} · {t.campaigns_this_month} camp. este mes
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <PlanBadge plan={t.plan} />
                        {churnSignal && <ChurnBadge risk={churnSignal.churn_risk} />}
                        {t.failed_jobs_this_month > 0 && (
                          <Badge variant="destructive" className="text-xs gap-1">
                            <AlertTriangle className="h-3 w-3" />{t.failed_jobs_this_month} errores
                          </Badge>
                        )}
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Churn summary ─────────────────────────────────────────────────────────────

function ChurnSummary() {
  const { data: churn = [], isLoading } = useAdminChurnSignals();
  const high   = churn.filter(c => c.churn_risk === "high");
  const medium = churn.filter(c => c.churn_risk === "medium");

  if (isLoading) return <Skeleton className="h-24 w-full" />;
  if (high.length === 0 && medium.length === 0) return null;

  return (
    <Card className="border-orange-200 dark:border-orange-900/50">
      <CardHeader className="pb-2 flex flex-row items-center gap-2">
        <TrendingDown className="h-4 w-4 text-orange-500" />
        <CardTitle className="text-base">Alertas de churn</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1.5">
        {high.map(c => (
          <div key={c.tenant_id} className="flex items-center justify-between text-sm">
            <Link to="/admin/tenants/$id" params={{ id: c.tenant_id }} className="text-destructive font-medium hover:underline">
              {c.tenant_name}
            </Link>
            <span className="text-xs text-muted-foreground">
              {c.campaigns_last_30d} campañas (vs {c.campaigns_prev_30d} mes ant.)
              {c.billing_issue ? " · ⚠️ problema de pago" : ""}
            </span>
          </div>
        ))}
        {medium.map(c => (
          <div key={c.tenant_id} className="flex items-center justify-between text-sm">
            <Link to="/admin/tenants/$id" params={{ id: c.tenant_id }} className="text-orange-600 hover:underline">
              {c.tenant_name}
            </Link>
            <span className="text-xs text-muted-foreground">
              {c.campaigns_last_30d} campañas este mes
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// ── Platform config ───────────────────────────────────────────────────────────

function ConfigTab() {
  const { data: settings = [], isLoading } = usePlatformSettings();
  const update = useUpdatePlatformSetting();
  const [editing, setEditing] = useState<Record<string, string>>({});

  function handleChange(key: string, val: string) {
    setEditing(prev => ({ ...prev, [key]: val }));
  }

  function handleSave(key: string) {
    const val = editing[key];
    if (val === undefined) return;
    update.mutate({ key, value: val }, {
      onSuccess: () => setEditing(prev => { const n = { ...prev }; delete n[key]; return n; }),
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Settings2 className="h-4 w-4" /> Configuración de plataforma
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)
        ) : settings.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Sin configuraciones</p>
        ) : (
          settings.map(s => (
            <div key={s.key} className="grid grid-cols-[1fr_1.5fr_auto] items-center gap-3">
              <div>
                <p className="text-sm font-mono font-medium">{s.key}</p>
                {s.description && <p className="text-xs text-muted-foreground">{s.description}</p>}
              </div>
              <Input
                value={editing[s.key] ?? s.value ?? ""}
                onChange={e => handleChange(s.key, e.target.value)}
                className="h-8 text-sm font-mono"
              />
              <Button
                size="sm"
                variant="outline"
                disabled={editing[s.key] === undefined || update.isPending}
                onClick={() => handleSave(s.key)}
              >
                Guardar
              </Button>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

// ── KPI strip ─────────────────────────────────────────────────────────────────

function KpiStrip({ tenants }: { tenants: AdminTenant[] }) {
  const plans = tenants.reduce((acc, t) => { acc[t.plan] = (acc[t.plan] ?? 0) + 1; return acc; }, {} as Record<string, number>);
  const totalSent = tenants.reduce((s, t) => s + (t.emails_sent_this_month ?? 0), 0);
  const activeThisMonth = tenants.filter(t => t.campaigns_this_month > 0).length;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {[
        { label: "Tenants totales", value: String(tenants.length) },
        { label: "Activos este mes", value: String(activeThisMonth) },
        { label: "Emails enviados (mes)", value: totalSent.toLocaleString("es-ES") },
        { label: "Enterprise", value: String(plans.enterprise ?? 0) },
      ].map(kpi => (
        <Card key={kpi.label}>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">{kpi.label}</p>
            <p className="font-display text-2xl font-bold mt-1">{kpi.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

function AdminPage() {
  const { data: tenants = [], isLoading } = useAdminTenants();

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold sm:text-3xl">Panel de administración</h1>
        <p className="mt-1 text-sm text-muted-foreground">Vista interna — solo superadmins</p>
      </div>

      {!isLoading && <KpiStrip tenants={tenants} />}
      <ChurnSummary />

      <Tabs defaultValue="tenants">
        <TabsList>
          <TabsTrigger value="tenants">Tenants</TabsTrigger>
          <TabsTrigger value="config">Configuración</TabsTrigger>
        </TabsList>
        <TabsContent value="tenants" className="mt-4"><TenantsTab /></TabsContent>
        <TabsContent value="config" className="mt-4"><ConfigTab /></TabsContent>
      </Tabs>
    </div>
  );
}
