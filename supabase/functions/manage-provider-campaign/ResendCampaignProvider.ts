// ============================================================================
// ResendCampaignProvider — REAL server-side campaign integration via Resend
// Broadcasts. Runs ONLY inside the edge function (service-role context). The
// frontend never talks to Resend directly and never sees the API key.
//
// In Resend, a "Broadcast" is the equivalent of a MailerLite campaign: an HTML
// email sent to an Audience. Merge tags (e.g. {{{FIRST_NAME|}}}) personalize at
// send time, and {{{RESEND_UNSUBSCRIBE_URL}}} renders the unsubscribe link.
//
// SCOPE: create / update / read-status / send broadcasts. Resend's API does not
// expose per-broadcast open/click stats, so reports return ok:false gracefully.
// ============================================================================

import type {
  CampaignProviderResult,
  CampaignReportsResult,
  CampaignStatus,
  DraftCampaignInput,
} from "./MailerLiteCampaignProvider.ts";

const RESEND_API = "https://api.resend.com";

interface ResendBroadcast {
  id?: string;
  name?: string;
  status?: string;
}

/** Map a Resend broadcast status to our local vocabulary. */
function mapStatus(raw: unknown): CampaignStatus {
  switch (String(raw ?? "").toLowerCase()) {
    case "draft":
      return "draft";
    case "scheduled":
    case "queued":
    case "sending":
      return "scheduled";
    case "sent":
      return "sent";
    default:
      return "archived";
  }
}

export class ResendCampaignProvider {
  readonly type = "resend" as const;

  constructor(private readonly apiKey: string) {}

  private headers() {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    };
  }

  private from(input: DraftCampaignInput): string {
    // Resend requires "Name <email@verified-domain>".
    const name = input.fromName.replace(/[<>]/g, "").trim();
    return name ? `${name} <${input.fromEmail}>` : input.fromEmail;
  }

  private buildBody(input: DraftCampaignInput) {
    const body: Record<string, unknown> = {
      audience_id: input.audience.externalId,
      from: this.from(input),
      subject: input.subject.slice(0, 255),
      name: input.name.slice(0, 255),
      html: input.html,
    };
    if (input.replyTo) body.reply_to = input.replyTo;
    return body;
  }

  /** Create a DRAFT broadcast. Never sends. */
  async createDraftCampaign(
    input: DraftCampaignInput,
  ): Promise<CampaignProviderResult> {
    const res = await fetch(`${RESEND_API}/broadcasts`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(this.buildBody(input)),
    });
    return this.toResult(res, "draft");
  }

  /** Update an existing DRAFT broadcast's content. */
  async updateDraftCampaign(
    campaignId: string,
    input: DraftCampaignInput,
  ): Promise<CampaignProviderResult> {
    // Resend PATCH does not accept audience_id changes — only content.
    const body: Record<string, unknown> = {
      from: this.from(input),
      subject: input.subject.slice(0, 255),
      name: input.name.slice(0, 255),
      html: input.html,
    };
    if (input.replyTo) body.reply_to = input.replyTo;

    const res = await fetch(`${RESEND_API}/broadcasts/${campaignId}`, {
      method: "PATCH",
      headers: this.headers(),
      body: JSON.stringify(body),
    });
    return this.toResult(res, "draft");
  }

  /** Read the current status of a broadcast. */
  async getCampaignStatus(campaignId: string): Promise<CampaignProviderResult> {
    const res = await fetch(`${RESEND_API}/broadcasts/${campaignId}`, {
      method: "GET",
      headers: this.headers(),
    });
    return this.toResult(res);
  }

  /** Send the broadcast immediately (Option A: Send Now from MEC). */
  async scheduleCampaign(campaignId: string): Promise<CampaignProviderResult> {
    const res = await fetch(`${RESEND_API}/broadcasts/${campaignId}/send`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({}),
    });
    return this.toResult(res, "sent");
  }

  /** Resend does not expose broadcast reports via API. */
  // deno-lint-ignore require-await
  async getCampaignReports(_campaignId: string): Promise<CampaignReportsResult> {
    return {
      ok: false,
      status: 501,
      error: "Resend no expone estadísticas de broadcasts por API.",
    };
  }

  private async toResult(
    res: Response,
    assumedStatus?: CampaignStatus,
  ): Promise<CampaignProviderResult> {
    if (!res.ok) {
      // Try to surface Resend's own error message (it's usually actionable,
      // e.g. "The X domain is not verified").
      const detail = (await res
        .json()
        .catch(() => null)) as { message?: string } | null;
      const resendMessage = detail?.message?.trim();

      let message: string;
      switch (res.status) {
        case 401:
          message = "La conexión con Resend no es válida. Revisa la API key.";
          break;
        case 403:
          // 403 is almost always an unverified sender domain, not a bad key.
          message =
            resendMessage ??
            "Resend rechazó el envío. Verifica que el dominio del remitente esté validado en https://resend.com/domains";
          break;
        case 404:
          message = "El broadcast no existe en Resend.";
          break;
        case 422:
          message =
            resendMessage ??
            "Resend rechazó los datos. Verifica el dominio de envío verificado y la audiencia.";
          break;
        case 429:
          message = "Resend está limitando las peticiones. Inténtalo más tarde.";
          break;
        default:
          message =
            resendMessage ?? `Resend respondió con un error (${res.status}).`;
      }
      return { ok: false, status: res.status, error: message };
    }

    // Resend returns the object at the top level (not wrapped in { data }).
    const data = (await res.json().catch(() => null)) as ResendBroadcast | null;
    if (!data?.id) {
      return {
        ok: false,
        status: res.status,
        error: "Respuesta inesperada de Resend.",
      };
    }
    return {
      ok: true,
      status: res.status,
      campaignId: String(data.id),
      campaignName: data.name ?? "",
      campaignStatus: data.status ? mapStatus(data.status) : assumedStatus ?? "draft",
    };
  }
}
