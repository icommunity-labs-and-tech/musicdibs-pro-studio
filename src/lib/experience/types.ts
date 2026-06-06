// ============================================================================
// Music Experience — types (TASK 006, Phase 1).
//
// A generated song (Campaign → Generation Job → Audio/Lyrics Assets) can be
// published as a public Experience Page reachable at /play/{experience_token}.
// MusicDibs is the AI Music Experience Layer; the marketing platform stays the
// source of truth for contacts, lists and email delivery.
// ============================================================================

export type ExperienceStatus = "draft" | "published" | "archived";

/** Customer branding stored inside experience_pages.branding (jsonb). */
export interface ExperienceBranding {
  logo_url?: string | null;
  primary_color?: string | null;
  cta_text?: string | null;
  cta_url?: string | null;
}

/** A row of experience_pages (authenticated, tenant-scoped). */
export interface ExperiencePage {
  id: string;
  tenant_id: string;
  campaign_id: string;
  generation_job_id: string | null;
  experience_token: string;
  title: string;
  status: ExperienceStatus;
  audio_asset_id: string | null;
  lyrics_asset_id: string | null;
  cover_asset_id: string | null;
  branding: ExperienceBranding;
  /** Optional message shown to the recipient on the play page. */
  message_content: string | null;
  /** Configurable call-to-action button. */
  cta_title: string | null;
  cta_url: string | null;
  play_count: number;
  unique_visitors: number;
  completion_count: number;
  download_count: number;
  created_at: string;
  updated_at: string;
}

/** Public payload returned by the get_experience() RPC for /play/{token}. */
export interface ExperiencePublic {
  title: string;
  status: ExperienceStatus;
  branding: ExperienceBranding;
  audio_url: string | null;
  duration_seconds: number | null;
  cover_url: string | null;
  lyrics: string | null;
  play_count: number;
  unique_visitors: number;
  completion_count: number;
  download_count: number;
}

/** The four counters a public visitor can safely increment. */
export type ExperienceStatField =
  | "play_count"
  | "unique_visitors"
  | "completion_count"
  | "download_count";
