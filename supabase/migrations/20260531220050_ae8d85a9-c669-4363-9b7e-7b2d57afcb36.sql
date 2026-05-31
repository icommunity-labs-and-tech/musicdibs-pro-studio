-- 1. tenant_settings: restrict to owner/admin (protects api_keys & integrations)
DROP POLICY IF EXISTS "tenant_settings: tenant members only" ON public.tenant_settings;
CREATE POLICY "tenant_settings_owner_admin"
ON public.tenant_settings
FOR ALL
USING (
  tenant_id = auth_tenant_id()
  AND EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = ANY (ARRAY['owner','admin']))
)
WITH CHECK (
  tenant_id = auth_tenant_id()
  AND EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = ANY (ARRAY['owner','admin']))
);

-- 2. tenant_webhooks: restrict to owner/admin (protects signing secret)
DROP POLICY IF EXISTS "tenant_manage_own_webhooks" ON public.tenant_webhooks;
CREATE POLICY "tenant_owner_admin_manage_webhooks"
ON public.tenant_webhooks
FOR ALL
USING (
  tenant_id IN (SELECT p.tenant_id FROM profiles p WHERE p.id = auth.uid() AND p.role = ANY (ARRAY['owner','admin']))
)
WITH CHECK (
  tenant_id IN (SELECT p.tenant_id FROM profiles p WHERE p.id = auth.uid() AND p.role = ANY (ARRAY['owner','admin']))
);

-- 3. profiles: prevent self privilege escalation (role / is_superadmin)
CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (NEW.is_superadmin IS DISTINCT FROM OLD.is_superadmin
      OR NEW.role IS DISTINCT FROM OLD.role)
     AND NOT public.is_superadmin() THEN
    RAISE EXCEPTION 'No puedes modificar tu rol o privilegios';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_profile_escalation ON public.profiles;
CREATE TRIGGER trg_prevent_profile_escalation
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.prevent_profile_privilege_escalation();

-- 4. platform_settings: superadmin read only
DROP POLICY IF EXISTS "platform_settings_read" ON public.platform_settings;
CREATE POLICY "platform_settings_superadmin_read"
ON public.platform_settings
FOR SELECT
TO authenticated
USING (is_superadmin());

-- 5. tenant_invitations: allow owner + admin
DROP POLICY IF EXISTS "admin_manage_invitations" ON public.tenant_invitations;
CREATE POLICY "owner_admin_manage_invitations"
ON public.tenant_invitations
FOR ALL
USING (
  tenant_id IN (SELECT p.tenant_id FROM profiles p WHERE p.id = auth.uid() AND p.role = ANY (ARRAY['owner','admin']))
);

-- 6. Security definer views -> security_invoker; add superadmin read on aggregated tables
ALTER VIEW public.tenant_monthly_usage SET (security_invoker = on);
ALTER VIEW public.tenant_churn_signals SET (security_invoker = on);
ALTER VIEW public.audit_log SET (security_invoker = on);

CREATE POLICY "superadmin_select_all_campaign_stats"
ON public.campaign_stats FOR SELECT USING (is_superadmin());

CREATE POLICY "superadmin_select_all_generation_jobs"
ON public.generation_jobs FOR SELECT USING (is_superadmin());

-- 7. Fix mutable search_path on all functions
ALTER FUNCTION public.audit_log_insert_redirect() SET search_path = public;
ALTER FUNCTION public.auth_tenant_id() SET search_path = public;
ALTER FUNCTION public.increment_campaign_stat(uuid, uuid, text) SET search_path = public;
ALTER FUNCTION public.is_superadmin() SET search_path = public;
ALTER FUNCTION public.is_tenant_admin() SET search_path = public;
ALTER FUNCTION public.reset_stuck_generation_jobs() SET search_path = public;
ALTER FUNCTION public.run_job_maintenance() SET search_path = public;
ALTER FUNCTION public.set_campaign_sent(uuid, uuid, integer) SET search_path = public;
ALTER FUNCTION public.set_updated_at() SET search_path = public;
ALTER FUNCTION public.sync_campaign_stats_cron() SET search_path = public;
ALTER FUNCTION public.trigger_queued_jobs() SET search_path = public;
ALTER FUNCTION public.update_contact_list_count() SET search_path = public;

-- 8. Revoke direct EXECUTE on internal maintenance / cron / audit helpers
REVOKE EXECUTE ON FUNCTION public.audit_log_insert_redirect() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.increment_campaign_stat(uuid, uuid, text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_audit_event(uuid, uuid, text, text, text, text, text, jsonb, jsonb, jsonb) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.reset_stuck_generation_jobs() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.run_job_maintenance() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_campaign_sent(uuid, uuid, integer) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_campaign_stats_cron() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trigger_queued_jobs() FROM anon, authenticated;