-- Deduplication table for Resend webhook events.
CREATE TABLE IF NOT EXISTS public.resend_webhook_events (
  id              uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  svix_id         text        NOT NULL UNIQUE,
  event_type      text        NOT NULL,
  broadcast_id    text,
  email_id        text,
  tenant_id       uuid        REFERENCES public.tenants(id) ON DELETE CASCADE,
  processed_at    timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS resend_webhook_events_email_type_idx
  ON public.resend_webhook_events (email_id, event_type)
  WHERE email_id IS NOT NULL
    AND event_type IN ('email.opened', 'email.clicked', 'email.unsubscribed', 'email.bounced');

CREATE INDEX IF NOT EXISTS resend_webhook_events_broadcast_idx
  ON public.resend_webhook_events (broadcast_id)
  WHERE broadcast_id IS NOT NULL;

ALTER TABLE public.resend_webhook_events ENABLE ROW LEVEL SECURITY;

-- Atomic increment RPC
CREATE OR REPLACE FUNCTION public.increment_campaign_stat(p_campaign_id uuid, p_column text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF p_column NOT IN ('emails_sent', 'emails_opened', 'emails_clicked', 'unsubscribes') THEN
    RAISE EXCEPTION 'Column not allowed: %', p_column;
  END IF;
  EXECUTE format(
    'UPDATE public.campaign_stats SET %I = COALESCE(%I, 0) + 1, updated_at = now() WHERE campaign_id = $1',
    p_column, p_column
  ) USING p_campaign_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_campaign_stat(uuid, text) TO service_role;
