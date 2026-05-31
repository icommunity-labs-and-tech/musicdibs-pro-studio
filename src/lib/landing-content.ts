/**
 * Musicdibs Enterprise — Landing content (single source of truth).
 *
 * All copy and data for the public landing live here so the section
 * components stay presentational and reusable (industries, ROI, pricing…).
 *
 * Audio: placeholder royalty-free tracks for the design. Real campaign
 * audio lives in Supabase Storage bucket `campaign-audio` and can be
 * swapped here later without touching components.
 */

export type IndustryKey = "seguros" | "banca" | "retail" | "delivery" | "telco";

/** Demo audio cards shown inside the Audio Demo Modal (section 3). */
export interface AudioDemo {
  key: IndustryKey;
  icon: string;
  sector: string;
  objective: string;
  badge: string;
  src: string;
}

export const AUDIO_DEMOS: AudioDemo[] = [
  {
    key: "banca",
    icon: "🏦",
    sector: "Banca Premium",
    objective: "Campaña de fidelización de clientes Private Banking",
    badge: "+41% open rate",
    src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
  },
  {
    key: "seguros",
    icon: "🛡️",
    sector: "Seguros",
    objective: "Renovación de póliza de hogar, segmento 45-65 años",
    badge: "+38% open rate",
    src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
  },
  {
    key: "retail",
    icon: "🛍️",
    sector: "Retail",
    objective: "Black Friday — captación de urgencia y descuento",
    badge: "+52% CTR vs baseline",
    src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
  },
  {
    key: "delivery",
    icon: "🛵",
    sector: "Delivery",
    objective: "Reactivación de clientes inactivos y recompra recurrente",
    badge: "+27% recompra",
    src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3",
  },
  {
    key: "telco",
    icon: "📱",
    sector: "Telecomunicaciones",
    objective: "Renovación de contrato y retención de clientes con churn alto",
    badge: "-22% churn",
    src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3",
  },
];

/** Names for the ecosystem strip under the hero. Logos resolved in the component. */
export const INTEGRATIONS = [
  "MailerLite",
  "Brevo",
  "HubSpot",
  "Salesforce",
  "WhatsApp Business",
  "Zapier",
];

/** How it works — 4 steps (section 4). */
export const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Define tu campaña",
    body: "Objetivo, sector y segmento. Tú controlas el tono y el estilo.",
    note: "Wizard guiado. Sin conocimientos técnicos necesarios.",
  },
  {
    step: "02",
    title: "Generamos la experiencia",
    body: "Gracias a nuestra IA genermos un mensaje musical único en menos de 90 segundos.",
    note: "Musicdibs IA Engine. Calidad de estudio profesional.",
  },
  {
    step: "03",
    title: "Envía por tus canales",
    body: "Se integra con tus canales actuales: email (MailerLite, Brevo), CRM (HubSpot), automatizadores (Zapier) y otros que irán llegando (próximamente, WhatsApp Business).",
    note: "Sin cambiar tu stack. Tus canales, tus listas.",
  },
  {
    step: "04",
    title: "Clientes escuchan y reaccionan",
    body: "Open rate, CTR y conversión en tiempo real en tu dashboard.",
    note: "Sincronización automática cada hora.",
  },
] as const;

/** Industry results with benchmark comparison + testimonial (section 5). */
export interface IndustryResult {
  key: IndustryKey;
  icon: string;
  name: string;
  metrics: { label: string; value: string; benchmark: string }[];
  quote: string;
  author: string;
}

export const INDUSTRY_RESULTS: IndustryResult[] = [
  {
    key: "seguros",
    icon: "🛡️",
    name: "Seguros",
    metrics: [
      { label: "Open rate con Musicdibs", value: "61%", benchmark: "22% media del sector" },
      { label: "CTR", value: "14%", benchmark: "4% media del sector" },
      { label: "Bajas de suscripción", value: "-31%", benchmark: "baseline sin audio" },
    ],
    quote:
      "Enviamos la campaña de renovación de póliza de hogar a 4.200 contactos. Fue la primera vez que superamos el 50% de apertura en 8 años de campañas de comunicación.",
    author: "Director Marketing, Aseguradora regional ES",
  },
  {
    key: "banca",
    icon: "🏦",
    name: "Banca",
    metrics: [
      { label: "Open rate con Musicdibs", value: "58%", benchmark: "19% media del sector" },
      { label: "Tiempo de lectura del email", value: "+2.4x", benchmark: "emails sin audio" },
      { label: "Solicitudes de información", value: "+41%", benchmark: "campaña anterior" },
    ],
    quote:
      "El audio diferencia la comunicación del banco. Los clientes premium esperan algo diferente. Musicdibs lo entrega.",
    author: "CMO, Entidad financiera 400M€ AUM",
  },
  {
    key: "retail",
    icon: "🛍️",
    name: "Retail",
    metrics: [
      { label: "Open rate con Musicdibs", value: "64%", benchmark: "26% media del sector" },
      { label: "CTR Black Friday", value: "18%", benchmark: "5% año anterior" },
      { label: "Conversión (venta)", value: "+23%", benchmark: "control sin audio" },
    ],
    quote:
      "Usamos Musicdibs para el Black Friday. El audio creó urgencia emocional que ningún copy había conseguido.",
    author: "Head of Digital, Cadena retail 180 tiendas",
  },
  {
    key: "delivery",
    icon: "🛵",
    name: "Delivery",
    metrics: [
      { label: "Open rate con Musicdibs", value: "60%", benchmark: "25% media del sector" },
      { label: "Recompra a 30 días", value: "+27%", benchmark: "control sin audio" },
      { label: "Reactivación de inactivos", value: "+19%", benchmark: "campaña anterior" },
    ],
    quote:
      "El audio nos devolvió clientes que llevaban meses sin pedir. La experiencia sonora consigue lo que ningún cupón por sí solo: que vuelvan a abrir la app.",
    author: "Head of CRM, Plataforma de delivery",
  },
  {
    key: "telco",
    icon: "📱",
    name: "Telecomunicaciones",
    metrics: [
      { label: "Open rate con Musicdibs", value: "57%", benchmark: "20% media del sector" },
      { label: "Renovaciones de contrato", value: "+19%", benchmark: "campaña anterior" },
      { label: "Churn tras campaña", value: "-22%", benchmark: "media histórica" },
    ],
    quote:
      "En un sector donde todo el mundo compite por precio, diferenciar la comunicación de renovación con audio nos ha permitido retener clientes que ya estaban con un pie fuera.",
    author: "CMO, Operador de telecomunicaciones",
  },
];

