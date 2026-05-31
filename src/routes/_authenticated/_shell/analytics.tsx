import { createFileRoute } from "@tanstack/react-router";
import { BarChart3 } from "lucide-react";

import { EmptyState } from "@/components/empty-state";

export const Route = createFileRoute("/_authenticated/_shell/analytics")({
  head: () => ({ meta: [{ title: "Analytics · MusicDibs Enterprise" }] }),
  component: AnalyticsPage,
});

function AnalyticsPage() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <h1 className="font-display text-2xl font-bold sm:text-3xl">Analytics</h1>
      <EmptyState
        icon={BarChart3}
        title="Sin datos todavía"
        description="Los gráficos de rendimiento se añaden en la Fase 3."
      />
    </div>
  );
}
