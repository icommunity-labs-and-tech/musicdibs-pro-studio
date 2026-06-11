// SalesforceCRMConnector — sync de audiencias (Campaigns) y contactos desde
// Salesforce Sales Cloud, vía Client Credentials Flow (Connected App / External
// Client App con "Enable Client Credentials Flow").
//
// Salesforce NO es un canal de envío: es una FUENTE de audiencias. Las
// "audiencias" son objetos Campaign (Sales Cloud nativo, no requiere Marketing
// Cloud), y sus miembros (CampaignMember -> Contact) se importan a las tablas
// locales contact_lists/contacts, igual que las audiencias de Twilio/WhatsApp.
//
// Auth: OAuth2 Client Credentials — sin refresh token, se pide un access token
// nuevo en cada operación (TTL corto, ~2h, baja frecuencia de uso).

export interface SalesforceCRMCredentials {
  instanceUrl: string   // My Domain, ej. "https://mycompany.my.salesforce.com"
  clientId: string      // Consumer Key del Connected App
  clientSecret: string  // Consumer Secret del Connected App
  apiVersion?: string   // default "v61.0"
  campaignFilter?: string // SOQL WHERE adicional opcional para filtrar Campaigns
}

export interface SyncedCampaignAudience {
  external_id: string
  name: string
  contacts_count: number
  audience_type: "list"
}

export interface SalesforceContact {
  externalId: string
  firstName: string
  email: string
  phone: string
}

const DEFAULT_API_VERSION = "v61.0"
const MAX_CONTACTS_PER_CAMPAIGN = 5000

interface TokenResult {
  accessToken: string
  instanceUrl: string
}

export class SalesforceCRMConnector {
  constructor(private creds: SalesforceCRMCredentials) {}

  private apiVersion(): string {
    return this.creds.apiVersion?.trim() || DEFAULT_API_VERSION
  }

