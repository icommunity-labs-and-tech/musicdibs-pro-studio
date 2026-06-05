CREATE TABLE public.campaign_generation_configs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id uuid NOT NULL UNIQUE REFERENCES public.campaigns(id) ON DELETE CASCADE,
  generation_mode text NOT NULL CHECK (generation_mode IN ('single_song', 'personalized_song')),
  provider_connection_id uuid REFERENCES public.provider_connections(id) ON DELETE SET NULL,
  provider_audience_id uuid REFERENCES public.provider_audiences(id) ON DELETE SET NULL,
  lyrics_goal text,
  lyrics_prompt text,
  music_style text,
  voice_type text CHECK (voice_type IS NULL OR voice_type IN ('male', 'female', 'duet')),
  language text CHECK (language IS NULL OR language IN ('es', 'en', 'pt', 'fr')),
  mood text,
  include_first_name boolean NOT NULL DEFAULT false,
  estimated_credits integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaign_generation_configs TO authenticated;
GRANT ALL ON public.campaign_generation_configs TO service_role;

ALTER TABLE public.campaign_generation_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members can view their generation configs"
  ON public.campaign_generation_configs FOR SELECT
  TO authenticated
  USING (campaign_id IN (SELECT id FROM public.campaigns WHERE tenant_id = public.auth_tenant_id()));

CREATE POLICY "Tenant members can create their generation configs"
  ON public.campaign_generation_configs FOR INSERT
  TO authenticated
  WITH CHECK (campaign_id IN (SELECT id FROM public.campaigns WHERE tenant_id = public.auth_tenant_id()));

CREATE POLICY "Tenant members can update their generation configs"
  ON public.campaign_generation_configs FOR UPDATE
  TO authenticated
  USING (campaign_id IN (SELECT id FROM public.campaigns WHERE tenant_id = public.auth_tenant_id()))
  WITH CHECK (campaign_id IN (SELECT id FROM public.campaigns WHERE tenant_id = public.auth_tenant_id()));

CREATE POLICY "Tenant members can delete their generation configs"
  ON public.campaign_generation_configs FOR DELETE
  TO authenticated
  USING (campaign_id IN (SELECT id FROM public.campaigns WHERE tenant_id = public.auth_tenant_id()));

CREATE TRIGGER set_campaign_generation_configs_updated_at
  BEFORE UPDATE ON public.campaign_generation_configs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_cgc_campaign_id ON public.campaign_generation_configs(campaign_id);