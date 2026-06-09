import type { PlatformSetting } from "@/hooks/use-admin";

// Costes unitarios de la API de KIE/Suno.
// Fuente: https://kie.ai/es/pricing — "Generate Music: 12 créditos ≈ $0.06 / request".
// Los valores son editables desde la pestaña "Configuración" del panel admin
// mediante las claves de platform_settings indicadas abajo.

export interface CostConfig {
  musicCostUsd: number;
  lyricsCostUsd: number;
  usdEurRate: number;
  planPriceEur: Record<string, number | null>;
}

export const COST_DEFAULTS: CostConfig = {
  musicCostUsd: 0.06,
  lyricsCostUsd: 0.02,
  usdEurRate: 0.92,
  planPriceEur: { starter: 399, professional: 999, enterprise: null },
};

export function parseCostConfig(settings: PlatformSetting[]): CostConfig {
  const num = (key: string, fallback: number) => {
    const raw = settings.find((s) => s.key === key)?.value;
    const n = raw == null ? NaN : Number(raw);
    return Number.isFinite(n) ? n : fallback;
  };
  return {
    musicCostUsd: num("kie_music_cost_usd", COST_DEFAULTS.musicCostUsd),
    lyricsCostUsd: num("kie_lyrics_cost_usd", COST_DEFAULTS.lyricsCostUsd),
    usdEurRate: num("usd_eur_rate", COST_DEFAULTS.usdEurRate),
    planPriceEur: {
      starter: num("plan_price_starter_eur", 399),
      professional: num("plan_price_professional_eur", 999),
      enterprise: COST_DEFAULTS.planPriceEur.enterprise,
    },
  };
}

export interface CostBreakdown {
  costUsd: number;
  costEur: number;
}

export function computeCost(cfg: CostConfig, musicOps: number, lyricsOps: number): CostBreakdown {
  const costUsd = musicOps * cfg.musicCostUsd + lyricsOps * cfg.lyricsCostUsd;
  return { costUsd, costEur: costUsd * cfg.usdEurRate };
}

/** Ingreso mensual del plan (EUR). `null` = a medida / desconocido. */
export function planRevenueEur(cfg: CostConfig, plan: string): number | null {
  return cfg.planPriceEur[plan] ?? null;
}

export const fmtUsd = (n: number) =>
  n.toLocaleString("es-ES", { style: "currency", currency: "USD", maximumFractionDigits: 2 });

export const fmtEur = (n: number) =>
  n.toLocaleString("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 2 });
