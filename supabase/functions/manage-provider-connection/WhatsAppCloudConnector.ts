// WhatsAppCloudConnector — validación de credenciales para el canal
// "WhatsApp Business" vía la Cloud API de Meta (graph.facebook.com).
//
// A diferencia de MailerLite/Resend, WhatsApp Cloud no tiene "audiencias"
// remotas: las audiencias son las contact_lists locales del tenant (filtradas
// a contactos con teléfono). La sincronización se resuelve en index.ts
// (acción sync_audiences) — esta clase solo valida credenciales contra Meta.
//
// Autenticación: Access Token permanente (System User) + Phone Number ID.
// El envío real de marketing se hace con plantillas aprobadas (type: template).

export interface WhatsAppCloudCredentials {
  accessToken: string;
  phoneNumberId: string;
  wabaId?: string;
  templateName?: string;
  templateLanguage?: string;
}

const GRAPH_VERSION = "v21.0";

export class WhatsAppCloudConnector {
  constructor(private creds: WhatsAppCloudCredentials) {}

  /**
   * Valida accessToken + phoneNumberId haciendo un GET de solo lectura al
   * recurso del número de teléfono en la Graph API. No envía ningún mensaje
   * ni genera coste.
   */
  async validateCredentials(): Promise<{ valid: boolean; message?: string }> {
    const { accessToken, phoneNumberId } = this.creds;

    if (!accessToken || accessToken.trim().length < 20) {
      return { valid: false, message: "Access Token inválido o demasiado corto" };
    }
    if (!phoneNumberId || !/^\d{6,}$/.test(phoneNumberId.trim())) {
      return { valid: false, message: "Phone Number ID inválido (debe ser numérico)" };
    }

    const url =
      `https://graph.facebook.com/${GRAPH_VERSION}/${encodeURIComponent(phoneNumberId.trim())}` +
      `?fields=display_phone_number,verified_name,quality_rating`;

    let res: Response;
    try {
      res = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken.trim()}` },
      });
    } catch (_e) {
      return { valid: false, message: "No se pudo contactar con la API de WhatsApp (Meta)" };
    }

    if (res.status === 401 || res.status === 403) {
      return { valid: false, message: "Access Token incorrecto o sin permisos sobre este número" };
    }
    if (res.status === 404) {
      return { valid: false, message: "Phone Number ID no encontrado para estas credenciales" };
    }
    if (!res.ok) {
      const body = await res.json().catch(() => ({})) as { error?: { message?: string } };
      const msg = body?.error?.message;
      return { valid: false, message: msg ? `Meta respondió: ${msg}` : `WhatsApp respondió ${res.status}` };
    }

    return { valid: true };
  }
}
