ALTER TABLE public.provider_audiences
  ADD CONSTRAINT provider_audiences_connection_external_unique
  UNIQUE (provider_connection_id, external_id);