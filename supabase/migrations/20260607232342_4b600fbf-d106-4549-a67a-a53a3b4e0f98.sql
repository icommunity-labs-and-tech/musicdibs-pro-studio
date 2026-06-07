DELETE FROM public.provider_campaigns pc
USING public.provider_connections conn
WHERE pc.tenant_id = conn.tenant_id
  AND conn.status = 'connected'
  AND conn.provider_type IN ('mailerlite','resend')
  AND pc.provider_type <> conn.provider_type
  AND pc.provider_campaign_status <> 'sent';