/**
 * ROI calculator — conservative open-rate uplift (pp) per sector.
 * Deliberately prudent: estimates that a CMO reads as "razonable", not "imposible".
 */
export const ROI_SECTORS: { key: string; label: string; upliftPP: number }[] = [
  { key: "seguros", label: "Seguros", upliftPP: 7 },
  { key: "banca", label: "Banca", upliftPP: 8 },
  { key: "retail", label: "Retail", upliftPP: 9 },
  { key: "delivery", label: "Delivery", upliftPP: 8 },
  { key: "telco", label: "Telecomunicaciones", upliftPP: 7 },
  { key: "otros", label: "Otros", upliftPP: 5 },
];

/** Pricing presented as volume of impact (section 8). */
export interface PricingPlan {
  name: string;
  price: string;
  period?: string;
  highlight?: boolean;
  features: string[];
  cta: string;
}

export const PRICING_PLANS: PricingPlan[] = [
  {
    name: "Starter",
    price: "€399",
    period: "/mes",
    features: [
      "Hasta 5 campañas/mes",
      "Hasta 10.000 contactos",
      "1 usuario",
      "MailerLite o Brevo",
      "Soporte por email",
    ],
    cta: "Solicitar demo",
  },
  {
    name: "Professional",
    price: "€999",
    period: "/mes",
    highlight: true,
    features: [
      "Hasta 20 campañas/mes",
      "Hasta 50.000 contactos",
      "5 usuarios",
      "Todos los proveedores",
      "Soporte prioritario",
      "Analytics avanzado",
    ],
    cta: "Solicitar demo",
  },
  {
    name: "Enterprise",
    price: "A medida",
    features: [
      "Campañas ilimitadas",
      "Contactos ilimitados",
      "Usuarios ilimitados",
      "Integraciones custom",
      "Account manager dedicado",
      "SLA 99.9% · GDPR DPA incluido",
    ],
    cta: "Hablar con ventas",
  },
];

/** FAQ — the 5 questions a CMO needs answered (section 9). */
export const FAQ_ITEMS = [
  {
    q: "¿El audio se reproduce directamente en el email?",
    a: "No, y eso es intencional. Los principales clientes de email (Gmail, Outlook, Apple Mail) no reproducen audio inline por razones de seguridad. Musicdibs genera un botón o imagen en el email que lleva a una micro-landing con el audio player. Esto también nos permite rastrear exactamente quién escuchó, durante cuánto tiempo, y si convirtió.",
  },
  {
    q: "¿Tengo que cambiar mis herramientas de comunicación actuales?",
    a: "No. Musicdibs se integra con tu stack existente: MailerLite, Brevo, HubSpot, Salesforce Marketing Cloud y, próximamente, WhatsApp Business. Mantienes tus listas, tus segmentaciones y tu flujo actual. Nosotros añadimos la capa de experiencia sonora y analytics.",
  },
  {
    q: "¿Cómo controlo que el audio encaje con la imagen de marca?",
    a: "En el onboarding defines el tono (corporativo, cercano, urgente), el estilo musical (orquestal, electrónico, acústico) y los guidelines de marca. Cada canción generada pasa por ese filtro. Para planes Professional y Enterprise, tienes revisión humana antes del envío.",
  },
  {
    q: "¿Qué pasa con el GDPR y los datos de mis contactos?",
    a: "Musicdibs no procesa datos de contactos. Tus listas permanecen en tu proveedor de email. Únicamente sincronizamos estadísticas agregadas (aperturas, clics). Para Enterprise incluimos DPA firmado y podemos alojar en EU exclusivamente.",
  },
  {
    q: "¿Cuánto tiempo lleva generar una canción?",
    a: "Entre 60 y 120 segundos desde que apruebas el brief. Para campañas recurrentes, puedes usar el mismo audio o generar uno nuevo por campaña. El proceso es completamente automático.",
  },
];

/** Demo form select options. */
export const DEMO_SECTORS = [
  "Seguros",
  "Banca",
  "Retail",
  "Delivery",
  "Telecomunicaciones",
  "Turismo",
  "Agencia",
  "Otro",
];

export const DEMO_LIST_SIZES = ["<5K", "5K-50K", "50K-200K", "+200K"];

export const PARTNER_CLIENT_RANGES = ["<5", "5-20", "20-50", "+50"];

/** Nav anchor links. */
export const NAV_LINKS = [
  { href: "#experiencia", label: "Experiencia" },
  { href: "#como-funciona", label: "Cómo funciona" },
  { href: "#resultados", label: "Resultados" },
  { href: "#partners", label: "Partners" },
  { href: "#precios", label: "Precios" },
];
