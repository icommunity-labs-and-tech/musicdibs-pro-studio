// ============================================================================
// ExperienceService
//
// Owns the lifecycle of experience_pages from the authenticated app side
// (RLS scopes every read/write to the caller's tenant). The PUBLIC play page
// never uses this service — it calls the get_experience / increment_experience
// SECURITY DEFINER RPCs directly (see ExperiencePublicService).
// ============================================================================

import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import type {
  ExperienceBranding,
  ExperiencePage,
  ExperiencePublic,
  ExperienceStatField,
  ExperienceStatus,
} from "./types";

/** URL-safe random token used as the public /play/{token} slug. */
export function generateExperienceToken(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 20);
}

/** Build the shareable public URL for a token in the current environment. */
export function buildExperienceUrl(token: string): string {
  const origin =
    typeof window !== "undefined" && window.location?.origin
      ? window.location.origin
      : "https://enterprise.musicdibs.com";
  return `${origin}/play/${token}`;
}

export interface CreateExperienceInput {
  tenantId: string;
  campaignId: string;
  generationJobId?: string | null;
  audioAssetId?: string | null;
  lyricsAssetId?: string | null;
  coverAssetId?: string | null;
  title: string;
  branding?: ExperienceBranding;
}

function mapRow(row: Record<string, unknown>): ExperiencePage {
  const r = row as unknown as ExperiencePage;
  return {
    ...r,
    branding: (r.branding as ExperienceBranding) ?? {},
  };
}

export const ExperienceService = {
  /** Latest experience page for a campaign (one per campaign in Phase 1). */
  async getByCampaign(campaignId: string): Promise<ExperiencePage | null> {
    const { data, error } = await supabase
      .from("experience_pages")
      .select("*")
      .eq("campaign_id", campaignId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data ? mapRow(data) : null;
  },

  async create(input: CreateExperienceInput): Promise<ExperiencePage> {
    const { data, error } = await supabase
      .from("experience_pages")
      .insert({
        tenant_id: input.tenantId,
        campaign_id: input.campaignId,
        generation_job_id: input.generationJobId ?? null,
        audio_asset_id: input.audioAssetId ?? null,
        lyrics_asset_id: input.lyricsAssetId ?? null,
        cover_asset_id: input.coverAssetId ?? null,
        experience_token: generateExperienceToken(),
        title: input.title,
        status: "draft",
        branding: (input.branding ?? {}) as Record<string, unknown>,
      })
      .select("*")
      .single();
    if (error) throw error;
    return mapRow(data);
  },

  async updateBranding(
    id: string,
    branding: ExperienceBranding,
  ): Promise<ExperiencePage> {
    const { data, error } = await supabase
      .from("experience_pages")
      .update({ branding: branding as Record<string, unknown> })
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    return mapRow(data);
  },

  async setStatus(
    id: string,
    status: ExperienceStatus,
  ): Promise<ExperiencePage> {
    const { data, error } = await supabase
      .from("experience_pages")
      .update({ status })
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    return mapRow(data);
  },
};

// ── Public (anonymous) access — used by /play/{token} only ──────────────────
export const ExperiencePublicService = {
  /** Fetch a PUBLISHED experience by token. Returns null when not published. */
  async get(token: string): Promise<ExperiencePublic | null> {
    const { data, error } = await supabase.rpc("get_experience", {
      p_token: token,
    });
    if (error) throw error;
    return (data as unknown as ExperiencePublic | null) ?? null;
  },

  /** Best-effort counter bump. Never throws into the UI. */
  async track(token: string, field: ExperienceStatField): Promise<void> {
    const { error } = await supabase.rpc("increment_experience_stat", {
      p_token: token,
      p_field: field,
    });
    if (error) {
      // Analytics must never break playback.
      console.warn("experience track failed", field, error.message);
    }
  },
};
