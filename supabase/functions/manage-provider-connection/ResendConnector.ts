// ============================================================================
// Resend connector — REAL server-side integration.
//
// Runs ONLY inside the edge function (service-role context). The frontend never
// talks to Resend directly and never sees the API key.
//
// IMPORTANT: MusicDibs is NOT a CRM. We synchronize AUDIENCE METADATA ONLY
// (id, name, contact count). We NEVER fetch, store or log subscriber PII.
// In Resend, "Audiences" are the closest equivalent to lists and map to
// audience_type = "list".
// ============================================================================

const RESEND_API = "https://api.resend.com";

export type AudienceType = "list" | "segment" | "automation";

export interface SyncedAudience {
  external_id: string;
  name: string;
  contacts_count: number;
  audience_type: AudienceType;
}

export interface ValidationResult {
  valid: boolean;
  message?: string;
}

interface ResendAudience {
  id: string;
  name: string;
}

interface ResendListResponse<T> {
  data?: T[];
}

export class ResendConnector {
  readonly type = "resend" as const;

  constructor(private readonly apiKey: string) {}

  private async request<T>(
    path: string,
  ): Promise<{ ok: boolean; status: number; body: T | null }> {
    const res = await fetch(`${RESEND_API}${path}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    });
    if (!res.ok) {
      // Never surface the response body verbatim — status only.
      return { ok: false, status: res.status, body: null };
    }
    const body = (await res.json().catch(() => null)) as T | null;
    return { ok: true, status: res.status, body };
  }

  /** Lightweight check that the API key is accepted by Resend. */
  async validateCredentials(): Promise<ValidationResult> {
    const { ok, status } = await this.request("/audiences");
    if (ok) return { valid: true };
    if (status === 401 || status === 403) {
      return { valid: false, message: "API key de Resend inválida" };
    }
    return { valid: false, message: `Resend respondió con error ${status}` };
  }

  /** Number of contacts in a single Resend audience (metadata only). */
  async getAudienceSize(externalId: string): Promise<number> {
    const { ok, body } = await this.request<ResendListResponse<unknown>>(
      `/audiences/${externalId}/contacts`,
    );
    if (!ok || !Array.isArray(body?.data)) return 0;
    return body!.data!.length;
  }

  /**
   * Pull audience metadata from Resend. Each Resend Audience maps to a "list".
   * Contact counts are derived from the contacts endpoint (count only — no PII
   * is read into our database).
   */
  async syncAudiences(): Promise<SyncedAudience[]> {
    const { ok, body } = await this.request<ResendListResponse<ResendAudience>>(
      "/audiences",
    );
    if (!ok || !Array.isArray(body?.data)) return [];

    const audiences = body!.data!;
    return Promise.all(
      audiences.map(async (a) => ({
        external_id: String(a.id),
        name: a.name ?? "Audiencia",
        contacts_count: await this.getAudienceSize(String(a.id)),
        audience_type: "list" as const,
      })),
    );
  }
}
