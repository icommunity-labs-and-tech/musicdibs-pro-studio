// ============================================================================
// MailerLiteCampaignProvider — REAL server-side campaign integration.
//
// Runs ONLY inside the edge function (service-role context). The frontend never
// talks to MailerLite directly and never sees the API key.
//
// SCOPE: create / update / read-status / schedule / reports of campaigns.
// ============================================================================

const MAILERLITE_API = "https://connect.mailerlite.com/api";

/** Local provider-campaign status vocabulary. */
export type CampaignStatus = "draft" | "scheduled" | "sent" | "archived";

/** Audience target for a draft campaign. */
export interface CampaignAudience {
  externalId: string;
  /** "list" maps to MailerLite groups; "segment" maps to segments. */
  audienceType: "list" | "segment";
}

export interface DraftCampaignInput {
  name: string;
  subject: string;
  fromName: string;
  fromEmail: string;
  replyTo?: string | null;
  html: string;
  audience: CampaignAudience;
}

export interface CampaignProviderResult {
  ok: boolean;
  status: number;
  /** Provider campaign id when ok. */
  campaignId?: string;
  /** Provider campaign name when ok. */
  campaignName?: string;
  /** Mapped local status when ok. */
  campaignStatus?: CampaignStatus;
  /** Human-friendly error (already translated upstream when surfaced). */
  error?: string;
}

export interface CampaignReportsResult {
  ok: boolean;
  status: number;
  stats?: {
    sent: number;
    opens: number;
    clicks: number;
    unsubscribes: number;
  };
  error?: string;
}

/**
 * Maps a MailerLite raw status to our local vocabulary.
 *  - draft → draft
 *  - ready → scheduled (queued/ready to send)
 *  - sent  → sent
 *  - anything else → archived (best effort)
 */
function mapStatus(raw: unknown): CampaignStatus {
  switch (String(raw ?? "").toLowerCase()) {
    case "draft":
      return "draft";
    case "ready":
    case "scheduled":
      return "scheduled";
    case "sent":
      return "sent";
    default:
      return "archived";
  }
}

interface MailerLiteCampaignData {
  id?: string | number;
  name?: string;
  status?: string;
}

export class MailerLiteCampaignProvider {
  readonly type = "mailerlite" as const;

  constructor(private readonly apiKey: string) {}

