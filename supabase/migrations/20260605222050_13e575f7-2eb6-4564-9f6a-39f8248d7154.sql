ALTER TABLE public.generation_jobs
  ADD COLUMN IF NOT EXISTS external_lyrics_task_id text,
  ADD COLUMN IF NOT EXISTS external_music_task_id text,
  ADD COLUMN IF NOT EXISTS lyrics_title text,
  ADD COLUMN IF NOT EXISTS selected_variant integer NOT NULL DEFAULT 0;

ALTER TABLE public.generation_assets
  ADD COLUMN IF NOT EXISTS external_asset_id text,
  ADD COLUMN IF NOT EXISTS duration_seconds numeric,
  ADD COLUMN IF NOT EXISTS provider_metadata jsonb;

CREATE INDEX IF NOT EXISTS idx_generation_jobs_lyrics_task
  ON public.generation_jobs (external_lyrics_task_id);
CREATE INDEX IF NOT EXISTS idx_generation_jobs_music_task
  ON public.generation_jobs (external_music_task_id);