  /**
   * Solicita un access token vía Client Credentials Flow. Devuelve null si las
   * credenciales son inválidas o hay un error de red/transporte.
   */
  private async getToken(): Promise<TokenResult | null> {
    const base = this.creds.instanceUrl.replace(/\/+$/, "")
    const params = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: this.creds.clientId,
      client_secret: this.creds.clientSecret,
    })

    let res: Response
    try {
      res = await fetch(`${base}/services/oauth2/token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params,
      })
    } catch (_e) {
      return null
    }

    if (!res.ok) return null

    const body = await res.json().catch(() => null) as
      | { access_token?: string; instance_url?: string }
      | null
    if (!body?.access_token || !body?.instance_url) return null

    return { accessToken: body.access_token, instanceUrl: body.instance_url }
  }

  /**
   * Valida las credenciales con una llamada de solo lectura a /limits — no
   * expone datos de negocio, confirma auth + conectividad y permisos del
   * Connected App.
   */
  async validateCredentials(): Promise<{ valid: boolean; message?: string }> {
    const { instanceUrl, clientId, clientSecret } = this.creds

    if (!instanceUrl || !/^https:\/\/.+\.salesforce\.com\/?$/.test(instanceUrl.trim())) {
      return { valid: false, message: "My Domain URL inválida (debe ser https://...salesforce.com)" }
    }
    if (!clientId || clientId.trim().length < 10) {
      return { valid: false, message: "Consumer Key inválido" }
    }
    if (!clientSecret || clientSecret.trim().length < 10) {
      return { valid: false, message: "Consumer Secret inválido" }
    }

    const token = await this.getToken()
    if (!token) {
      return { valid: false, message: "No se pudo autenticar con Salesforce. Revisa My Domain URL, Consumer Key y Consumer Secret, y que el Connected App tenga habilitado el Client Credentials Flow." }
    }

    let res: Response
    try {
      res = await fetch(`${token.instanceUrl}/services/data/${this.apiVersion()}/limits`, {
        headers: { Authorization: `Bearer ${token.accessToken}` },
      })
    } catch (_e) {
      return { valid: false, message: "No se pudo contactar con la API de Salesforce" }
    }

    if (res.status === 401 || res.status === 403) {
      return { valid: false, message: "Token válido pero sin permisos suficientes. Revisa los scopes del Connected App (api) y el usuario 'Run As'." }
    }
    if (!res.ok) {
      return { valid: false, message: `Salesforce respondió ${res.status}` }
    }

    return { valid: true }
  }

  /**
   * SOQL helper con paginación automática vía nextRecordsUrl.
   */
  private async query(token: TokenResult, soql: string): Promise<Record<string, unknown>[]> {
    const records: Record<string, unknown>[] = []
    let url: string | null =
      `${token.instanceUrl}/services/data/${this.apiVersion()}/query?q=${encodeURIComponent(soql)}`

    while (url) {
      const res: Response = await fetch(url, {
        headers: { Authorization: `Bearer ${token.accessToken}` },
      })
      if (!res.ok) {
        const txt = await res.text().catch(() => "")
        throw new Error(`Salesforce SOQL error ${res.status}: ${txt.slice(0, 200)}`)
      }
      const body = await res.json() as {
        records?: Record<string, unknown>[]
        nextRecordsUrl?: string
        done?: boolean
      }
      records.push(...(body.records ?? []))
      url = !body.done && body.nextRecordsUrl
        ? `${token.instanceUrl}${body.nextRecordsUrl}`
        : null
    }
    return records
  }

  /**
   * Lista las Campaigns activas (audiencias) y cuenta sus miembros con
   * Email o Phone en el Contact asociado.
   */
  async syncCampaignAudiences(): Promise<SyncedCampaignAudience[]> {
    const token = await this.getToken()
    if (!token) throw new Error("No se pudo autenticar con Salesforce")

    const extraFilter = this.creds.campaignFilter?.trim()
    const where = extraFilter ? `IsActive = true AND (${extraFilter})` : "IsActive = true"

    const campaigns = await this.query(
      token,
      `SELECT Id, Name FROM Campaign WHERE ${where} ORDER BY Name LIMIT 200`,
    )

    const result: SyncedCampaignAudience[] = []
    for (const c of campaigns) {
      const campaignId = String(c.Id ?? "")
      if (!campaignId) continue

      const countRows = await this.query(
        token,
        `SELECT COUNT(Id) total FROM CampaignMember ` +
          `WHERE CampaignId = '${campaignId}' AND ContactId != null ` +
          `AND (Contact.Email != null OR Contact.Phone != null)`,
      )
      const count = Number((countRows[0] as { total?: number } | undefined)?.total ?? 0)

      result.push({
        external_id: campaignId,
        name: String(c.Name ?? "Campaign"),
        contacts_count: count,
        audience_type: "list",
      })
    }
    return result
  }

  /**
   * Trae los Contacts (con Email o Phone) miembros de una Campaign.
   */
  async fetchCampaignContacts(campaignId: string, limit = MAX_CONTACTS_PER_CAMPAIGN): Promise<SalesforceContact[]> {
    const token = await this.getToken()
    if (!token) throw new Error("No se pudo autenticar con Salesforce")

    const safeLimit = Math.min(limit, MAX_CONTACTS_PER_CAMPAIGN)

    const rows = await this.query(
      token,
      `SELECT ContactId, Contact.FirstName, Contact.Email, Contact.Phone ` +
        `FROM CampaignMember ` +
        `WHERE CampaignId = '${campaignId}' AND ContactId != null ` +
        `AND (Contact.Email != null OR Contact.Phone != null) ` +
        `LIMIT ${safeLimit}`,
    )

    return rows.map((r) => {
      const contact = (r.Contact ?? {}) as Record<string, unknown>
      return {
        externalId: String(r.ContactId ?? ""),
        firstName: String(contact.FirstName ?? "").trim() || "amigo",
        email: typeof contact.Email === "string" ? contact.Email : "",
        phone: typeof contact.Phone === "string" ? contact.Phone : "",
      }
    }).filter((c) => c.externalId && (c.email || c.phone))
  }
}
