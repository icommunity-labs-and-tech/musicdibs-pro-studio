-- Approved version reference on campaigns.
-- NOTE: asset ownership may move to the Experience layer in the future;
-- approved_asset_id lives on campaigns for now (TASK 006-C).
ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS approved_asset_id uuid NULL
    REFERENCES public.generation_assets(id) ON DELETE SET NULL;

-- Experience page configurable content + CTA (day one support).
ALTER TABLE public.experience_pages
  ADD COLUMN IF NOT EXISTS message_content text NULL,
  ADD COLUMN IF NOT EXISTS cta_title text NULL,
  ADD COLUMN IF NOT EXISTS cta_url text NULL;

-- Generation round tracking. Each review round is a full
-- Batch -> Job -> Assets chain; round 1 is the first generation.
ALTER TABLE public.generation_batches
  ADD COLUMN IF NOT EXISTS generation_round integer NOT NULL DEFAULT 1;

ALTER TABLE public.generation_jobs
  ADD COLUMN IF NOT EXISTS generation_round integer NOT NULL DEFAULT 1;

ALTER TABLE public.generation_assets
  ADD COLUMN IF NOT EXISTS generation_round integer NOT NULL DEFAULT 1;

-- Public reader: include message_content + CTA in the play-page payload.
CREATE OR REPLACE FUNCTION public.get_experience(p_token text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_exp        experience_pages%ROWTYPE;
  v_audio      generation_assets%ROWTYPE;
  v_lyrics     generation_assets%ROWTYPE;
  v_base_url   text;
  v_cover_url  text;
  v_cover_path text;
BEGIN
  SELECT * INTO v_exp
  FROM experience_pages
  WHERE experience_token = p_token
    AND status = 'published'
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF v_exp.audio_asset_id IS NOT NULL THEN
    SELECT * INTO v_audio FROM generation_assets WHERE id = v_exp.audio_asset_id;
  END IF;

  IF v_exp.lyrics_asset_id IS NOT NULL THEN
    SELECT * INTO v_lyrics FROM generation_assets WHERE id = v_exp.lyrics_asset_id;
  END IF;

  SELECT value INTO v_base_url FROM platform_settings WHERE key = 'supabase_url';
  IF v_exp.cover_asset_id IS NOT NULL THEN
    SELECT public_url INTO v_cover_url FROM generation_assets WHERE id = v_exp.cover_asset_id;
  END IF;
  IF v_cover_url IS NULL AND v_audio.metadata IS NOT NULL THEN
    v_cover_path := v_audio.metadata->>'cover_path';
    IF v_cover_path IS NOT NULL AND v_base_url IS NOT NULL THEN
      v_cover_url := v_base_url || '/storage/v1/object/public/campaign-audio/' || v_cover_path;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'title',            v_exp.title,
    'status',           v_exp.status,
    'branding',         v_exp.branding,
    'message_content',  v_exp.message_content,
    'cta_title',        v_exp.cta_title,
    'cta_url',          v_exp.cta_url,
    'audio_url',        v_audio.public_url,
    'duration_seconds', v_audio.duration_seconds,
    'cover_url',        v_cover_url,
    'lyrics',           v_lyrics.lyrics_content,
    'play_count',       v_exp.play_count,
    'unique_visitors',  v_exp.unique_visitors,
    'completion_count', v_exp.completion_count,
    'download_count',   v_exp.download_count
  );
END;
$function$;