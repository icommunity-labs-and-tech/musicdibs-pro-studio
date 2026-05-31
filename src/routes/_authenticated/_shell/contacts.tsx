import { createFileRoute } from "@tanstack/react-router";
import { Users } from "lucide-react";

import { EmptyState } from "@/components/empty-state";

export const Route = createFileRoute("/_authenticated/_shell/contacts")({
  head: () => ({ meta: [{ title: "Contactos · MusicDibs Enterprise" }] }),
  component: ContactsPage,
});

function ContactsPage() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <h1 className="font-display text-2xl font-bold sm:text-3xl">Contactos</h1>
      <EmptyState
        icon={Users}
        title="Sin listas de contactos"
        description="La importación CSV y la gestión de listas llegan en la Fase 3."
      />
    </div>
  );
}
