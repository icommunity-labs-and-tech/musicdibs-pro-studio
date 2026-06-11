// Provider Framework registry — central place to resolve connectors and the
// presentation metadata (label, logo) for each supported provider type.

import mailerliteLogo from "@/assets/logos/mailerlite.svg";
import brevoLogo from "@/assets/logos/brevo.svg";
import resendLogo from "@/assets/logos/resend.svg";
import whatsappLogo from "@/assets/logos/whatsapp.svg";

import { BrevoConnector } from "./BrevoConnector";
import { MailerLiteConnector } from "./MailerLiteConnector";
import { ResendConnector } from "./ResendConnector";
import type { ProviderConnector, ProviderType } from "./ProviderConnector";

export * from "./ProviderConnector";
export * from "./CampaignProvider";
export { MailerLiteConnector } from "./MailerLiteConnector";
export { BrevoConnector } from "./BrevoConnector";
export { ResendConnector } from "./ResendConnector";

export interface ProviderMeta {
  type: ProviderType;
  label: string;
  description: string;
  logo: string;
}

// Email providers shown in the Settings → Providers grid (mutually exclusive,
// "single active connector"). Twilio is intentionally NOT here — it renders as
// a separate additive card.
export const PROVIDERS: ProviderMeta[] = [
  {
    type: "mailerlite",
    label: "MailerLite",
    description:
      "Sincroniza listas, segmentos y automatizaciones desde MailerLite.",
    logo: mailerliteLogo,
  },
  {
    type: "brevo",
    label: "Brevo",
    description:
      "Sincroniza audiencias y recibe estadísticas vía webhooks. Las estadísticas en tiempo real requieren plan Enterprise.",
    logo: brevoLogo,
  },
  {
    type: "resend",
    label: "Resend",
    description: "Sincroniza tus audiencias de contactos desde Resend.",
    logo: resendLogo,
  },
];

// Twilio metadata — kept out of PROVIDERS but resolvable via getProviderMeta so
// any UI iterating over connections (audiences, campaign detail) gets a label.
const TWILIO_META: ProviderMeta = {
  type: "twilio",
  label: "Twilio",
  description:
    "Entrega la Experiencia Musical por WhatsApp o SMS vía Twilio. Las audiencias son tus listas locales con teléfono.",
  logo: whatsappLogo,
};

// WhatsApp Business (Cloud API de Meta) — canal aditivo, igual que Twilio.
const WHATSAPP_META: ProviderMeta = {
  type: "whatsapp",
  label: "WhatsApp Business",
  description:
    "Entrega la Experiencia Musical por WhatsApp con plantillas aprobadas vía la API de WhatsApp Business (Cloud) de Meta.",
  logo: whatsappLogo,
};

const ALL_PROVIDER_META: ProviderMeta[] = [...PROVIDERS, TWILIO_META, WHATSAPP_META];

export function getProviderMeta(type: ProviderType): ProviderMeta {
  const meta = ALL_PROVIDER_META.find((p) => p.type === type);
  if (!meta) throw new Error(`Proveedor no soportado: ${type}`);
  return meta;
}

/** Factory returning the connector implementation for a provider type. */
export function createConnector(type: ProviderType): ProviderConnector {
  switch (type) {
    case "mailerlite":
      return new MailerLiteConnector();
    case "brevo":
      return new BrevoConnector();
    case "resend":
      return new ResendConnector();
    case "twilio":
      // Twilio is a WhatsApp/SMS channel handled entirely server-side
      // (validation + sending via the edge function). No frontend connector.
      throw new Error("Twilio se gestiona en el servidor (sin conector de cliente)");
    case "whatsapp":
      // WhatsApp Business (Cloud API de Meta) también se gestiona en el
      // servidor (validación + envío con plantillas vía edge function).
      throw new Error("WhatsApp Business se gestiona en el servidor (sin conector de cliente)");
    default:
      throw new Error(`Proveedor no soportado: ${type satisfies never}`);
  }
}
