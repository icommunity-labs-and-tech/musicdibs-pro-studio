// Provider Framework registry — central place to resolve connectors and the
// presentation metadata (label, logo) for each supported provider type.

import mailerliteLogo from "@/assets/logos/mailerlite.svg";
import brevoLogo from "@/assets/logos/brevo.svg";

import { BrevoConnector } from "./BrevoConnector";
import { MailerLiteConnector } from "./MailerLiteConnector";
import type { ProviderConnector, ProviderType } from "./ProviderConnector";

export * from "./ProviderConnector";
export * from "./CampaignProvider";
export { MailerLiteConnector } from "./MailerLiteConnector";
export { BrevoConnector } from "./BrevoConnector";

export interface ProviderMeta {
  type: ProviderType;
  label: string;
  description: string;
  logo: string;
}

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
    description: "Sincroniza listas, segmentos y automatizaciones desde Brevo.",
    logo: brevoLogo,
  },
];

export function getProviderMeta(type: ProviderType): ProviderMeta {
  const meta = PROVIDERS.find((p) => p.type === type);
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
    default:
      throw new Error(`Proveedor no soportado: ${type satisfies never}`);
  }
}
