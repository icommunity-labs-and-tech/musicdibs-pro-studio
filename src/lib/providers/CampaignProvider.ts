// Campaign Provider Framework — contract for publishing draft campaigns to an
// external marketing platform (MailerLite, and future providers).
//
// IMPORTANT: MusicDibs is an AI Music Experience Layer, NOT an email sender.
// Providers may only create / update / read the status of DRAFT campaigns.
// Sending, scheduling and automation always stay in the customer's platform.
//
// All real provider calls run SERVER-SIDE (edge function
// `manage-provider-campaign`). This file defines the shared types and the
// interface; the browser never holds provider credentials.

import type { ProviderType } from "./ProviderConnector";

/** Local provider-campaign status vocabulary (Phase 2: status only). */
export type CampaignStatus = "draft" | "scheduled" | "sent" | "archived";

/** Audience target for a draft campaign. */
export interface CampaignAudience {
  /** Provider-side id (group id or segment id). */
  externalId: string;
  /** "list" maps to provider groups; "segment" maps to provider segments. */
  audienceType: "list" | "segment";
}

export interface DraftCampaignInput {
  experiencePageId: string;
  audience: CampaignAudience;
}

/** A stored mapping between an experience page and a provider draft campaign. */
export interface ProviderCampaign {
  id: string;
  tenant_id: string;
  experience_page_id: string;
  provider_type: ProviderType;
  provider_campaign_id: string;
  provider_campaign_name: string;
  provider_campaign_status: CampaignStatus;
  created_at: string;
  updated_at: string;
}

/**
 * Contract every campaign provider must implement. Phase 2 ships MailerLite.
 * `getCampaignStatus` (renamed from getCampaignStats) syncs STATUS only — no
 * metrics yet.
 */
export interface CampaignProvider {
  readonly type: ProviderType;
  createDraftCampaign(input: DraftCampaignInput): Promise<ProviderCampaign>;
  updateDraftCampaign(
    campaignRowId: string,
    input: DraftCampaignInput,
  ): Promise<ProviderCampaign>;
  getCampaignStatus(campaignRowId: string): Promise<ProviderCampaign>;
}

/** Best-effort deep link into the provider dashboard for a campaign. */
export function buildProviderCampaignUrl(
  providerType: ProviderType,
  providerCampaignId: string,
): string | null {
  switch (providerType) {
    case "mailerlite":
      return `https://dashboard.mailerlite.com/campaigns/${providerCampaignId}`;
    default:
      return null;
  }
}

export const CAMPAIGN_STATUS_LABELS: Record<CampaignStatus, string> = {
  draft: "Borrador",
  scheduled: "Programada",
  sent: "Enviada",
  archived: "Archivada",
};
