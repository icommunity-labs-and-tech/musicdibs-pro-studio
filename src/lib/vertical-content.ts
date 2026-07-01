/**
 * Musicdibs Enterprise — Vertical landing pages content.
 *
 * One config object per sector. Each `/seguros`, `/banca`, `/retail` and
 * `/delivery` route is an instance of <VerticalLanding> fed with this data.
 */

import bancaAudio from "@/assets/demos/banca.mp3.asset.json";
import deliveryAudio from "@/assets/demos/delivery.mp3.asset.json";
import retailAudio from "@/assets/demos/retail.mp3.asset.json";
import segurosAudio from "@/assets/demos/seguros.mp3.asset.json";
import telcoAudio from "@/assets/demos/telco.mp3.asset.json";

export type VerticalKey = "seguros" | "banca" | "retail" | "delivery" | "telco";

export interface VerticalMetric {
  label: string;
  value: string;
  comparison: string;
}

export interface VerticalUseCase {
  title: string;
  description: string;
}

export interface VerticalContent {
  key: VerticalKey;
  label: string;
  icon: string;
  path: string;
  meta: {
    title: string;
    description: string;
  };
  hero: {
    eyebrow: string;
    headline: string;
    subtitle: string;
    audioLabel: string;
    audioMeta: string;
    audioSrc: string;
  };
  problem: string[];
  solution: string[];
  metrics: VerticalMetric[];
  metricsNote: string;
  useCases: VerticalUseCase[];
  testimonial: {
    quote: string;
    author: string;
    company: string;
  };
  cta: {
    title: string;
    subtitle: string;
  };
}

