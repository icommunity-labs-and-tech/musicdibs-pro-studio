// ============================================================================
// AI Music Studio — KIE/Suno error catalogue (Edge runtime / Deno).
//
// Single source of truth for translating EVERY documented KIE/Suno business
// code into a customer-safe Spanish message. No code path may surface a raw
// provider/English error: anything not in the catalogue falls back to a
// generic Spanish message while the original text is kept for server logs only.
//
// BRANDING: customer-facing strings never mention KIE/Suno — only the platform.
// Source of truth: KIE Suno API documentation (status codes + callback codes).
// ============================================================================

/**
 * Documented KIE/Suno business codes → Spanish, customer-safe messages.
 *
 * These cover both the synchronous API responses (POST /lyrics, /generate) and
 * the asynchronous callback `code` values. Where the docs reuse HTTP-style
 * semantics we keep the same numeric key.
 */
export const KIE_CODE_MESSAGES_ES: Record<number, string> = {
  // ── Success ───────────────────────────────────────────────────────────────
  200: "Operación completada correctamente.",

  // ── Client / request errors ────────────────────────────────────────────────
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

  // ── Server / generation errors ─────────────────────────────────────────────
  500: "Se produjo un error interno en el servicio de generación musical. Inténtalo de nuevo en unos minutos.",
  501: "La generación de la canción falló. Inténtalo de nuevo; si el problema persiste, contacta con soporte.",
  503: "El servicio de generación musical no está disponible temporalmente. Inténtalo de nuevo más tarde.",
};

/** Generic fallback when the code is unknown/missing — never leaks raw text. */
export const KIE_GENERIC_ES =
  "Se produjo un error inesperado en el servicio de generación musical. Inténtalo de nuevo; si el problema persiste, contacta con soporte.";

/**
 * Translate a KIE/Suno code (and optional raw message) into a customer-safe
 * Spanish string. The raw message is ignored for the user-facing text and is
 * only meant to be logged server-side by the caller.
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

/**
 * Error thrown by the KIE provider layer. Carries the customer-safe Spanish
 * message (in `message`) plus the original code/raw text for server logs only.
 */
export class KieError extends Error {
  readonly code: number | null;
  readonly rawMessage: string | null;
  readonly httpStatus: number | null;

  constructor(opts: {
    code?: number | null;
    rawMessage?: string | null;
    httpStatus?: number | null;
  }) {
    super(translateKieError(opts.code ?? null, opts.rawMessage ?? null));
    this.name = "KieError";
    this.code = opts.code ?? null;
    this.rawMessage = opts.rawMessage ?? null;
    this.httpStatus = opts.httpStatus ?? null;
  }
}

/** Spanish message for transport-level failures (network, non-JSON, etc.). */
export const KIE_NETWORK_ES =
  "No se pudo contactar con el servicio de generación musical. Comprueba tu conexión e inténtalo de nuevo.";

export const KIE_INVALID_RESPONSE_ES =
  "El servicio de generación musical devolvió una respuesta no válida. Inténtalo de nuevo en unos minutos.";

/** Spanish message when an asset download/storage step fails. */
export const KIE_DOWNLOAD_ES =
  "No se pudo guardar el contenido generado. Inténtalo de nuevo en unos minutos.";
