import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle, ArrowLeft, BookOpen, ExternalLink,
  Loader2, MailOpen, Megaphone, Pin, PinOff, Trash2, Users,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CampaignStatusBadge } from "@/components/app/campaign-status-badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  useAdminTenantDetail,
  useAdminTenantCampaigns,
  useAdminTenantTeam,
  useTenantNotes,
  useAddTenantNote,
  useToggleNotePin,
  useDeleteTenantNote,
  useImpersonateTenant,
  useAdminChangePlan,
} from "@/hooks/use-admin";

export const Route = createFileRoute("/_authenticated/_admin/tenants/$id")({
  head: () => ({ meta: [{ title: "Tenant · Admin · Musicdibs Enterprise" }] }),
  component: TenantDetailPage,
});

// ── Plan badge ────────────────────────────────────────────────────────────────

const PLANS = ["starter", "professional", "enterprise"] as const;

function PlanSelect({ tenantId, current }: { tenantId: string; current: string }) {
  const changePlan = useAdminChangePlan();
  return (
    <Select
      value={current}
      onValueChange={plan => changePlan.mutate({ tenantId, plan })}
      disabled={changePlan.isPending}
    >
      <SelectTrigger className="h-8 w-36 text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {PLANS.map(p => (
          <SelectItem key={p} value={p} className="capitalize text-xs">{p}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// ── Campaigns tab ─────────────────────────────────────────────────────────────

function CampaignsTab({ tenantId }: { tenantId: string }) {
  const { data: campaigns = [], isLoading } = useAdminTenantCampaigns(tenantId);

  if (isLoading) return <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>;
  if (!campaigns.length) return <p className="py-8 text-center text-sm text-muted-foreground">Sin campañas todavía</p>;

  return (
    <Card>
      <CardContent className="p-0">
        <ul className="divide-y">
          {campaigns.map(c => (
            <li key={c.id} className="flex items-center gap-3 px-5 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{c.name}</p>
                <p className="text-xs text-muted-foreground">
                  {c.total_contacts.toLocaleString("es-ES")} contactos ·{" "}
                  {formatDistanceToNow(new Date(c.created_at), { addSuffix: true, locale: es })}
                </p>
              </div>
              <CampaignStatusBadge status={c.status} />
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

// ── Team tab ──────────────────────────────────────────────────────────────────

function TeamTab({ tenantId }: { tenantId: string }) {
  const { data: team = [], isLoading } = useAdminTenantTeam(tenantId);

  if (isLoading) return <Skeleton className="h-32 w-full" />;
  if (!team.length) return <p className="py-8 text-center text-sm text-muted-foreground">Sin miembros</p>;

  return (
    <Card>
      <CardContent className="p-0">
        <ul className="divide-y">
          {team.map(m => (
            <li key={m.id} className="flex items-center justify-between px-5 py-3">
              <p className="text-sm font-medium">{m.full_name ?? "—"}</p>
              <Badge variant="outline" className="capitalize text-xs">{m.role}</Badge>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

// ── Notes tab ─────────────────────────────────────────────────────────────────

function NotesTab({ tenantId }: { tenantId: string }) {
  const { data: notes = [], isLoading } = useTenantNotes(tenantId);
  const addNote = useAddTenantNote(tenantId);
  const togglePin = useToggleNotePin(tenantId);
  const deleteNote = useDeleteTenantNote(tenantId);
  const [body, setBody] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    addNote.mutate({ body }, { onSuccess: () => setBody("") });
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-2">
        <Textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          placeholder="Añadir nota interna…"
          rows={3}
          className="resize-none text-sm"
        />
        <Button type="submit" size="sm" disabled={!body.trim() || addNote.isPending}>
          {addNote.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Añadir nota"}
        </Button>
      </form>

      {isLoading ? (
        Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)
      ) : notes.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">Sin notas todavía</p>
      ) : (
        <div className="space-y-2">
          {notes.map(note => (
            <Card key={note.id} className={note.pinned ? "border-gold/40 bg-gold/5" : ""}>
              <CardContent className="pt-3 pb-3 px-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm leading-relaxed flex-1">{note.body}</p>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button
                      variant="ghost" size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-foreground"
                      title={note.pinned ? "Desfijar" : "Fijar"}
                      onClick={() => togglePin.mutate({ id: note.id, pinned: !note.pinned })}
                    >
                      {note.pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
                    </Button>
                    <Button
                      variant="ghost" size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      title="Eliminar"
                      onClick={() => deleteNote.mutate(note.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  {note.author_email} · {formatDistanceToNow(new Date(note.created_at), { addSuffix: true, locale: es })}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

function TenantDetailPage() {
  const { id } = Route.useParams();
  const { data, isLoading, isError } = useAdminTenantDetail(id);
  const impersonate = useImpersonateTenant();

  if (isLoading) return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <Skeleton className="h-8 w-64" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
    </div>
  );

  if (isError || !data) return (
    <div className="mx-auto w-full max-w-4xl py-12 text-center">
      <p className="text-muted-foreground">No se encontró el tenant.</p>
      <Link to="/admin" className="mt-4 inline-block text-sm text-primary hover:underline">← Volver al admin</Link>
    </div>
  );

  const { tenant, usage, churn } = data;

  const kpis = [
    { label: "Campañas este mes", value: String(usage?.campaigns_this_month ?? 0), icon: Megaphone },
    { label: "Emails enviados", value: (usage?.emails_sent_this_month ?? 0).toLocaleString("es-ES"), icon: MailOpen },
    { label: "Contactos nuevos", value: (usage?.contacts_this_month ?? 0).toLocaleString("es-ES"), icon: Users },
    { label: "Jobs fallidos", value: String(usage?.failed_jobs_this_month ?? 0), icon: AlertTriangle },
  ];

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link to="/admin" className="mb-2 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3 w-3" /> Admin
          </Link>
          <h1 className="font-display text-2xl font-bold">{tenant.name}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {tenant.slug} · Creado {formatDistanceToNow(new Date(tenant.created_at), { addSuffix: true, locale: es })}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {churn && churn.churn_risk !== "low" && (
            <Badge variant={churn.churn_risk === "high" ? "destructive" : "outline"} className="gap-1">
              <AlertTriangle className="h-3 w-3" />
              Churn {churn.churn_risk === "high" ? "alto" : "medio"}
            </Badge>
          )}
          <PlanSelect tenantId={id} current={tenant.plan} />
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            disabled={impersonate.isPending}
            onClick={() => impersonate.mutate(id)}
          >
            {impersonate.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
            Impersonar
          </Button>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {kpis.map(kpi => (
          <Card key={kpi.label}>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">{kpi.label}</p>
                <kpi.icon className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <p className="font-display text-2xl font-bold mt-1">{kpi.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="campaigns">
        <TabsList>
          <TabsTrigger value="campaigns" className="gap-1.5"><Megaphone className="h-3.5 w-3.5" />Campañas</TabsTrigger>
          <TabsTrigger value="team" className="gap-1.5"><Users className="h-3.5 w-3.5" />Equipo</TabsTrigger>
          <TabsTrigger value="notes" className="gap-1.5"><BookOpen className="h-3.5 w-3.5" />Notas</TabsTrigger>
        </TabsList>
        <TabsContent value="campaigns" className="mt-4"><CampaignsTab tenantId={id} /></TabsContent>
        <TabsContent value="team" className="mt-4"><TeamTab tenantId={id} /></TabsContent>
        <TabsContent value="notes" className="mt-4"><NotesTab tenantId={id} /></TabsContent>
      </Tabs>
    </div>
  );
}