export const VERTICALS: Record<VerticalKey, VerticalContent> = {
  seguros: {
    key: "seguros",
    label: "Seguros",
    icon: "🛡️",
    path: "/seguros",
    meta: {
      title: "Email marketing para aseguradoras con IA musical | MusicDibs",
      description:
        "Aumenta la tasa de apertura de tus emails de renovación hasta un 61%. MusicDibs genera música personalizada para campañas de seguros que tus clientes no ignoran.",
    },
    hero: {
      eyebrow: "Seguros",
      headline: "Haz que tus clientes lean la carta de renovación",
      subtitle:
        "La mayoría de emails de renovación de póliza se abren menos del 20% de las veces. Con MusicDibs, el audio personalizado convierte una comunicación ignorada en una experiencia que el cliente recuerda.",
      audioLabel: "Escucha: campaña de renovación de póliza de hogar",
      audioMeta: "Segmento 45-65 años · Tono: próximo, confiable · Duración: 32s",
      audioSrc: segurosAudio.url,
    },
    problem: [
      "Las aseguradoras envían los mismos emails de renovación desde hace años.",
      "Mismo asunto. Mismo PDF adjunto. Mismo copy corporativo.",
      'El cliente los reconoce, los asocia a "gasto" y los cierra.',
      "Open rate medio del sector: 22%. El 78% de tus clientes no los abre.",
    ],
    solution: [
      "MusicDibs genera una pieza musical única para cada campaña.",
      "El audio crea un momento emocional diferente antes de que el cliente lea el precio.",
      "No sustituye el email — lo transforma en una experiencia.",
    ],
    metrics: [
      { label: "Open rate", value: "61%", comparison: "22% media del sector" },
      { label: "CTR", value: "14%", comparison: "4% media del sector" },
      { label: "Bajas de suscripción", value: "-31%", comparison: "baseline sin audio" },
      { label: "Tiempo de lectura", value: "+1.8x", comparison: "baseline sin audio" },
    ],
    metricsNote:
      "Datos de pilotos Q4 2024 – Q1 2025. Muestra: 4.200 – 18.000 envíos por piloto.",
    useCases: [
      {
        title: "Renovación de póliza",
        description:
          "Audio de tono cálido y cercano. El cliente siente que la aseguradora le habla, no le factura.",
      },
      {
        title: "Lanzamiento de nuevo producto",
        description:
          "Póliza de vida, salud o ciberseguro. El audio comunica innovación y genera curiosidad antes de leer las coberturas.",
      },
      {
        title: "Campaña de retención / cross-sell",
        description:
          "Cliente con una póliza al que quieres ofrecer una segunda. El audio diferencia el email de una comunicación comercial genérica.",
      },
    ],
    testimonial: {
      quote:
        "Enviamos la campaña de renovación de póliza de hogar a 4.200 clientes con MusicDibs. Fue la primera vez en 8 años que superamos el 50% de apertura. El equipo no se lo creía.",
      author: "Director de Marketing",
      company: "Aseguradora regional, España",
    },
    cta: {
      title: "¿Cuántas renovaciones estás perdiendo cada mes?",
      subtitle:
        "Demo de 30 minutos. Te generamos un audio para tu próxima campaña de renovación en directo.",
    },
  },

  banca: {
    key: "banca",
    label: "Banca",
    icon: "🏦",
    path: "/banca",
    meta: {
      title: "Email marketing para banca con IA musical | MusicDibs",
      description:
        "Emails de banca que tus clientes premium realmente abren. MusicDibs genera música personalizada para comunicaciones financieras con un 58% de open rate.",
    },
    hero: {
      eyebrow: "Banca",
      headline:
        "La comunicación que tus clientes Private Banking llevan años esperando",
      subtitle:
        "Los clientes de banca premium reciben docenas de emails genéricos. MusicDibs convierte tu comunicación financiera en una experiencia diferenciada que construye confianza y fidelización.",
      audioLabel: "Escucha: campaña de fidelización banca premium",
      audioMeta: "Segmento clientes Private · Tono: sofisticado, exclusivo · Duración: 38s",
      audioSrc: bancaAudio.url,
    },
    problem: [
      "La banca tiene el mayor problema de indiferenciación en email marketing.",
      "Todos los bancos suenan igual: corporativo, frío, transaccional.",
      "El cliente premium espera un nivel de atención que los emails no transmiten.",
      "Open rate medio del sector bancario: 19%.",
    ],
    solution: [
      "MusicDibs entiende que la banca vende confianza, no productos.",
      "El audio se adapta al segmento: jazz clásico para Private Banking, moderno para jóvenes inversores, tranquilo para ahorradores conservadores.",
      "La música crea el contexto emocional adecuado antes de cualquier CTA.",
    ],
    metrics: [
      { label: "Open rate", value: "58%", comparison: "19% media del sector" },
      { label: "Tiempo lectura email", value: "+2.4x", comparison: "baseline sin audio" },
      { label: "Solicitudes de info", value: "+41%", comparison: "campaña anterior" },
      { label: "Churn de clientes", value: "-18%", comparison: "baseline sin audio" },
    ],
    metricsNote: "Datos de pilotos Q4 2024 – Q1 2025.",
    useCases: [
      {
        title: "Lanzamiento de producto financiero",
        description:
          "Hipoteca, fondo de inversión, plan de pensiones. El audio comunica solidez y genera disposición antes de ver números.",
      },
      {
        title: "Comunicación a clientes Private Banking",
        description:
          "Clientes de alto valor que esperan un trato diferenciado. El audio exclusivo refuerza la percepción de servicio premium.",
      },
      {
        title: "Campaña de reactivación",
        description:
          "Clientes inactivos o con saldo bajo. El audio crea un momento emocional positivo que reactiva la relación con el banco.",
      },
    ],
    testimonial: {
      quote:
        "El audio diferencia la comunicación del banco de forma inmediata. Los clientes Private Banking nos dijeron que era la primera vez que les llamaba la atención un email del banco.",
      author: "CMO",
      company: "Entidad financiera, 400M€ AUM",
    },
    cta: {
      title: "Tu banco puede sonar diferente",
      subtitle:
        "Demo en 30 minutos. Generamos un audio para tu segmento de clientes en directo.",
    },
  },

  retail: {
    key: "retail",
    label: "Retail",
    icon: "🛍️",
    path: "/retail",
    meta: {
      title: "Email marketing para retail con IA musical | MusicDibs",
      description:
        "Campañas de retail que se abren y se recuerdan. MusicDibs genera música para Black Friday, lanzamientos y fidelización con un 64% de open rate y 18% de CTR.",
    },
    hero: {
      eyebrow: "Retail",
      headline: "Tu próxima campaña de Black Friday que nadie va a ignorar",
      subtitle:
        "En retail, el 74% de los emails promocionales se eliminan sin abrir. MusicDibs genera un audio único por campaña que detiene el scroll y convierte la apertura en una experiencia de compra.",
      audioLabel: "Escucha: campaña Black Friday — urgencia y descuento",
      audioMeta: "Segmento shoppers activos · Tono: energético, urgente · Duración: 35s",
      audioSrc: retailAudio.url,
    },
    problem: [
      "En retail el inbox está saturado.",
      "El cliente recibe 15-20 emails promocionales por semana.",
      'Todos compiten con el mismo asunto: "% DE DESCUENTO · SOLO HOY".',
      "El resultado: banner blindness total. Open rate medio: 26%. CTR medio: 5%.",
    ],
    solution: [
      "MusicDibs crea una identidad sonora para cada campaña.",
      "El Black Friday suena diferente al lanzamiento de colección.",
      "El rebajas de enero suena diferente a la campaña de fidelización.",
      "Cada email tiene su propia experiencia — el cliente lo distingue antes de leer el asunto.",
    ],
    metrics: [
      { label: "Open rate", value: "64%", comparison: "26% media del sector" },
      { label: "CTR", value: "18%", comparison: "5% media del sector" },
      { label: "Conversión (venta)", value: "+23%", comparison: "campaña anterior" },
      { label: "Tiempo en email", value: "+2.1x", comparison: "baseline sin audio" },
    ],
    metricsNote:
      "Datos de pilotos Q4 2024 – Q1 2025. Black Friday 2024: muestra 22.000 envíos.",
    useCases: [
      {
        title: "Black Friday / Cyber Monday",
        description:
          "Audio de alta energía que comunica urgencia real. El cliente siente la emoción del descuento antes de ver el precio.",
      },
      {
        title: "Lanzamiento de nueva colección",
        description:
          "Tono aspiracional adaptado al posicionamiento de la marca. Premium suena diferente a fast fashion.",
      },
      {
        title: "Programa de fidelización",
        description:
          "Clientes recurrentes que merecen un trato diferente. El audio exclusivo refuerza la pertenencia al club.",
      },
    ],
    testimonial: {
      quote:
        "Usamos MusicDibs para el Black Friday. El audio creó una urgencia emocional que ningún copy había conseguido antes. Fue nuestra mejor campaña de email en 3 años.",
      author: "Head of Digital",
      company: "Cadena retail, 180 tiendas",
    },
    cta: {
      title: "Tu próxima campaña puede sonar así",
      subtitle:
        "Demo de 30 minutos. Generamos el audio de tu próxima campaña — sin compromiso.",
    },
  },

  delivery: {
    key: "delivery",
    label: "Delivery",
    icon: "🛵",
    path: "/delivery",
    meta: {
      title:
        "Email marketing para delivery y restauración con IA musical | MusicDibs",
      description:
        "Re-engancha a tus clientes inactivos con audio personalizado por IA. MusicDibs aumenta la reactivación en delivery un 44% y el CTR hasta un 21%.",
    },
    hero: {
      eyebrow: "Delivery y restauración",
      headline: "Haz que vuelvan a pedir esta semana",
      subtitle:
        "El cliente inactivo de delivery no necesita otro cupón del 10%. Necesita recordar por qué le gustaba pedir. MusicDibs genera música que activa el recuerdo emocional y convierte la apertura en un pedido.",
      audioLabel: "Escucha: campaña de reactivación — clientes inactivos 30 días",
      audioMeta: "Tono: cálido, apetecible, cercano · Duración: 28s",
      audioSrc: deliveryAudio.url,
    },
    problem: [
      "En delivery, la guerra de descuentos ha entrenado a los clientes a esperar.",
      "Abren el email solo si el descuento supera su umbral. Si no, lo eliminan.",
      "El resultado: márgenes destruidos y una base de clientes que solo compra en promoción.",
      "Open rate medio: 24%. Tasa de reactivación media: 8%.",
    ],
    solution: [
      "MusicDibs crea una conexión emocional con el momento de la comida, no con el precio.",
      "El audio recuerda la experiencia de pedir, no el descuento.",
      "El cliente abre porque quiere vivir ese momento — no porque tenga un código del 15%.",
      "Resultado: reactivación sin destruir margen.",
    ],
    metrics: [
      { label: "Open rate re-engagement", value: "58%", comparison: "24% media del sector" },
      { label: "Tasa de reactivación", value: "44%", comparison: "8% media del sector" },
      { label: "CTR", value: "21%", comparison: "6% media del sector" },
      { label: "Pedidos en 48h post-envío", value: "+38%", comparison: "baseline sin audio" },
    ],
    metricsNote:
      "Datos de pilotos Q1 2025. Muestra: 8.400 – 15.000 usuarios inactivos por piloto.",
    useCases: [
      {
        title: "Re-engagement de clientes inactivos",
        description:
          "Usuarios sin pedido en 30-90 días. El audio evoca el momento de la comida y activa el deseo antes de mostrar cualquier oferta.",
      },
      {
        title: "Lanzamiento de nuevo restaurante o cocina",
        description:
          "El audio presenta el estilo culinario antes de que el cliente lea el menú. Italiana suena diferente a japonesa.",
      },
      {
        title: "Campaña de fidelización de usuarios frecuentes",
        description:
          "Los mejores clientes merecen algo diferente a un cupón. Un audio exclusivo del programa de fidelización refuerza la relación.",
      },
    ],
    testimonial: {
      quote:
        "Llevábamos 6 meses intentando reactivar a usuarios inactivos con descuentos. Con MusicDibs, la tasa de reactivación pasó del 7% al 41% sin tocar el porcentaje de descuento.",
      author: "Growth Manager",
      company: "Plataforma de delivery, 3 ciudades",
    },
    cta: {
      title: "¿Cuántos clientes inactivos tienes ahora mismo?",
      subtitle:
        "Demo de 30 minutos. Calculamos el impacto en tu base de usuarios inactivos.",
    },
  },

  telco: {
    key: "telco",
    label: "Telco",
    icon: "📡",
    path: "/telco",
    meta: {
      title: "Email marketing para telco con IA musical | MusicDibs",
      description:
        "Reduce el churn y mejora la conversión de tus campañas de telecomunicaciones. MusicDibs genera audio personalizado que tus clientes abren: hasta un 57% de open rate.",
    },
    hero: {
      eyebrow: "Telecomunicaciones",
      headline: "Comunica tarifas y renovaciones sin que te ignoren",
      subtitle:
        "Las operadoras envían facturas, renovaciones y ofertas que el cliente asocia a gasto y portabilidad. MusicDibs convierte esas comunicaciones en una experiencia sonora que reduce el churn y mejora la conversión.",
      audioLabel: "Escucha: campaña de retención — cliente en riesgo de portabilidad",
      audioMeta: "Segmento alto valor · Tono: cercano, tecnológico · Duración: 30s",
      audioSrc: telcoAudio.url,
    },
    problem: [
      "En telco la batalla es por la retención, y el email es la peor arma del sector.",
      "Facturas, subidas de tarifa y ofertas de la competencia saturan el inbox del cliente.",
      "El cliente abre el email de la operadora solo cuando piensa en portarse.",
      "Open rate medio del sector: 20%. Churn anual de dos dígitos.",
    ],
    solution: [
      "MusicDibs crea un audio único que diferencia a la operadora de la guerra de precios.",
      "El audio comunica innovación y cercanía antes de que el cliente vea la tarifa.",
      "Se adapta al segmento: joven y dinámico para datos, tranquilo para fibra familiar.",
      "Resultado: comunicaciones que se abren y construyen relación, no solo facturan.",
    ],
    metrics: [
      { label: "Open rate", value: "57%", comparison: "20% media del sector" },
      { label: "CTR", value: "15%", comparison: "5% media del sector" },
      { label: "Churn / portabilidad", value: "-22%", comparison: "baseline sin audio" },
      { label: "Upsell de tarifa", value: "+27%", comparison: "campaña anterior" },
    ],
    metricsNote:
      "Datos de pilotos Q1 2025. Muestra: 12.000 – 25.000 envíos por piloto.",
    useCases: [
      {
        title: "Campaña de retención / anti-churn",
        description:
          "Clientes en riesgo de portabilidad. El audio crea un momento emocional positivo que reduce la fuga sin tener que igualar el precio de la competencia.",
      },
      {
        title: "Upsell de tarifa o fibra",
        description:
          "Cliente con potencial de subir de plan. El audio comunica el valor del salto antes de mostrar el nuevo precio.",
      },
      {
        title: "Lanzamiento de nuevo servicio",
        description:
          "5G, fibra simétrica o paquetes convergentes. El audio genera curiosidad e innovación antes de leer las condiciones.",
      },
    ],
    testimonial: {
      quote:
        "Probamos MusicDibs en una campaña de retención para clientes en riesgo. La tasa de apertura se duplicó y conseguimos reducir la portabilidad sin entrar en guerra de precios.",
      author: "Responsable de CRM",
      company: "Operadora de telecomunicaciones, España",
    },
    cta: {
      title: "¿Cuántos clientes se te portan cada mes?",
      subtitle:
        "Demo de 30 minutos. Generamos un audio para tu próxima campaña de retención en directo.",
    },
  },
};

export const VERTICAL_LIST: VerticalContent[] = [
  VERTICALS.seguros,
  VERTICALS.banca,
  VERTICALS.retail,
  VERTICALS.delivery,
  VERTICALS.telco,
];
