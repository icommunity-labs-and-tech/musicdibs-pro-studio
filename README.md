# MusicDibs Enterprise — Pro Studio

Frontend: TanStack Start + shadcn/ui + Tailwind v4
Backend: Supabase (PostgreSQL, Edge Functions, Auth, Storage, RLS)

## Estructura
\\\
src/          Frontend (TanStack Start + React 19 + shadcn)
supabase/
  functions/  Edge Functions (Deno)
  migrations/ Migraciones SQL
docs/         Documentación funcional, business content, briefs
\\\

## Variables de entorno
Ver \.env.example\

## Backend (Supabase)
Proyecto: asolssebjyjyfbggraew (eu-west-1)
Edge Functions desplegadas: generate-campaign, send-campaign,
sync-campaign-stats, verify-sender-email, manage-api-keys,
impersonate-tenant, process-queued-jobs, webhook-dispatcher,
mailerlite-webhook, create-billing-session, stripe-webhook, api

## Producción
Frontend actual: enterprise.musicdibs.com (Vercel ? musicdibs-enterprise)
Frontend nuevo: este repo (Lovable ? Vercel, pendiente de switch de dominio)
