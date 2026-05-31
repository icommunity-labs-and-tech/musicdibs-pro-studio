import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight, Megaphone, Plus, Search, X } from "lucide-react";

import { useAuth } from "@/components/auth/auth-provider";
import { CampaignStatusBadge } from "@/components/app/campaign-status-badge";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CAMPAIGN_STATUS_META,
  type CampaignStatus,
} from "@/lib/campaign-status";
import { useCampaigns, type CampaignListItem } from "@/hooks/use-campaigns";

export const Route = createFileRoute("/_authenticated/_shell/campaigns/")({
  head: () => ({ meta: [{ title: "Campañas · MusicDibs Enterprise" }] }),
  component: CampaignsPage,
});

const STATUS_ORDER: CampaignStatus[] = [
  "draft",
  "queued",
  "generating",
  "ready",
  "sent",
  "archived",
];

type SortKey = "recent" | "name" | "contacts";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function CampaignsPage() {
  const { tenant } = useAuth();
  const { data, isLoading, isError, refetch } = useCampaigns(tenant?.id);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<CampaignStatus | "all">("all");
  const [sort, setSort] = useState<SortKey>("recent");

  const filtered = useMemo(() => {
    if (!data) return [];
    const term = search.trim().toLowerCase();
    const rows = data.filter((c) => {
      const matchesStatus = status === "all" || c.status === status;
      const matchesTerm =
        !term ||
        c.name.toLowerCase().includes(term) ||
        c.vertical?.toLowerCase().includes(term) ||
        c.type?.toLowerCase().includes(term);
      return matchesStatus && matchesTerm;
    });
    const sorted = [...rows];
    if (sort === "name") {
      sorted.sort((a, b) => a.name.localeCompare(b.name, "es"));
    } else if (sort === "contacts") {
      sorted.sort((a, b) => b.total_contacts - a.total_contacts);
    } else {
      sorted.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
    }
    return sorted;
  }, [data, search, status, sort]);

  const hasCampaigns = (data?.length ?? 0) > 0;
  const isFiltering = search.trim() !== "" || status !== "all";

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold sm:text-3xl">
            Campañas
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gestiona y haz seguimiento de tus campañas musicales.
          </p>
        </div>
        <Button asChild className="sm:shrink-0">
          <Link to="/campaigns/new">
            <Plus className="mr-1 h-4 w-4" />
            Nueva campaña
          </Link>
        </Button>
      </div>

      {isError ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <p className="text-sm text-muted-foreground">
              No pudimos cargar las campañas.
            </p>
            <Button variant="outline" onClick={() => void refetch()}>
              Reintentar
            </Button>
          </CardContent>
        </Card>
      ) : isLoading ? (
        <ListSkeleton />
      ) : !hasCampaigns ? (
        <EmptyState
          icon={Megaphone}
          title="Aún no hay campañas"
          description="Crea tu primera campaña para empezar a generar canciones y enviarlas a tus contactos."
          action={
            <Button asChild>
              <Link to="/campaigns/new">
                <Plus className="mr-1 h-4 w-4" />
                Nueva campaña
              </Link>
            </Button>
          }
        />
      ) : (
        <>
          {/* Filtros */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nombre, vertical o tipo…"
                className="pl-9"
                aria-label="Buscar campañas"
              />
            </div>
            <Select
              value={status}
              onValueChange={(v) => setStatus(v as CampaignStatus | "all")}
            >
              <SelectTrigger className="sm:w-44" aria-label="Filtrar por estado">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                {STATUS_ORDER.map((s) => (
                  <SelectItem key={s} value={s}>
                    {CAMPAIGN_STATUS_META[s].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
              <SelectTrigger className="sm:w-44" aria-label="Ordenar">
                <SelectValue placeholder="Ordenar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Más recientes</SelectItem>
                <SelectItem value="name">Nombre (A-Z)</SelectItem>
                <SelectItem value="contacts">Más contactos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Resultados */}
          {filtered.length === 0 ? (
            <EmptyState
              icon={Search}
              title="Sin resultados"
              description="No hay campañas que coincidan con los filtros aplicados."
              action={
                isFiltering ? (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearch("");
                      setStatus("all");
                    }}
                  >
                    <X className="mr-1 h-4 w-4" />
                    Limpiar filtros
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <ul className="space-y-3">
              {filtered.map((c) => (
                <CampaignRow key={c.id} campaign={c} />
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

function CampaignRow({ campaign }: { campaign: CampaignListItem }) {
  return (
    <li>
      <Link
        to="/campaigns/$id"
        params={{ id: campaign.id }}
        className="block focus-visible:outline-none"
      >
        <Card className="transition-colors hover:bg-muted/40">
          <CardContent className="flex items-center gap-3 py-4">
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{campaign.name}</p>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {campaign.vertical} ·{" "}
                {campaign.total_contacts.toLocaleString("es-ES")} contactos ·{" "}
                {formatDate(campaign.created_at)}
              </p>
            </div>
            <CampaignStatusBadge status={campaign.status} />
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          </CardContent>
        </Card>
      </Link>
    </li>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row">
        <Skeleton className="h-9 flex-1" />
        <Skeleton className="h-9 sm:w-44" />
        <Skeleton className="h-9 sm:w-44" />
      </div>
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-[72px] w-full rounded-2xl" />
      ))}
    </div>
  );
}
