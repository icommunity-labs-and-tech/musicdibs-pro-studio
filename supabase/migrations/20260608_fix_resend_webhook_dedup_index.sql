-- Fix resend_webhook_events dedup index:
-- Replace email.unsubscribed (doesn't exist in Resend) with email.suppressed.
-- Also add email.complained to dedup (same recipient shouldn't count as multiple spam complaints).

-- Drop old index (safe — it may have been named differently depending on migration order)
DROP INDEX IF EXISTS public.resend_webhook_events_email_event_unique;
DROP INDEX IF EXISTS public.idx_resend_webhook_events_email_event;

-- Recreate with correct Resend event names
CREATE UNIQUE INDEX resend_webhook_events_email_event_unique
  ON public.resend_webhook_events (email_id, event_type)
  WHERE email_id IS NOT NULL
    AND event_type IN ('email.opened', 'email.clicked', 'email.suppressed', 'email.bounced', 'email.complained');

COMMENT ON INDEX public.resend_webhook_events_email_event_unique IS
  'Dedup layer 2: prevents counting the same per-recipient engagement event twice (e.g. opened on two devices). email.sent is deliberately excluded — each recipient fires their own unique sent event.';
