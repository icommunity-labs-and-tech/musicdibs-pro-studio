-- ============================================================================
-- TASK 006 (Phase 1) — Music Experience Pages
-- A generated song can be published as a public Experience Page at /play/{token}
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. experience_pages
-- ----------------------------------------------------------------------------
CREATE TABLE public.experience_pages (
  id                 uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id          uuid NOT NULL,
  campaign_id        uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  generation_job_id  uuid REFERENCES public.generation_jobs(id) ON DELETE SET NULL,
  experience_token   text NOT NULL UNIQUE,
  title              text NOT NULL DEFAULT 'Experiencia musical',
  status             text NOT NULL DEFAULT 'draft',
  audio_asset_id     uuid REFERENCES public.generation_assets(id) ON DELETE SET NULL,
  lyrics_asset_id    uuid REFERENCES public.generation_assets(id) ON DELETE SET NULL,
  cover_asset_id     uuid REFERENCES public.generation_assets(id) ON DELETE SET NULL,
  branding           jsonb NOT NULL DEFAULT '{}'::jsonb,
  play_count         integer NOT NULL DEFAULT 0,
  unique_visitors    integer NOT NULL DEFAULT 0,
  completion_count   integer NOT NULL DEFAULT 0,
  download_count     integer NOT NULL DEFAULT 0,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT experience_pages_status_check
    CHECK (status IN ('draft','published','archived'))
);

CREATE INDEX idx_experience_pages_tenant   ON public.experience_pages(tenant_id);
CREATE INDEX idx_experience_pages_campaign ON public.experience_pages(campaign_id);
CREATE UNIQUE INDEX idx_experience_pages_token ON public.experience_pages(experience_token);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.experience_pages TO authenticated;
GRANT ALL ON public.experience_pages TO service_role;

ALTER TABLE public.experience_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_members_manage_own_experience_pages"
  ON public.experience_pages FOR ALL
  USING (tenant_id = auth_tenant_id())
  WITH CHECK (tenant_id = auth_tenant_id());

CREATE POLICY "superadmin_all_experience_pages"
  ON public.experience_pages FOR ALL
  USING (is_superadmin());

CREATE TRIGGER set_experience_pages_updated_at
  BEFORE UPDATE ON public.experience_pages
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 2. get_experience(p_token) — public read of a PUBLISHED experience.
--    SECURITY DEFINER so anonymous visitors can render /play/{token} without
--    direct access to experience_pages / generation_assets.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_experience(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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

  -- Audio asset (public_url already stored, bucket is public)
  IF v_exp.audio_asset_id IS NOT NULL THEN
    SELECT * INTO v_audio FROM generation_assets WHERE id = v_exp.audio_asset_id;
  END IF;

  -- Lyrics asset
  IF v_exp.lyrics_asset_id IS NOT NULL THEN
    SELECT * INTO v_lyrics FROM generation_assets WHERE id = v_exp.lyrics_asset_id;
  END IF;

  -- Cover: explicit cover asset, else derive from the audio asset metadata.
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
$$;

-- ----------------------------------------------------------------------------
-- 3. increment_experience_stat(p_token, p_field) — safe public counter bump.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.increment_experience_stat(p_token text, p_field text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_field NOT IN ('play_count','unique_visitors','completion_count','download_count') THEN
    RAISE EXCEPTION 'Invalid field';
  END IF;

  EXECUTE format(
    'UPDATE experience_pages SET %I = %I + 1, updated_at = now()
       WHERE experience_token = $1 AND status = ''published''',
    p_field, p_field
  ) USING p_token;
END;
$$;

REVOKE ALL ON FUNCTION public.get_experience(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.increment_experience_stat(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_experience(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.increment_experience_stat(text, text) TO anon, authenticated, service_role;