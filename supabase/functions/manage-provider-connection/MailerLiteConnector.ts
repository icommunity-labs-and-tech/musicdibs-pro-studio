// ============================================================================
// MailerLite connector — REAL server-side integration.
//
// Runs ONLY inside the edge function (service-role context). The frontend never
// talks to MailerLite directly and never sees the API key.
//
// IMPORTANT: MusicDibs is NOT a CRM. We synchronize AUDIENCE METADATA ONLY
// (id, name, subscriber count, type). We NEVER fetch, store or log any
// subscriber/PII data (email, name, phone, birthday, custom fields, tags...).
// The source of truth always stays in MailerLite.
// ============================================================================

const MAILERLITE_API = "https://connect.mailerlite.com/api";

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

interface MailerLiteListResponse<T> {
  data?: T[];
  meta?: { next_cursor?: string | null };
}

interface MailerLiteGroup {
  id: string;
  name: string;
  active_count?: number;
  total?: number;
}

interface MailerLiteSegment {
  id: string;
  name: string;
  total?: number;
  active_count?: number;
}

export class MailerLiteConnector {
  readonly type = "mailerlite" as const;

  constructor(private readonly apiKey: string) {}

  private async request<T>(path: string): Promise<{ ok: boolean; status: number; body: T | null }> {
    const res = await fetch(`${MAILERLITE_API}${path}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    });
    if (!res.ok) {
      // Never surface the response body verbatim (could echo the key) — status only.
      return { ok: false, status: res.status, body: null };
    }
    const body = (await res.json().catch(() => null)) as T | null;
    return { ok: true, status: res.status, body };
  }

  /** Lightweight check that the API key is accepted by MailerLite. */
  async validateCredentials(): Promise<ValidationResult> {
    const { ok, status } = await this.request("/groups?limit=1");
    if (ok) return { valid: true };
    if (status === 401 || status === 403) {
      return { valid: false, message: "API key de MailerLite inválida" };
    }
    return { valid: false, message: `MailerLite respondió con error ${status}` };
  }

  /** Subscriber count for a single group (metadata only). */
  async getAudienceSize(externalId: string): Promise<number> {
    const { ok, body } = await this.request<{ data?: MailerLiteGroup }>(
      `/groups/${externalId}`,
    );
    if (!ok || !body?.data) return 0;
    return body.data.active_count ?? body.data.total ?? 0;
  }

  /**
   * Pull audience metadata from MailerLite.
   *  - Groups   → audience_type = "list"
   *  - Segments → audience_type = "segment"
   *
   * RECOMMENDATION (not implemented): MailerLite also exposes "automations"
   * which could map to audience_type = "automation" for triggered/journey-based
   * campaigns. We deliberately do NOT sync them yet — out of scope for TASK 002.
   * Forms/landing-page audiences are NOT meaningful campaign targets and should
   * stay unmapped.
   */
  async syncAudiences(): Promise<SyncedAudience[]> {
    const [groups, segments] = await Promise.all([
      this.fetchGroups(),
      this.fetchSegments(),
    ]);
    return [...groups, ...segments];
  }

  private async fetchGroups(): Promise<SyncedAudience[]> {
    const { ok, body } = await this.request<MailerLiteListResponse<MailerLiteGroup>>(
      "/groups?limit=100",
    );
    if (!ok || !body?.data) return [];
    return body.data.map((g) => ({
      external_id: String(g.id),
      name: g.name,
      contacts_count: g.active_count ?? g.total ?? 0,
      audience_type: "list" as const,
    }));
  }

  private async fetchSegments(): Promise<SyncedAudience[]> {
    const { ok, body } = await this.request<MailerLiteListResponse<MailerLiteSegment>>(
      "/segments?limit=100",
    );
    if (!ok || !body?.data) return [];
    return body.data.map((s) => ({
      external_id: String(s.id),
      name: s.name,
      contacts_count: s.total ?? s.active_count ?? 0,
      audience_type: "segment" as const,
    }));
  }
}
