import { createFileRoute } from "@tanstack/react-router";

import { VerticalLanding } from "@/components/landing/vertical-landing";
import { VERTICALS } from "@/lib/vertical-content";

const data = VERTICALS.banca;
const url = `https://musicdibs-enterprise.lovable.app${data.path}`;

export const Route = createFileRoute("/banca")({
  component: () => <VerticalLanding data={data} />,
  head: () => ({
    meta: [
      { title: data.meta.title },
      { name: "description", content: data.meta.description },
      { property: "og:title", content: data.meta.title },
      { property: "og:description", content: data.meta.description },
      { property: "og:type", content: "website" },
      { property: "og:url", content: url },
    ],
    links: [{ rel: "canonical", href: url }],
  }),
});
