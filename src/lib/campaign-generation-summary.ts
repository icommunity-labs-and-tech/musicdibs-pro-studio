// ============================================================================
// AI Music Studio — SINGLE SOURCE OF TRUTH for campaign configuration display.
//
// Builder Review, Campaign Detail and any future summary screen must render
// generation configuration through these helpers. This guarantees Builder →
// Review → Detail → Database always show the SAME labels for the SAME values.
//
// No duplicated mapping logic. No hardcoded labels. No stale fields.
// ============================================================================

import {
  GENERATION_LANGUAGES,
  GENERATION_MODES,
  GENERATION_MOODS,
  GENERATION_MUSIC_STYLES,
  VOICE_TYPES,
  genLabelFor,
  type GenerationLanguage,
  type GenerationMode,
  type VoiceType,
} from "@/lib/campaign-generation-options";

export const EMPTY_VALUE = "—";

export const AUDIENCE_TYPE_LABELS: Record<string, string> = {
  list: "Lista",
  segment: "Segmento",
  automation: "Automatización",
};

export function audienceTypeLabel(type: string): string {
  return AUDIENCE_TYPE_LABELS[type] ?? type;
}

/** Normalized configuration snapshot used by every summary screen. */
export interface CampaignConfigSummary {
  generationMode: GenerationMode | "" | null;
  audienceName: string | null;
  audienceSize: number | null;
  providerLabel: string | null;
  lyricsGoal: string | null;
  lyricsPrompt: string | null;
  musicStyle: string | null;
  voiceType: VoiceType | "" | null;
  language: GenerationLanguage | string | null;
  mood: string | null;
  includeFirstName: boolean;
  estimatedCredits: number;
}

export interface SummaryRow {
  label: string;
  value: string;
}

function formatNumber(value: number | null | undefined): string {
  return (value ?? 0).toLocaleString("es-ES");
}

/**
 * Ordered short-field rows for the generation configuration. Long-form fields
 * (lyrics goal / instructions) are rendered separately by the caller.
 */
export function buildCampaignConfigRows(
  config: CampaignConfigSummary,
): SummaryRow[] {
  const rows: SummaryRow[] = [
    {
      label: "Modo de generación",
      value: genLabelFor(GENERATION_MODES, config.generationMode || undefined),
    },
    { label: "Audiencia", value: config.audienceName?.trim() || EMPTY_VALUE },
    {
      label: "Tamaño de la audiencia",
      value:
        config.audienceSize != null
          ? `${formatNumber(config.audienceSize)} contactos`
          : EMPTY_VALUE,
    },
    {
      label: "Proveedor",
      value: config.providerLabel?.trim() || EMPTY_VALUE,
    },
    {
      label: "Estilo musical",
      value: genLabelFor(GENERATION_MUSIC_STYLES, config.musicStyle),
    },
    {
      label: "Tipo de voz",
      value: genLabelFor(VOICE_TYPES, config.voiceType || undefined),
    },
    {
      label: "Idioma",
      value: genLabelFor(GENERATION_LANGUAGES, config.language),
    },
    { label: "Mood", value: genLabelFor(GENERATION_MOODS, config.mood) },
  ];

  if (config.generationMode === "personalized_song") {
    rows.push({
      label: "Personalización",
      value: config.includeFirstName
        ? "Incluye el nombre del destinatario"
        : "Sin personalización de nombre",
    });
  }

  rows.push({
    label: "Créditos estimados",
    value: formatNumber(config.estimatedCredits),
  });

  return rows;
}
