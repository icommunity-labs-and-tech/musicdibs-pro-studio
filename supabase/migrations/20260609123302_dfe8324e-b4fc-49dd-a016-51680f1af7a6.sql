CREATE OR REPLACE VIEW public.tenant_suno_usage
WITH (security_invoker = true) AS
SELECT
  t.id   AS tenant_id,
  t.name AS tenant_name,
  t.plan AS plan,
  count(j.id) FILTER (WHERE j.external_lyrics_task_id IS NOT NULL) AS lyrics_ops_total,
  count(j.id) FILTER (WHERE j.external_music_task_id  IS NOT NULL) AS music_ops_total,
  count(j.id) FILTER (
    WHERE j.external_lyrics_task_id IS NOT NULL
      AND date_trunc('month', j.created_at) = date_trunc('month', now())
  ) AS lyrics_ops_month,
  count(j.id) FILTER (
    WHERE j.external_music_task_id IS NOT NULL
      AND date_trunc('month', j.created_at) = date_trunc('month', now())
  ) AS music_ops_month
FROM public.tenants t
LEFT JOIN public.generation_jobs j ON j.tenant_id = t.id
GROUP BY t.id, t.name, t.plan;

GRANT SELECT ON public.tenant_suno_usage TO authenticated;
GRANT SELECT ON public.tenant_suno_usage TO service_role;