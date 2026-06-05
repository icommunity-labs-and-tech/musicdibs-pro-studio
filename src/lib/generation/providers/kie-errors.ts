// ============================================================================
// AI Music Studio — KIE/Suno error catalogue (frontend mirror).
//
// Browser-safe copy of the edge catalogue (supabase/functions/_shared/
// kie-errors.ts). Used by the client-side provider scaffolding so that, if it
// is ever wired into a live path, no raw/English provider error can surface —
// every message is customer-safe Spanish.
//
// BRANDING: customer-facing strings never mention KIE/Suno — only the platform.
// ============================================================================

/** Documented KIE/Suno business codes → Spanish, customer-safe messages. */
export const KIE_CODE_MESSAGES_ES: Record<number, string> = {
  200: "Operación completada correctamente.",
  400: "La solicitud de generación no es válida. Revisa la configuración de la campaña e inténtalo de nuevo.",
  401: "El servicio de generación musical rechazó las credenciales. Contacta con soporte.",
  402: "No hay créditos suficientes para generar la canción. Contacta con soporte para ampliar tu plan.",
  403: "El servicio de generación musical denegó el acceso a esta operación. Contacta con soporte.",
  404: "No se encontró el recurso de generación solicitado. Vuelve a iniciar la generación.",
  405: "Operación no permitida por el servicio de generación musical. Contacta con soporte.",
  408: "El servicio de generación musical tardó demasiado en responder. Inténtalo de nuevo en unos minutos.",
  413: "El texto enviado es demasiado largo. Acorta el objetivo o las instrucciones de la letra e inténtalo de nuevo.",
  422: "El contenido no cumple las políticas del servicio de generación musical. Ajusta la letra o el estilo e inténtalo de nuevo.",
  429: "Se ha alcanzado el límite de solicitudes de generación. Espera unos minutos e inténtalo de nuevo.",
  451: "No se pudo descargar el contenido generado. Inténtalo de nuevo en unos minutos.",
  455: "El servicio de generación musical está en mantenimiento. Inténtalo de nuevo más tarde.",
  500: "Se produjo un error interno en el servicio de generación musical. Inténtalo de nuevo en unos minutos.",
  501: "La generación de la canción falló. Inténtalo de nuevo; si el problema persiste, contacta con soporte.",
  503: "El servicio de generación musical no está disponible temporalmente. Inténtalo de nuevo más tarde.",
};

export const KIE_GENERIC_ES =
  "Se produjo un error inesperado en el servicio de generación musical. Inténtalo de nuevo; si el problema persiste, contacta con soporte.";

export const KIE_NETWORK_ES =
  "No se pudo contactar con el servicio de generación musical. Comprueba tu conexión e inténtalo de nuevo.";

export const KIE_INVALID_RESPONSE_ES =
  "El servicio de generación musical devolvió una respuesta no válida. Inténtalo de nuevo en unos minutos.";

/**
 * Translate a KIE/Suno code into a customer-safe Spanish string. The raw
 * provider message is intentionally never used for user-facing text.
 */
export function translateKieError(
  code: number | null | undefined,
  _rawMessage?: string | null,
): string {
  if (typeof code === "number" && KIE_CODE_MESSAGES_ES[code]) {
    return KIE_CODE_MESSAGES_ES[code];
  }
  return KIE_GENERIC_ES;
}
