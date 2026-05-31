CREATE POLICY "tenant_owner_admin_update_own_tenant"
ON public.tenants
FOR UPDATE
TO authenticated
USING (
  id = public.auth_tenant_id()
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role IN ('owner', 'admin')
  )
)
WITH CHECK (
  id = public.auth_tenant_id()
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role IN ('owner', 'admin')
  )
);