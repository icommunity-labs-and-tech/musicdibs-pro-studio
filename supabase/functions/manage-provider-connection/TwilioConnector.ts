// TwilioConnector — validación de credenciales para el canal WhatsApp/SMS.
//
// A diferencia de MailerLite/Resend, Twilio no tiene concepto de "audiencia"
// remota: las audiencias para WhatsApp/SMS son las contact_lists locales del
// tenant (filtradas a contactos con teléfono). La sincronización de
// "audiencias" para Twilio se resuelve consultando Supabase directamente
// desde index.ts (acción sync_audiences, rama "twilio") — esta clase se
// limita a validar credenciales contra la API de Twilio.

export interface TwilioCredentials {
  accountSid: string
  authToken: string
  whatsappFrom?: string // formato "whatsapp:+14155238886"
  smsFrom?: string      // formato "+34..."
}

// Twilio "magic" test numbers: con credenciales de Test Account o de cuenta
// real, un POST a Messages.json con estos From/To NO envía nada real ni
// genera coste — solo valida las credenciales y devuelve 201.
// https://www.twilio.com/docs/iam/test-credentials
const MAGIC_TEST_NUMBER = "+15005550006"

export class TwilioConnector {
  constructor(private creds: TwilioCredentials) {}

  /**
   * Valida accountSid + authToken haciendo un POST "fantasma" a Messages.json
   * con los números mágicos de prueba de Twilio (no envía nada real, no
   * genera coste, funciona con Test Credentials y con cuentas reales).
   */
  async validateCredentials(): Promise<{ valid: boolean; message?: string }> {
    const { accountSid, authToken } = this.creds

    if (!accountSid || !accountSid.startsWith("AC") || accountSid.length !== 34) {
      return { valid: false, message: "Account SID inválido (debe empezar por 'AC' y tener 34 caracteres)" }
    }
    if (!authToken || authToken.length < 30) {
      return { valid: false, message: "Auth Token inválido" }
    }

    const basicAuth = btoa(`${accountSid}:${authToken}`)
    const params = new URLSearchParams({
      From: MAGIC_TEST_NUMBER,
      To: MAGIC_TEST_NUMBER,
      Body: "MusicDibs connection check",
    })
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${basicAuth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    })

    if (res.status === 401) return { valid: false, message: "Account SID o Auth Token incorrectos" }
    if (!res.ok && res.status !== 400) return { valid: false, message: `Twilio respondió ${res.status}` }

    // 200/201 = credenciales válidas. 400 con magic numbers no debería ocurrir,
    // pero si Twilio cambia el comportamiento, lo tratamos como válido siempre
    // que NO sea 401/403 (error de auth).
    return { valid: true }
  }
}
