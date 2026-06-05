// ============================================================================
// AI Music Studio — Campaign Builder V2 catalog options.
//
// BRANDING: all generation capabilities are presented as "Powered by AI Music
// Studio". Never expose underlying providers/engines to the customer.
//
// These values map 1:1 to columns in `campaign_generation_configs`.
// ============================================================================

export type GenerationMode = "single_song" | "personalized_song";
export type VoiceType = "male" | "female" | "duet";
export type GenerationLanguage = "es" | "en" | "pt" | "fr";

export const AI_MUSIC_STUDIO = "Powered by AI Music Studio";

export interface GenerationModeMeta {
  value: GenerationMode;
  label: string;
  description: string;
  /** Plain-text credit cost description shown on the selection card. */
  creditLabel: string;
}

export const GENERATION_MODES: GenerationModeMeta[] = [
  {
    value: "single_song",
    label: "Campaña de canción única",
    description: "Genera una sola canción para toda la audiencia.",
    creditLabel: "100 créditos",
  },
  {
    value: "personalized_song",
    label: "Campaña de canción personalizada",
    description: "Genera una canción única por destinatario.",
    creditLabel: "1 crédito por contacto (mínimo 100 créditos)",
  },
];

/**
 * Minimum credit cost for ANY campaign, regardless of type. Personalized
 * campaigns below this contact count are still billed at this floor.
 */
export const MINIMUM_CAMPAIGN_CREDITS = 100;

/** Fixed credit cost for a single-song campaign. */
export const SINGLE_SONG_CREDITS = MINIMUM_CAMPAIGN_CREDITS;

/** Credit cost per contact for a personalized-song campaign. */
export const PERSONALIZED_SONG_CREDITS_PER_CONTACT = 1;

/**
 * Single source of truth for estimated campaign credit cost.
 *
 *   single_song        → fixed 100 credits
 *   personalized_song  → max(100, contactsCount)  (1 credit per recipient,
 *                        with a 100-credit minimum campaign cost)
 *
 * Use this everywhere (Builder, Review, Campaign Detail, Generation Modal,
 * future billing). Do NOT duplicate this logic.
 */
export function calculateEstimatedCredits(
  mode: GenerationMode | "",
  contactsCount: number,
): number {
  if (mode === "single_song") return SINGLE_SONG_CREDITS;
  if (mode === "personalized_song") {
    const contacts = Number.isFinite(contactsCount) ? Math.max(0, Math.floor(contactsCount)) : 0;
    return Math.max(
      MINIMUM_CAMPAIGN_CREDITS,
      contacts * PERSONALIZED_SONG_CREDITS_PER_CONTACT,
    );
  }
  return 0;
}

/** @deprecated Use {@link calculateEstimatedCredits}. Kept as an alias. */
export const estimateCredits = calculateEstimatedCredits;

export const GENERATION_MUSIC_STYLES: { value: string; label: string }[] = [
  { value: "pop", label: "Pop" },
  { value: "rock", label: "Rock" },
  { value: "acoustic", label: "Acústico" },
  { value: "electronic", label: "Electrónica" },
  { value: "jazz", label: "Jazz" },
  { value: "latin", label: "Latino" },
  { value: "indie", label: "Indie" },
  { value: "corporate", label: "Corporativo" },
  { value: "classical", label: "Clásica" },
];

export const VOICE_TYPES: { value: VoiceType; label: string }[] = [
  { value: "male", label: "Masculina" },
  { value: "female", label: "Femenina" },
  { value: "duet", label: "Dúo" },
];

export const GENERATION_LANGUAGES: { value: GenerationLanguage; label: string }[] =
  [
    { value: "es", label: "Español" },
    { value: "en", label: "Inglés" },
    { value: "pt", label: "Portugués" },
    { value: "fr", label: "Francés" },
  ];

export const GENERATION_MOODS: { value: string; label: string }[] = [
  { value: "happy", label: "Alegre" },
  { value: "emotional", label: "Emotivo" },
  { value: "energetic", label: "Enérgico" },
  { value: "premium", label: "Premium" },
  { value: "relaxed", label: "Relajado" },
  { value: "inspirational", label: "Inspirador" },
  { value: "celebratory", label: "Celebración" },
];

export function genLabelFor(
  options: { value: string; label: string }[],
  value: string | null | undefined,
): string {
  if (!value) return "—";
  return options.find((o) => o.value === value)?.label ?? value;
}
