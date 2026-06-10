-- 1) provider_connections: restrict SELECT to owner/admin (credentials exposure)
DROP POLICY IF EXISTS tenant_members_read_own_provider_connections ON public.provider_connections;
CREATE POLICY owner_admin_read_provider_connections
ON public.provider_connections
FOR SELECT
USING (
  tenant_id = auth_tenant_id()
  AND EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.role = ANY (ARRAY['owner'::text, 'admin'::text])
  )
);

-- 2) tenant_api_keys: restrict management to owner/admin (privilege escalation)
DROP POLICY IF EXISTS tenant_members_manage_own_api_keys ON public.tenant_api_keys;
CREATE POLICY owner_admin_manage_api_keys
ON public.tenant_api_keys
FOR ALL
USING (
  tenant_id = auth_tenant_id()
  AND EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.role = ANY (ARRAY['owner'::text, 'admin'::text])
  )
)
WITH CHECK (
  tenant_id = auth_tenant_id()
  AND EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.role = ANY (ARRAY['owner'::text, 'admin'::text])
  )
);

-- 3) avatars bucket: allow users to DELETE their own tenant's files
CREATE POLICY avatars_delete
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = (
    SELECT profiles.tenant_id::text
    FROM profiles
    WHERE profiles.id = auth.uid()
  )
);

-- 4) campaign-audio bucket: remove the unrestricted public INSERT policy and
-- replace it with an authenticated, tenant-scoped one. Service-role uploads
-- from edge functions bypass RLS and are unaffected.
DROP POLICY IF EXISTS "Service role can upload campaign audio" ON storage.objects;
CREATE POLICY "Authenticated tenant members can upload campaign audio"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'campaign-audio'
  AND (storage.foldername(name))[1] = (
    SELECT profiles.tenant_id::text
    FROM profiles
    WHERE profiles.id = auth.uid()
  )
);

-- 5) resend_webhook_events: add a superadmin-only SELECT policy
CREATE POLICY superadmin_read_resend_webhook_events
ON public.resend_webhook_events
FOR SELECT
USING (is_superadmin());

-- 6) Fix mutable search_path on the 2-arg increment_campaign_stat overload
ALTER FUNCTION public.increment_campaign_stat(uuid, text) SET search_path = public;