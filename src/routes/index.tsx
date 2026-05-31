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

const SITE_URL = "https://musicdibs-enterprise.lovable.app";

export const Route = createFileRoute("/")({
  component: LandingPage,
  head: () => ({
    meta: [
      { title: "MusicDibs Enterprise — Comunicaciones que se escuchan, no que se ignoran" },
      {
        name: "description",
        content:
          "La plataforma que convierte tus comunicaciones digitales —email hoy, WhatsApp muy pronto— en experiencias sonoras personalizadas. Más atención, más recuerdo de marca, más conversión.",
      },
      {
        property: "og:title",
        content: "MusicDibs Enterprise — Comunicaciones que se escuchan, no que se ignoran",
      },
      {
        property: "og:description",
        content:
          "Convierte cada comunicación digital en una experiencia sonora memorable. Email hoy, WhatsApp muy pronto. Solicita una demo.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: SITE_URL },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: SITE_URL }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: "MusicDibs Enterprise",
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
        <IntegrationsStrip />
        <HowItWorks />
        <IndustryResults />
        <RoiCalculator onRequestDemo={scrollToDemo} />
        <PartnersSection onPartnerInquiry={() => setPartnerOpen(true)} />
        <PricingSection onRequestDemo={scrollToDemo} />
        <FaqSection />
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
