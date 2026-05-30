# Plan — MusicDibs Enterprise (front nuevo en Lovable)

## Enfoque y reconciliación de stack

Reconstruimos la UX sobre el stack nativo de este proyecto (React 19 + **TanStack Start** + **TanStack Router** + **TanStack Query** + **shadcn/Radix** + Tailwind v4), reutilizando tu **Supabase de producción** tal cual: mismas tablas, RLS y Edge Functions. El backend **no se toca** — solo se invoca.

Matiz importante sobre `lovable_prompt.md`: ese prompt prohibía shadcn/Radix y cambiar fuentes porque describía tu repo Vite/React Router. Al reconstruir en el stack de Lovable, **sí** usamos los componentes de Lovable, pero los **tematizamos** con tu identidad de marca para que el resultado visual coincida con MusicDibs:

- **Colores** (tokens en `src/styles.css`, formato oklch): Gold `#C9973A`/`#8C5E0A`, Teal `#2BB5A0`/`#0D7A64`, neutros Sand/Night.
- **Tipografías**: Fraunces (display/headings), Syne (body), JetBrains Mono (code) — vía `@import` de Google Fonts.
- **Dark mode** nativo (clase `dark`), radios y bordes sutiles según tu sistema.

Producción en Vercel sigue intacta; trabajamos en paralelo hasta que decidas apuntar `enterprise.musicdibs.com` aquí.

## Modelo de datos y acceso (sin backend nuevo)

- Lectura/escritura con el **cliente browser** de Supabase (`@/integrations/supabase/client`) + TanStack Query. La RLS ya filtra por `tenant_id` (`auth_tenant_id()`), así que no replicamos lógica de seguridad en el front.
- Edge Functions vía `supabase.functions.invoke(...)`: `generate-campaign`, `send-campaign`, `sync-campaign-stats`, `impersonate-tenant`, `create-billing-session` (los webhooks no se invocan desde el front).
- Auth con **Supabase Auth**. Tras login se carga `profile` (join a `tenants`) y se expone en el contexto del router para los guards.
- Tablas reales confirmadas: `audit_logs` (no `audit_log`), `campaign_stats`, `campaigns`, `contacts`, `contact_lists`, `generation_jobs`, `notifications`, `platform_settings`, `profiles`, `tenant_api_keys`, `tenant_invitations`, `tenant_notes`, `tenant_settings`, `tenant_webhooks`, `tenants`, `webhook_deliveries`.

## Fase 0 — Fundaciones

1. **Design system**: tokens de color (Gold/Teal/Sand/Night) en `src/styles.css` light+dark, fuentes, radios/bordes. Toggle de dark mode.
2. **Contexto de auth en el router**: `createRootRouteWithContext` con `{ auth, queryClient }`; provider que escucha `onAuthStateChange`, carga `profile`+`tenant`, e invalida queries al cambiar sesión.
3. **Guards de ruta**: layout `_authenticated` (`beforeLoad` → redirect a `/login`) y `_authenticated/_admin` (check `is_superadmin`).
4. **App shell**: sidebar responsive (colapsable con overlay <768px y hamburguesa), topbar con notificaciones y menú de usuario. **Mobile-first desde el primer componente** (P0 integrado, no como fase aparte).
5. Componentes base reutilizables: `DataTable` (scroll horizontal con fade en bordes + primera columna sticky), `EmptyState`, `StatusBadge`, `PageHeader`, skeletons de carga.

## Fase 1 — Auth (puerta de entrada, rápida)

- `/login`, `/signup` (alta de tenant), `/onboarding` (versión simple: nombre de empresa + vertical), con redirect post-auth a `/dashboard`.
- Validación inline en blur (email, requeridos), estados de carga y errores visibles (toasts vía sonner). Copy en español (España).

## Fase 2 — App core (orden por valor, mobile-first)

