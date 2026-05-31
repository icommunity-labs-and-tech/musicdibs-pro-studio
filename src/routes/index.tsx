import { useCallback, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";

import { AudioDemoModal } from "@/components/landing/audio-demo-modal";
import { ClientExperience } from "@/components/landing/client-experience";
import { DemoCta } from "@/components/landing/demo-cta";
import { FaqSection } from "@/components/landing/faq-section";
import { HeroSection } from "@/components/landing/hero-section";
import { HowItWorks } from "@/components/landing/how-it-works";
import { IndustryResults } from "@/components/landing/industry-results";
import { IntegrationsStrip } from "@/components/landing/integrations-strip";
import { LandingFooter } from "@/components/landing/landing-footer";
import { LandingNav } from "@/components/landing/landing-nav";
import { PartnerDialog } from "@/components/landing/partner-dialog";
import { PartnersSection } from "@/components/landing/partners-section";
import { PricingSection } from "@/components/landing/pricing-section";
import { ProductVision } from "@/components/landing/product-vision";
import { RoiCalculator } from "@/components/landing/roi-calculator";
import { WhyItWorks } from "@/components/landing/why-it-works";
import { FAQ_ITEMS } from "@/lib/landing-content";

const SITE_URL = "https://enterprise.musicdibs.com";
const SOCIAL_IMAGE =
  "https://storage.googleapis.com/gpt-engineer-file-uploads/DakVJRWULrayRSjJYIgXi0jQKUG2/social-images/social-1780244388899-ff144e01-1c79-42c6-8c6c-977143655f7c.webp";

export const Route = createFileRoute("/")({
  component: LandingPage,
  head: () => ({
    meta: [
      { title: "Musicdibs Enterprise — Convierte tu marketing en experiencias sonoras" },
      {
        name: "description",
        content:
          "Convierte tus comunicaciones digitales —email hoy, WhatsApp pronto— en experiencias sonoras con IA. Más atención, más recuerdo de marca, más conversión.",
      },
      {
        property: "og:title",
        content: "Marketing que se escucha: campañas sonoras con IA para tu marca",
      },
      {
        property: "og:description",
        content:
          "Convierte cada comunicación digital en una experiencia sonora memorable. Email hoy, WhatsApp muy pronto. Solicita una demo.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: SITE_URL },
      { property: "og:image", content: SOCIAL_IMAGE },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: SOCIAL_IMAGE },
    ],
    links: [{ rel: "canonical", href: SITE_URL }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: "Musicdibs Enterprise",
          applicationCategory: "BusinessApplication",
          description:
            "Plataforma B2B de marketing experiencial que convierte comunicaciones digitales (email y, próximamente, WhatsApp) en experiencias sonoras personalizadas.",
          offers: {
            "@type": "Offer",
            price: "399",
            priceCurrency: "EUR",
          },
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: FAQ_ITEMS.map((item) => ({
            "@type": "Question",
            name: item.q,
            acceptedAnswer: { "@type": "Answer", text: item.a },
          })),
        }),
      },
    ],
  }),
});

function LandingPage() {
  const [audioOpen, setAudioOpen] = useState(false);
  const [partnerOpen, setPartnerOpen] = useState(false);

  const scrollToDemo = useCallback(() => {
    document.getElementById("solicitar-demo")?.scrollIntoView({ behavior: "smooth" });
  }, []);

  return (
    <div className="min-h-dvh bg-background">
      <LandingNav onListen={() => setAudioOpen(true)} onRequestDemo={scrollToDemo} />

      <main>
        <HeroSection onListen={() => setAudioOpen(true)} onRequestDemo={scrollToDemo} />
        <ClientExperience />
        <IntegrationsStrip />
        <HowItWorks />
        <WhyItWorks />
        <IndustryResults />
        <RoiCalculator onRequestDemo={scrollToDemo} />
        <PartnersSection onPartnerInquiry={() => setPartnerOpen(true)} />
        <PricingSection onRequestDemo={scrollToDemo} />
        <FaqSection />
        <ProductVision />
        <DemoCta />
      </main>

      <LandingFooter />

      <AudioDemoModal
        open={audioOpen}
        onOpenChange={setAudioOpen}
        onRequestDemo={scrollToDemo}
      />
      <PartnerDialog open={partnerOpen} onOpenChange={setPartnerOpen} />
    </div>
  );
}
