-- TASK 001-B: Secure provider credentials.
-- Credentials must never be written or read by the frontend. All writes go
-- through the manage-provider-connection edge function (service_role).

-- 1. Replace the over-broad FOR ALL tenant policy with SELECT-only.
DROP POLICY IF EXISTS "tenant_members_manage_own_provider_connections" ON public.provider_connections;

CREATE POLICY "tenant_members_read_own_provider_connections"
  ON public.provider_connections FOR SELECT
  USING (tenant_id = auth_tenant_id());

-- 2. Revoke all client-side write access; service_role (edge function) handles writes.
REVOKE INSERT, UPDATE, DELETE ON public.provider_connections FROM authenticated;

-- 3. Column-level read access: tenant users may read status/metadata only,
--    NEVER the encrypted_credentials column.
REVOKE SELECT ON public.provider_connections FROM authenticated;
GRANT SELECT (
  id, tenant_id, provider_type, status, last_sync_at, created_at, updated_at
) ON public.provider_connections TO authenticated;

-- service_role retains full access for the edge function.
GRANT ALL ON public.provider_connections TO service_role;