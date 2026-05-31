import { createFileRoute } from "@tanstack/react-router";
import { Megaphone } from "lucide-react";

import { EmptyState } from "@/components/empty-state";

export const Route = createFileRoute("/_authenticated/_shell/campaigns")({
  head: () => ({ meta: [{ title: "Campañas · MusicDibs Enterprise" }] }),
  component: CampaignsPage,
});

function CampaignsPage() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <h1 className="font-display text-2xl font-bold sm:text-3xl">Campañas</h1>
      <EmptyState
        icon={Megaphone}
        title="Aún no hay campañas"
        description="El listado con filtros y estados se construye en la Fase 2."
      />
    </div>
  );
}
