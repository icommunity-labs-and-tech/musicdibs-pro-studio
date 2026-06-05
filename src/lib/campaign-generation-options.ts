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
    creditLabel: "1 crédito por contacto",
  },
];

/** Fixed credit cost for a single-song campaign. */
export const SINGLE_SONG_CREDITS = 100;

/** Credit cost per contact for a personalized-song campaign. */
export const PERSONALIZED_SONG_CREDITS_PER_CONTACT = 1;

export function estimateCredits(
  mode: GenerationMode | "",
  contactsCount: number,
): number {
  if (mode === "single_song") return SINGLE_SONG_CREDITS;
  if (mode === "personalized_song") return contactsCount;
  return 0;
}

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