1. **CampaignBuilder** (`/campaigns/new`) — pantalla crítica. Wizard de 5 pasos (Contexto → Música → Canal → Email → Revisión), step indicator por puntos en móvil, full-width por paso. En desktop: **panel de preview lateral en vivo** (nombre, lista, prompt IA, coste estimado, duración). Validación inline por campo, progreso "X/5", **autosave a localStorage** con banner "Tienes un borrador guardado". Al lanzar: inserta `campaign` + invoca `generate-campaign`.
2. **CampaignDetail** (`/campaigns/:id`) — resumen, **audio player**, stats (`campaign_stats`), botón de sync (`sync-campaign-stats`). Feedback de generación en tiempo real (P2): si `status` es `generating`, polling cada 5s con waveform animado + toast al pasar a `ready`. Incluye `/campaigns/:id/queue` (GenerationQueue) con barras de progreso por job.
3. **Campaigns** (`/campaigns`) — listado con filtros por estado, búsqueda, orden; empty state con CTA; badges de la máquina de estados (`draft → queued → generating → ready → sent → archived`).
4. **Dashboard** (`/dashboard`) — KPIs (campañas, contactos, equipo), actividad reciente, y widget de checklist de onboarding (P3: configurar mailing → importar contactos → crear campaña, anillo de progreso X/3).

## Fase 3 — Pantallas secundarias

- **Contacts** (`/contacts`): listas + contactos, alta manual e **import CSV** con preview y errores por fila.
- **Analytics** (`/analytics`): métricas agregadas (open/click, coste, destinatarios) con empty state.
- **Settings** (`/settings`): perfil del tenant, **API keys de mailing** (MailerLite/Brevo) con botón "Probar conexión", guardado en `tenant_settings`.
- **Team** (`/team`): invitaciones (`tenant_invitations`) y gestión de roles.
- **Developers** (`/developers`): `tenant_api_keys` y `tenant_webhooks` + `webhook_deliveries`.
- **AuditLog** (`/audit`): tabla de `audit_logs`.

## Fase 4 — Superadmin (interno, al final)

- **Admin** (`/admin`): pestañas Tenants / Platform Config / etc., health score, resaltado de churn.
- **AdminTenantDetail** (`/admin/tenants/:id`): vista 360 (campañas, jobs, listas, equipo), notas (`tenant_notes`), cambio de plan, **impersonar** (`impersonate-tenant`).

## Sección técnica

- Rutas TanStack file-based bajo `src/routes/`, con `_authenticated` y `_authenticated/_admin` como layouts; cada ruta pública define su `head()` (SEO) — la landing se hace al final.
- Datos: TanStack Query con `queryKey` por recurso+`tenant_id`; mutaciones que invalidan las keys afectadas. Reads con cliente browser (RLS); nada de service role en el front.
- `src/start.ts`: añadir `attachSupabaseAuth` a `functionMiddleware` solo si introducimos algún `createServerFn` con `requireSupabaseAuth` (de momento no es necesario para CRUD directo).
- Sin dependencias nuevas salvo justificación; reutilizamos shadcn, recharts (analytics), sonner (toasts), react-hook-form + zod (formularios).
- Cada pantalla: estados de carga (skeleton/spinner), empty states útiles y manejo de errores visible. Verificación en preview a 375px y desktop, light y dark.

## Qué NO se toca

- Ni Edge Functions, ni nombres de tablas/columnas, ni RLS, ni Stripe, ni la máquina de estados de campañas.
- Ni el repo/deploy de Vercel: este es un front nuevo independiente.

## Primer entregable

Fase 0 + Fase 1 (fundaciones, design system de marca, auth y app shell mobile-first) para validar look & feel y el flujo de entrada antes de atacar el CampaignBuilder.  
  
El plan es sólido en líneas generales. Aprobado con estos ajustes:   
(1) cambiar el orden del app core a Dashboard → Campaigns lista → CampaignDetail → CampaignBuilder;   
(2) antes de cualquier pantalla, configurar los design tokens en Tailwind y mostrarme un componente de validación en light/dark;   
(3) confirmar que usáis TanStack Start en modo SPA/CSR, no SSR, para mantener la compatibilidad con el flujo de Supabase Auth actual.  
  
Y antes de empezar añadir:   
(1) Edge Functions que faltan: `verify-sender-email` y `manage-api-keys`;   
(2) `tenant_settings` es una fila por tenant con JSONB `api_keys`, no filas múltiples;   
(3) `profiles.id = auth.users.id`, sin columna `user_id`;   
(4) añadir al modelo de datos las vistas `tenant_monthly_usage` y `tenant_churn_signals` para el panel de admin;   
(5) sustituir el polling de CampaignDetail por suscripción Realtime a `generation_jobs` (ya activado en producción). El `attachSupabaseAuth` en `start.ts` queda comentado hasta que haya algún `createServerFn`.   
  
Empezar por Fase 0. Y ten siempre en cuenta el documento lovable_landing_brief.md que te voy a adjuntar para entender el negocio y el contexto