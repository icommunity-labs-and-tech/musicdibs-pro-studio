-- TASK 006-B: MailerLite draft campaign integration
-- 1) Tenant-level sender configuration (reused for all provider campaign drafts)
ALTER TABLE public.tenant_settings
  ADD COLUMN IF NOT EXISTS sender_name    text,
  ADD COLUMN IF NOT EXISTS sender_email   text,
  ADD COLUMN IF NOT EXISTS reply_to_email text;

-- 2) Provider campaigns: maps an Experience Page to a provider (MailerLite) draft campaign
CREATE TABLE IF NOT EXISTS public.provider_campaigns (
  id                       uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id                uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  experience_page_id       uuid NOT NULL REFERENCES public.experience_pages(id) ON DELETE CASCADE,
  provider_type            text NOT NULL DEFAULT 'mailerlite',
  provider_campaign_id     text NOT NULL,
  provider_campaign_name   text NOT NULL,
  provider_campaign_status text NOT NULL DEFAULT 'draft',
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_provider_campaigns_tenant
  ON public.provider_campaigns(tenant_id);
CREATE INDEX IF NOT EXISTS idx_provider_campaigns_experience
  ON public.provider_campaigns(experience_page_id);

-- Grants: authenticated members read their tenant rows; writes happen server-side (service role)
GRANT SELECT ON public.provider_campaigns TO authenticated;
GRANT ALL ON public.provider_campaigns TO service_role;

ALTER TABLE public.provider_campaigns ENABLE ROW LEVEL SECURITY;

-- Tenant members can view their own tenant's provider campaigns
CREATE POLICY "Tenant members can view provider campaigns"
  ON public.provider_campaigns
  FOR SELECT
  TO authenticated
  USING (tenant_id = public.auth_tenant_id());

-- updated_at maintenance
CREATE TRIGGER set_provider_campaigns_updated_at
  BEFORE UPDATE ON public.provider_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();