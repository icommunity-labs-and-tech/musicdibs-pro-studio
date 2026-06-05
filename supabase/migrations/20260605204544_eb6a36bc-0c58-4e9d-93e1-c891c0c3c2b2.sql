-- ============================================================================
-- TASK 004 — AI Music Studio Generation Architecture (architecture only)
-- Campaign -> Generation Batch -> Generation Jobs -> Generation Assets
-- No generation logic, no external AI calls, no queue execution here.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. generation_batches
-- ----------------------------------------------------------------------------
CREATE TABLE public.generation_batches (
  id                uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id         uuid NOT NULL,
  campaign_id       uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  status            text NOT NULL DEFAULT 'draft',
  generation_mode   text NOT NULL,
  total_jobs        integer NOT NULL DEFAULT 0,
  completed_jobs    integer NOT NULL DEFAULT 0,
  failed_jobs       integer NOT NULL DEFAULT 0,
  credits_reserved  integer NOT NULL DEFAULT 0,
  credits_consumed  integer NOT NULL DEFAULT 0,
  started_at        timestamptz,
  completed_at      timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT generation_batches_status_check
    CHECK (status IN ('draft','queued','processing','completed','failed')),
  CONSTRAINT generation_batches_mode_check
    CHECK (generation_mode IN ('single_song','personalized_song'))
);

CREATE INDEX idx_generation_batches_tenant   ON public.generation_batches(tenant_id);
CREATE INDEX idx_generation_batches_campaign ON public.generation_batches(campaign_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.generation_batches TO authenticated;
GRANT ALL ON public.generation_batches TO service_role;

ALTER TABLE public.generation_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_members_manage_own_generation_batches"
  ON public.generation_batches FOR ALL
  USING (tenant_id = auth_tenant_id())
  WITH CHECK (tenant_id = auth_tenant_id());

CREATE POLICY "superadmin_all_generation_batches"
  ON public.generation_batches FOR ALL
  USING (is_superadmin());

CREATE TRIGGER set_generation_batches_updated_at
  BEFORE UPDATE ON public.generation_batches
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 2. generation_jobs (additive refactor — preserve existing rows + edge fns)
-- ----------------------------------------------------------------------------
ALTER TABLE public.generation_jobs
  ADD COLUMN IF NOT EXISTS generation_batch_id uuid
    REFERENCES public.generation_batches(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS external_contact_id text,
  ADD COLUMN IF NOT EXISTS lyrics_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS music_status  text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.generation_jobs
  DROP CONSTRAINT IF EXISTS generation_jobs_lyrics_status_check,
  ADD  CONSTRAINT generation_jobs_lyrics_status_check
    CHECK (lyrics_status IN ('pending','processing','completed','failed'));

ALTER TABLE public.generation_jobs
  DROP CONSTRAINT IF EXISTS generation_jobs_music_status_check,
  ADD  CONSTRAINT generation_jobs_music_status_check
    CHECK (music_status IN ('pending','processing','completed','failed'));

CREATE INDEX IF NOT EXISTS idx_generation_jobs_batch
  ON public.generation_jobs(generation_batch_id);

DROP TRIGGER IF EXISTS set_generation_jobs_updated_at ON public.generation_jobs;
CREATE TRIGGER set_generation_jobs_updated_at
  BEFORE UPDATE ON public.generation_jobs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 3. generation_assets
-- ----------------------------------------------------------------------------
CREATE TABLE public.generation_assets (
  id                 uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id          uuid NOT NULL,
  generation_job_id  uuid NOT NULL REFERENCES public.generation_jobs(id) ON DELETE CASCADE,
  campaign_id        uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  asset_type         text NOT NULL,
  status             text NOT NULL DEFAULT 'pending',
  storage_path       text,
  public_url         text,
  lyrics_content     text,
  metadata           jsonb,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT generation_assets_type_check
    CHECK (asset_type IN ('lyrics','audio','cover')),
  CONSTRAINT generation_assets_status_check
    CHECK (status IN ('pending','ready','failed'))
);

CREATE INDEX idx_generation_assets_tenant ON public.generation_assets(tenant_id);
CREATE INDEX idx_generation_assets_job    ON public.generation_assets(generation_job_id);
CREATE INDEX idx_generation_assets_campaign ON public.generation_assets(campaign_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.generation_assets TO authenticated;
GRANT ALL ON public.generation_assets TO service_role;

ALTER TABLE public.generation_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_members_manage_own_generation_assets"
  ON public.generation_assets FOR ALL
  USING (tenant_id = auth_tenant_id())
  WITH CHECK (tenant_id = auth_tenant_id());

CREATE POLICY "superadmin_all_generation_assets"
  ON public.generation_assets FOR ALL
  USING (is_superadmin());

CREATE TRIGGER set_generation_assets_updated_at
  BEFORE UPDATE ON public.generation_assets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
