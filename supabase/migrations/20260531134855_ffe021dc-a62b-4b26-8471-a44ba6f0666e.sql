DO $$
DECLARE
  v_tenant uuid := 'a1b2c3d4-0000-0000-0000-000000000001';
  v_user   uuid := 'a1b2c3d4-0000-0000-0000-000000000002';
  v_email  text := 'demo@musicdibs.com';
  v_wh1    uuid;
  v_wh2    uuid;
BEGIN
  -- ============ TEAM: invitaciones ============
  INSERT INTO tenant_invitations (tenant_id, email, role, status, invited_by, created_at, expires_at)
  VALUES
    (v_tenant, 'laura.gomez@segurosdemo.es',  'admin',  'pending',  v_user, now() - interval '2 days', now() + interval '5 days'),
    (v_tenant, 'carlos.ruiz@segurosdemo.es',  'member', 'pending',  v_user, now() - interval '1 day',  now() + interval '6 days'),
    (v_tenant, 'marta.sanz@segurosdemo.es',   'member', 'accepted', v_user, now() - interval '10 days', now() - interval '3 days');

  -- ============ DEVELOPERS: API keys ============
  INSERT INTO tenant_api_keys (tenant_id, name, key_prefix, key_hash, created_by, created_at, last_used_at)
  VALUES
    (v_tenant, 'Producción',  'mdibs_live_a1b2', encode(digest('demo-prod-key-001','sha256'),'hex'), v_user, now() - interval '20 days', now() - interval '1 hour'),
    (v_tenant, 'Integración CRM', 'mdibs_live_c3d4', encode(digest('demo-crm-key-002','sha256'),'hex'), v_user, now() - interval '8 days', now() - interval '2 days');

  -- ============ DEVELOPERS: webhooks ============
  INSERT INTO tenant_webhooks (tenant_id, name, url, secret, events, active, created_by, created_at)
  VALUES
    (v_tenant, 'Notificaciones Slack', 'https://hooks.segurosdemo.es/slack',
     encode(gen_random_bytes(16),'hex'), ARRAY['campaign.sent','campaign.completed'], true, v_user, now() - interval '15 days')
    RETURNING id INTO v_wh1;

  INSERT INTO tenant_webhooks (tenant_id, name, url, secret, events, active, created_by, created_at)
  VALUES
    (v_tenant, 'Sincronización CRM', 'https://api.segurosdemo.es/webhooks/crm',
     encode(gen_random_bytes(16),'hex'), ARRAY['contact.created','contact.unsubscribed'], false, v_user, now() - interval '5 days')
    RETURNING id INTO v_wh2;

  -- ============ WEBHOOK DELIVERIES (historial) ============
  INSERT INTO webhook_deliveries (tenant_id, webhook_id, event, payload, success, status_code, duration_ms, attempt, delivered_at)
  VALUES
    (v_tenant, v_wh1, 'campaign.sent',      '{"campaign":"Renovación pólizas Q2"}'::jsonb, true,  200, 142, 1, now() - interval '3 days'),
    (v_tenant, v_wh1, 'campaign.completed', '{"campaign":"Renovación pólizas Q2"}'::jsonb, true,  200, 98,  1, now() - interval '2 days'),
    (v_tenant, v_wh1, 'campaign.sent',      '{"campaign":"Bienvenida nuevos clientes"}'::jsonb, false, 503, 5012, 3, now() - interval '1 day');

  -- ============ AUDIT LOG: eventos manuales extra ============
  PERFORM log_audit_event(v_tenant, v_user, v_email, 'login',  'session',  v_user::text, v_email, NULL, NULL, '{"ip":"81.32.11.4","ua":"Chrome/124"}'::jsonb);
  PERFORM log_audit_event(v_tenant, v_user, v_email, 'update', 'settings', v_tenant::text, 'Configuración del tenant', '{"support_email":null}'::jsonb, '{"support_email":"soporte@segurosdemo.es"}'::jsonb, NULL);
  PERFORM log_audit_event(v_tenant, v_user, v_email, 'create', 'contact_list', gen_random_uuid()::text, 'Clientes Premium', NULL, '{"name":"Clientes Premium"}'::jsonb, NULL);
  PERFORM log_audit_event(v_tenant, v_user, v_email, 'send',   'campaign', gen_random_uuid()::text, 'Renovación pólizas Q2', NULL, '{"status":"sent","emails":1240}'::jsonb, NULL);
END $$;