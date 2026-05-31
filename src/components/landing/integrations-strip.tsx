import mailerliteLogo from "@/assets/logos/mailerlite.svg";
import brevoLogo from "@/assets/logos/brevo.svg";
import hubspotLogo from "@/assets/logos/hubspot.svg";
import salesforceLogo from "@/assets/logos/salesforce.svg";
import whatsappLogo from "@/assets/logos/whatsapp.svg";
import zapierLogo from "@/assets/logos/zapier.svg";

const LOGOS = [
  { name: "MailerLite", src: mailerliteLogo },
  { name: "Brevo", src: brevoLogo },
  { name: "HubSpot", src: hubspotLogo },
  { name: "Salesforce", src: salesforceLogo },
  { name: "WhatsApp Business", src: whatsappLogo },
  { name: "Zapier", src: zapierLogo },
];

export function IntegrationsStrip() {
  return (
    <section className="border-y border-border bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <h2 className="text-center font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Tu ecosistema de comunicación, ahora memorable
        </h2>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-x-12 gap-y-8">
          {LOGOS.map((logo) => (
            <img
              key={logo.name}
              src={logo.src}
              alt={`Integración con ${logo.name}`}
              title={logo.name}
              loading="lazy"
              className="h-9 w-9 opacity-70 transition-all duration-300 hover:scale-105 hover:opacity-100"
            />
          ))}
        </div>
        <p className="mt-8 text-center text-sm text-muted-foreground">
          No sustituyes tu stack actual. Lo haces más memorable.
        </p>
      </div>
    </section>
  );
}