  private headers() {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    };
  }

  /**
   * Build the MailerLite create/update payload.
   * Audience: list → groups[], segment → segments[]. (Per docs, if both are
   * sent only segments are used; we only ever send one.)
   */
  private buildBody(input: DraftCampaignInput, includeContent: boolean) {
    const email: Record<string, unknown> = {
      subject: input.subject.slice(0, 255),
      from_name: input.fromName.slice(0, 255),
      from: input.fromEmail,
    };
    if (input.replyTo) email.reply_to = input.replyTo;
    // content requires the customer's Advanced plan. When unavailable we retry
    // without it and MailerLite keeps an editable draft (default footer added).
    if (includeContent) email.content = input.html;

    const body: Record<string, unknown> = {
      name: input.name.slice(0, 255),
      type: "regular",
      emails: [email],
    };
    if (input.audience.audienceType === "segment") {
      body.segments = [input.audience.externalId];
    } else {
      body.groups = [input.audience.externalId];
    }
    return body;
  }

  /** Create a DRAFT campaign. Never schedules or sends. */
  async createDraftCampaign(
    input: DraftCampaignInput,
  ): Promise<CampaignProviderResult> {
    // First attempt with custom HTML content.
    let res = await fetch(`${MAILERLITE_API}/campaigns`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(this.buildBody(input, true)),
    });

    // Graceful degradation: custom HTML needs the Advanced plan. On a content
    // validation error, retry without content so the draft is still created.
    if (res.status === 422) {
      const retry = await fetch(`${MAILERLITE_API}/campaigns`, {
        method: "POST",
        headers: this.headers(),
        body: JSON.stringify(this.buildBody(input, false)),
      });
      if (retry.ok) res = retry;
    }

    return this.toResult(res);
  }

  /** Update an existing DRAFT campaign (re-inject subject/name/audience). */
  async updateDraftCampaign(
    campaignId: string,
    input: DraftCampaignInput,
  ): Promise<CampaignProviderResult> {
    let res = await fetch(`${MAILERLITE_API}/campaigns/${campaignId}`, {
      method: "PUT",
      headers: this.headers(),
      body: JSON.stringify(this.buildBody(input, true)),
    });
    if (res.status === 422) {
      const retry = await fetch(`${MAILERLITE_API}/campaigns/${campaignId}`, {
        method: "PUT",
        headers: this.headers(),
        body: JSON.stringify(this.buildBody(input, false)),
      });
      if (retry.ok) res = retry;
    }
    return this.toResult(res);
  }

  /**
   * Read the current status of a campaign.
   */
  async getCampaignStatus(campaignId: string): Promise<CampaignProviderResult> {
    const res = await fetch(`${MAILERLITE_API}/campaigns/${campaignId}`, {
      method: "GET",
      headers: this.headers(),
    });
    return this.toResult(res);
  }

  /**
   * Schedule a campaign for immediate delivery (Option A: Send Now from MEC).
   * Calls POST /campaigns/{id}/schedule with delivery="instant".
   */
  async scheduleCampaign(campaignId: string): Promise<CampaignProviderResult> {
    const res = await fetch(`${MAILERLITE_API}/campaigns/${campaignId}/schedule`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({ delivery: "instant" }),
    });
    return this.toResult(res);
  }

  /**
   * Fetch campaign delivery reports (opens, clicks, unsubscribes).
   * Only meaningful once the campaign has been sent.
   * Returns a typed stats object rather than the raw CampaignProviderResult
   * because the /reports endpoint does not return a campaign object.
   */
  async getCampaignReports(campaignId: string): Promise<CampaignReportsResult> {
    const res = await fetch(`${MAILERLITE_API}/campaigns/${campaignId}/reports`, {
      method: "GET",
      headers: this.headers(),
    });
    if (!res.ok) {
      return { ok: false, status: res.status, error: `MailerLite reports error ${res.status}` };
    }
    const data = await res.json().catch(() => null);
    const s = (data?.data?.stats ?? {}) as Record<string, number | undefined>;
    return {
      ok: true,
      status: res.status,
      stats: {
        sent:          s.sent                                     ?? 0,
        opens:         s.unique_opens_count  ?? s.opens_count     ?? 0,
        clicks:        s.unique_clicks_count ?? s.clicks_count    ?? 0,
        unsubscribes:  s.unsubscribes_count                       ?? 0,
      },
    };
  }

  private async toResult(res: Response): Promise<CampaignProviderResult> {
    if (!res.ok) {
      // Never surface the body verbatim (could echo credentials). Translate.
      let message: string;
      switch (res.status) {
        case 401:
        case 403:
          message = "La conexión con MailerLite no es válida. Revisa la API key.";
          break;
        case 404:
          message = "La campaña no existe en MailerLite.";
          break;
        case 422:
          message =
            "MailerLite rechazó los datos de la campaña. Verifica el remitente verificado y la audiencia.";
          break;
        case 429:
          message = "MailerLite está limitando las peticiones. Inténtalo más tarde.";
          break;
        default:
          message = `MailerLite respondió con un error (${res.status}).`;
      }
      return { ok: false, status: res.status, error: message };
    }

    const json = (await res.json().catch(() => null)) as
      | { data?: MailerLiteCampaignData }
      | null;
    const data = json?.data;
    if (!data?.id) {
      return {
        ok: false,
        status: res.status,
        error: "Respuesta inesperada de MailerLite.",
      };
    }
    return {
      ok: true,
      status: res.status,
      campaignId: String(data.id),
      campaignName: data.name ?? "",
      campaignStatus: mapStatus(data.status),
    };
  }
}
