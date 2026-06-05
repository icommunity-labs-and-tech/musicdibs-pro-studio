SET session_replication_role = replica;
UPDATE public.profiles SET is_superadmin = true WHERE id = 'a1b2c3d4-0000-0000-0000-000000000002';
SET session_replication_role = origin;