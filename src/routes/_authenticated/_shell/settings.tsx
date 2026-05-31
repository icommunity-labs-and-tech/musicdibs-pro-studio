import { createFileRoute } from "@tanstack/react-router";
import { Settings } from "lucide-react";

import { EmptyState } from "@/components/empty-state";

export const Route = createFileRoute("/_authenticated/_shell/settings")({
  head: () => ({ meta: [{ title: "Ajustes · MusicDibs Enterprise" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <h1 className="font-display text-2xl font-bold sm:text-3xl">Ajustes</h1>
      <EmptyState
        icon={Settings}
        title="Configuración del espacio"
        description="API keys, equipo y facturación se construyen en la Fase 3."
      />
    </div>
  );
}
