import { createFileRoute } from "@tanstack/react-router";

import { CampaignBuilder } from "@/components/app/campaign-builder";
import { AI_MUSIC_STUDIO } from "@/lib/campaign-generation-options";

export const Route = createFileRoute("/_authenticated/_shell/campaigns/new")({
  head: () => ({ meta: [{ title: "Nueva campaña · Musicdibs Enterprise" }] }),
  component: CampaignBuilderPage,
});

function CampaignBuilderPage() {
  return (
    <CampaignBuilder
      mode="create"
      title="Nueva campaña"
      subtitle={`Configura tu campaña de música generada con IA. ${AI_MUSIC_STUDIO}.`}
    />
  );
}
