-- Provider Framework: connections to external marketing platforms
CREATE TABLE public.provider_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  provider_type text NOT NULL,
  status text NOT NULL DEFAULT 'disconnected',
  encrypted_credentials jsonb,
  last_sync_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT provider_connections_provider_type_check
    CHECK (provider_type IN ('mailerlite', 'brevo')),
  CONSTRAINT provider_connections_status_check
    CHECK (status IN ('disconnected', 'connected', 'error')),
  CONSTRAINT provider_connections_tenant_provider_unique
    UNIQUE (tenant_id, provider_type)
);

CREATE INDEX idx_provider_connections_tenant_id ON public.provider_connections (tenant_id);
CREATE INDEX idx_provider_connections_provider_type ON public.provider_connections (provider_type);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.provider_connections TO authenticated;
GRANT ALL ON public.provider_connections TO service_role;

ALTER TABLE public.provider_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_members_manage_own_provider_connections"
  ON public.provider_connections FOR ALL
  USING (tenant_id = auth_tenant_id())
  WITH CHECK (tenant_id = auth_tenant_id());

CREATE POLICY "superadmin_all_provider_connections"
  ON public.provider_connections FOR ALL
  USING (is_superadmin());

CREATE TRIGGER set_provider_connections_updated_at
  BEFORE UPDATE ON public.provider_connections
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Provider Framework: metadata-only audiences synced from providers
CREATE TABLE public.provider_audiences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  provider_connection_id uuid NOT NULL REFERENCES public.provider_connections(id) ON DELETE CASCADE,
  external_id text NOT NULL,
  name text NOT NULL,
  audience_type text NOT NULL,
  contacts_count integer NOT NULL DEFAULT 0,
  last_sync_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT provider_audiences_audience_type_check
    CHECK (audience_type IN ('list', 'segment', 'automation'))
);

CREATE INDEX idx_provider_audiences_tenant_id ON public.provider_audiences (tenant_id);
CREATE INDEX idx_provider_audiences_provider_connection_id ON public.provider_audiences (provider_connection_id);
CREATE INDEX idx_provider_audiences_external_id ON public.provider_audiences (external_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.provider_audiences TO authenticated;
GRANT ALL ON public.provider_audiences TO service_role;

ALTER TABLE public.provider_audiences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_members_manage_own_provider_audiences"
  ON public.provider_audiences FOR ALL
  USING (tenant_id = auth_tenant_id())
  WITH CHECK (tenant_id = auth_tenant_id());

CREATE POLICY "superadmin_all_provider_audiences"
  ON public.provider_audiences FOR ALL
  USING (is_superadmin());