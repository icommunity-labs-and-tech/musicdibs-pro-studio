import { createFileRoute } from "@tanstack/react-router";

import { VerticalLanding } from "@/components/landing/vertical-landing";
import { VERTICALS } from "@/lib/vertical-content";

const data = VERTICALS.seguros;
const url = `https://enterprise.musicdibs.com${data.path}`;

export const Route = createFileRoute("/seguros")({
  component: () => <VerticalLanding data={data} />,
  head: () => ({
    meta: [
      { title: data.meta.title },
      { name: "description", content: data.meta.description },
      { property: "og:title", content: data.meta.title },
      { property: "og:description", content: data.meta.description },
      { property: "og:type", content: "website" },
      { property: "og:url", content: url },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/DakVJRWULrayRSjJYIgXi0jQKUG2/social-images/social-1780244388899-ff144e01-1c79-42c6-8c6c-977143655f7c.webp" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/DakVJRWULrayRSjJYIgXi0jQKUG2/social-images/social-1780244388899-ff144e01-1c79-42c6-8c6c-977143655f7c.webp" },
    ],
    links: [{ rel: "canonical", href: url }],
  }),
});
