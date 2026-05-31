// Opciones de catálogo para el asistente de creación de campañas.
// Las claves coinciden con los valores almacenados en la tabla `campaigns`.

export const CAMPAIGN_TYPES: { value: string; label: string }[] = [
  { value: "onboarding", label: "Bienvenida" },
  { value: "birthday", label: "Cumpleaños" },
  { value: "anniversary", label: "Aniversario" },
  { value: "loyalty", label: "Fidelización" },
  { value: "promotional", label: "Promocional" },
  { value: "seasonal", label: "Estacional" },
  { value: "launch", label: "Lanzamiento" },
  { value: "reactivation", label: "Reactivación" },
  { value: "winback", label: "Recuperación" },
  { value: "reminder", label: "Recordatorio" },
];

export const CAMPAIGN_VERTICALS: { value: string; label: string }[] = [
  { value: "banking", label: "Banca" },
  { value: "insurance", label: "Seguros" },
  { value: "retail", label: "Retail" },
  { value: "telecom", label: "Telecomunicaciones" },
  { value: "music", label: "Música" },
];

export const MUSIC_STYLES: { value: string; label: string }[] = [
  { value: "pop", label: "Pop" },
  { value: "acoustic", label: "Acústico" },
  { value: "electronic", label: "Electrónica" },
  { value: "classical", label: "Clásica" },
  { value: "orchestral", label: "Orquestal" },
  { value: "jazz", label: "Jazz" },
];

export const CAMPAIGN_TONES: { value: string; label: string }[] = [
  { value: "professional", label: "Profesional" },
  { value: "friendly", label: "Cercano" },
  { value: "warm", label: "Cálido" },
  { value: "emotional", label: "Emotivo" },
  { value: "energetic", label: "Enérgico" },
  { value: "fun", label: "Divertido" },
  { value: "exciting", label: "Emocionante" },
  { value: "premium", label: "Premium" },
];

export const DELIVERY_CHANNELS: { value: string; label: string }[] = [
  { value: "email", label: "Email" },
  { value: "sms", label: "SMS" },
  { value: "whatsapp", label: "WhatsApp" },
];

export const DURATION_OPTIONS: { value: number; label: string }[] = [
  { value: 15, label: "15 segundos" },
  { value: 30, label: "30 segundos" },
  { value: 45, label: "45 segundos" },
  { value: 60, label: "60 segundos" },
];

export function labelFor(
  options: { value: string; label: string }[],
  value: string | null | undefined,
): string {
  if (!value) return "—";
  return options.find((o) => o.value === value)?.label ?? value;
}
