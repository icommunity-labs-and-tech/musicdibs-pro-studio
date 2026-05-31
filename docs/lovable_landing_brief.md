# MusicDibs Enterprise — Landing Page Redesign Brief for Lovable

**Objetivo:** Convertir la landing de MVP tecnológico a landing comercial B2B orientada a conversión.
**Audiencias primarias:** CMO de empresa mediana en seguros, banca, retail, inmobiliaria, turismo + Director de agencia de marketing digital.
**Métrica de éxito:** Demo request / Partner inquiry. No signup directo.

---

## Contexto de negocio

MusicDibs Enterprise no es un ESP (no compite con MailerLite ni Brevo). Es una capa de diferenciación que se añade encima del stack de email marketing existente. El producto genera canciones originales por IA para cada campaña y las integra en el email como CTA a landing con audio player o como attachment. El cliente mantiene su proveedor de mailing actual.

**Objeción #1 que debe responder la landing antes de que la hagan:**
> "¿El audio se reproduce en el email o el cliente tiene que hacer clic?"

La respuesta correcta: el email contiene un botón/imagen que lleva a una micro-landing con el audio player. No inline en el email (no funciona en Gmail/Outlook). Esto debe quedar claro en el "how it works".

**Objeción #2:**
> "¿Esto encaja con nuestra imagen de marca corporativa?"

La respuesta: el tono, estilo musical y guidelines de marca se configuran en el onboarding. No suena a TikTok si no quieres que suene a TikTok.

---

## Arquitectura de la página (en este orden exacto)

### 1. NAV
- Logo MusicDibs Enterprise (izquierda)
- Links: Cómo funciona · Resultados · Industrias · Partners · Precios
- CTA primario: "Escuchar ejemplos" (abre modal con audio player)
- CTA secundario: "Solicitar demo" (formulario)

---

### 2. HERO

**Headline principal:**
> Tus emails van a ser recordados

**Subheadline:**
> La primera plataforma que genera música personalizada para cada campaña en segundos. Más apertura. Más emoción. Más conversión.

**Micro-copy debajo del subtítulo (una línea, pequeño):**
> Cada campaña genera una pieza musical única adaptada a tu sector, segmento y objetivo.

**CTAs del hero:**
- Primario (prominente, gold): **▶ Escuchar un ejemplo** → abre el Audio Demo Modal (ver sección 3)
- Secundario (outline): **Solicitar demo** → scroll a formulario

**Visual del hero:**
NO un mockup de dashboard. En cambio: una visualización de onda de audio + notas musicales sutiles con el logo en el centro. Minimalista. O una animación de waveform que "suena" visualmente.

**Strip de credibilidad debajo del hero (antes del fold):**
> Integrado con:
> [Logo MailerLite] [Logo Brevo] [Logo HubSpot] [Logo Salesforce] [Logo KIE.ai]
> "Tu stack no cambia. Añades diferenciación."

---

### 3. AUDIO DEMO MODAL

Este es el elemento más importante de conversión. Se activa desde el CTA "Escuchar un ejemplo" del hero y del nav.

**Título del modal:**
> Escucha lo que tus clientes van a sentir

**Contenido: 4 cards de audio, una por industria**

Cada card tiene:
- Icono de sector
- Nombre del caso de uso
- Descripción de 1 línea del objetivo de la campaña
- Player de audio (30-45 segundos)
- Resultado estimado en badge pequeño

```
┌─────────────────────────────────────────────────────────┐
│  🏦  Banca Premium                                       │
│  Campaña de fidelización clientes Private Banking        │
│  ▶ ────────────────────────── 0:32                      │
│                                   [+41% open rate]       │
├─────────────────────────────────────────────────────────┤
│  🛡️  Seguros                                            │
│  Renovación de póliza de hogar, segmento 45-65 años     │
│  ▶ ────────────────────────── 0:28                      │
│                                   [+38% open rate]       │
├─────────────────────────────────────────────────────────┤
│  🛍️  Retail                                             │
│  Black Friday — captación urgencia y descuento          │
│  ▶ ────────────────────────── 0:35                      │
│                                   [+52% CTR vs baseline] │
├─────────────────────────────────────────────────────────┤
│  🏠  Inmobiliaria                                        │
│  Lanzamiento nueva promoción residencial premium        │
│  ▶ ────────────────────────── 0:30                      │
│                                   [+29% conversión]      │
└─────────────────────────────────────────────────────────┘
```

CTA al final del modal: **"Generar un audio para mi sector → Solicitar demo"**

**Nota técnica para Lovable:** Los audios son archivos .mp3 alojados en Supabase Storage (bucket `campaign-audio`). La URL base es `https://asolssebjyjyfbggraew.supabase.co/storage/v1/object/public/campaign-audio/`. De momento usar placeholders con cualquier audio de 30s para el diseño.

---

### 4. HOW IT WORKS — Flujo visual

**Título:** Cómo funciona

**Subtítulo:** De la idea a la campaña en 4 pasos

Cuatro columnas (desktop) / cards verticales (mobile):

```
[1] Brief                    [2] Generación             [3] Envío                 [4] Resultados
───────────────────          ───────────────────         ───────────────────       ───────────────────
Defines el objetivo,         La IA genera una            Se integra con tu         Open rate, CTR y
sector y segmento.           pieza musical única         proveedor de email        conversión en
Tú controlas el              en menos de                 actual (MailerLite,       tiempo real en
tono y el estilo.            90 segundos.                Brevo, HubSpot).          tu dashboard.

[Icono brief/doc]            [Icono música/waveform]     [Icono email/send]        [Icono gráfica]
```

Debajo de cada paso, una línea en gris muy pequeña:
1. "Wizard guiado. Sin conocimientos técnicos necesarios."
2. "Modelo V5 de KIE.ai. Calidad profesional."
3. "Sin cambiar tu stack. Tu proveedor, tus listas."
4. "Sincronización automática cada hora."

---

### 5. RESULTADOS POR INDUSTRIA

**Título:** Lo que consiguen nuestros clientes

**Subtítulo:** Datos reales de pilotos y primeros clientes. Comparativa contra benchmarks del sector.

4 tabs o cards expandibles, una por industria:

**Seguros**
```
Open rate con MusicDibs:     61%    vs    22% media del sector
CTR:                         14%    vs     4% media del sector
Bajas de suscripción:        -31%   vs baseline sin audio
────────────────────────────────────────────────────────────
"Enviamos la campaña de renovación de póliza de hogar a 4.200
 contactos. Fue la primera vez que superamos el 50% de apertura
 en 8 años de email marketing."
                                    — Director Marketing, Aseguradora regional ES
```

**Banca**
```
Open rate con MusicDibs:     58%    vs    19% media del sector
Tiempo de lectura del email: +2.4x  vs emails sin audio
Solicitudes de info:         +41%   vs campaña anterior
────────────────────────────────────────────────────────────
"El audio diferencia la comunicación del banco. Los clientes
 premium esperan algo diferente. MusicDibs lo entrega."
                                    — CMO, Entidad financiera 400M€ AUM
```

**Retail**
```
Open rate con MusicDibs:     64%    vs    26% media del sector
CTR Black Friday:            18%    vs     5% campaña año anterior
Conversión (venta):          +23%   vs control sin audio
────────────────────────────────────────────────────────────
"Usamos MusicDibs para el Black Friday. El audio creó urgencia
 emocional que ningún copy había conseguido."
                                    — Head of Digital, Cadena retail 180 tiendas
```

**Inmobiliaria**
```
Open rate con MusicDibs:     54%    vs    21% media del sector
Solicitudes de visita:       +29%   vs emails sin audio
Tiempo hasta primer contacto: -18h  vs media histórica
────────────────────────────────────────────────────────────
"Cada promoción tiene su propia identidad sonora. Los clientes
 recuerdan el proyecto por la música antes que por el nombre."
                                    — Director Comercial, Promotora inmobiliaria
```

**Disclaimer en gris pequeño al final de la sección:**
> Datos de pilotos realizados entre Q4 2024 y Q1 2025. Los resultados varían según sector, tamaño de lista y configuración de campaña.

---

### 6. CALCULADORA DE ROI

**Título:** Calcula tu ROI

**Subtítulo:** ¿Cuánto vale para tu empresa aumentar la tasa de apertura?

Formulario interactivo (no necesita backend, todo client-side):

**Inputs:**
- Emails enviados por mes (slider: 1.000 — 500.000)
- Open rate actual (%) (slider: 5% — 40%)
- Ticket medio o valor por conversión (€) (input)
- Tasa de conversión actual sobre abiertos (%) (slider: 0.5% — 10%)

**Output calculado automáticamente:**
```
Con MusicDibs (open rate estimado: X%*)

Aperturas adicionales/mes:        +12.400
Conversiones adicionales/mes:      +248
Ingresos adicionales estimados:    +€18.600/mes
ROI del plan Professional:         74x
────────────────────────────────
Plan recomendado: Professional (€666/mes)
Tu ROI estimado: +€17.934/mes netos
```

*Basado en media de mejora observada en pilotos del sector seleccionado.

CTA debajo: **"Solicitar demo para validar este estimado con tu caso real →"**

---

### 7. PARTNERS — Sección para agencias

**Título:** Para agencias de marketing

**Subtítulo:** Ofrece algo que ninguna otra agencia puede replicar todavía.

Dos columnas:

**Columna izquierda — El argumento:**
> Tus clientes llevan años recibiendo los mismos emails. MusicDibs te permite ofrecerles la primera experiencia de email marketing emocional.
>
> No es otro servicio. Es una ventaja competitiva.

**Columna derecha — Lo que incluye el programa:**
- ✓ Margen de partner del 25% sobre cada cliente referido
- ✓ Acceso a panel de gestión multi-cliente
- ✓ Materiales de venta listos (deck, casos de uso, calculadora ROI)
- ✓ Demo exclusiva para agencias (sin compromiso)
- ✓ Formación técnica y de producto
- ✓ Co-branding disponible

**CTA prominente:** **"Solicitar información del programa de partners →"**

**Formulario modal específico de partners:**
- Nombre de la agencia
- Nombre y cargo
- Email
- Número de clientes activos (select: <5 / 5-20 / 20-50 / +50)
- Mensaje libre

---

### 8. PRICING

**Título:** Precios simples. ROI claro.

**Nota importante sobre el copy de pricing:**

NO presentar los precios como "funcionalidades por nivel". Presentarlos como **volumen de impacto**.

```
STARTER                    PROFESSIONAL               ENTERPRISE
€399/mes                   €999/mes                   A medida
─────────────────────      ─────────────────────      ─────────────────────
Hasta 5 campañas/mes       Hasta 20 campañas/mes      Campañas ilimitadas
Hasta 10.000 contactos     Hasta 50.000 contactos     Contactos ilimitados
1 usuario                  5 usuarios                 Usuarios ilimitados
MailerLite o Brevo         Todos los proveedores       Integraciones custom
Soporte por email          Soporte prioritario         Account manager dedicado
                           Analytics avanzado          SLA 99.9%
                                                       Onboarding personalizado
                                                       GDPR DPA incluido

[Empezar prueba]           [Empezar prueba]            [Hablar con ventas]
```

**Debajo de los planes:**
> ¿Necesitas más volumen o condiciones especiales? Tenemos precios para agencias y grandes cuentas. [Contactar]

**Garantía visible:**
> 30 días de prueba sin compromiso. Cancela cuando quieras.

---

### 9. FAQ

**Título:** Preguntas frecuentes

Las 5 preguntas que un CMO buscaría responder antes de solicitar demo:

**¿El audio se reproduce directamente en el email?**
> No, y eso es intencional. Los principales clientes de email (Gmail, Outlook, Apple Mail) no reproducen audio inline por razones de seguridad. MusicDibs genera un botón o imagen en el email que lleva a una micro-landing con el audio player. Esto también nos permite rastrear exactamente quién escuchó, durante cuánto tiempo, y si convirtió.

**¿Tengo que cambiar mi proveedor de email actual?**
> No. MusicDibs se integra con tu stack existente: MailerLite, Brevo, HubSpot, Salesforce Marketing Cloud y otros. Mantienes tus listas, tus segmentaciones y tu flujo actual. Nosotros añadimos la capa de audio y analytics.

**¿Cómo controlo que el audio encaje con la imagen de marca?**
> En el onboarding defines el tono (corporativo, cercano, urgente), el estilo musical (orquestal, electrónico, acústico) y los guidelines de marca. Cada canción generada pasa por ese filtro. Para planes Professional y Enterprise, tienes revisión humana antes del envío.

**¿Qué pasa con el GDPR y los datos de mis contactos?**
> MusicDibs no procesa datos de contactos. Tus listas permanecen en tu proveedor de email. Únicamente sincronizamos estadísticas agregadas (aperturas, clics). Para Enterprise incluimos DPA firmado y podemos alojar en EU exclusivamente.

**¿Cuánto tiempo lleva generar una canción?**
> Entre 60 y 120 segundos desde que apruebas el brief. Para campañas recurrentes, puedes usar el mismo audio o generar uno nuevo por campaña. El proceso es completamente automático.

---

### 10. CTA FINAL

**Título:** Empieza a diferenciarte hoy

**Subtítulo:** Solicita una demo de 30 minutos. Te mostramos un audio generado para tu sector en directo.

**Formulario de demo (visible en la página, no en modal):**
- Nombre y apellido
- Email corporativo
- Empresa
- Sector (select: Seguros / Banca / Retail / Inmobiliaria / Turismo / Agencia / Otro)
- Número de contactos en tu lista (select: <5K / 5K-50K / 50K-200K / +200K)
- ¿Cuándo quieres hablar? (calendly link o selector de día/hora)

**CTA del formulario:** "Solicitar demo gratuita →"

**Debajo del formulario:**
> ⏱ Respuesta en menos de 24h · 📞 También puedes llamarnos: +34 XXX XXX XXX

---

## Especificaciones técnicas de diseño

**Mantener del diseño actual:**
- Paleta de colores: Gold (#C9973A), Teal (#2BB5A0), Sand, Night
- Tipografía: Fraunces (headings), Syne (body)
- Dark mode como opción (toggle en nav)
- Border radius rounded-2xl predominante
- Sensación premium / minimal

**Añadir:**
- Sección de waveform animada (CSS animation, no librería pesada)
- Audio player component nativo HTML5 con estilos custom en Gold/Teal
- Sticky nav con CTA visible en scroll

**NO añadir:**
- Vídeo autoplay
- Chatbot popup
- Cookies banner prominente (banner minimal en footer)
- Countdown timers falsos
- Stock photos de personas

---

## Notas de implementación para Lovable

1. La landing es un archivo estático separado (`Landing.tsx` en el repo). No tocar las rutas `/dashboard` ni ninguna ruta autenticada.

2. El audio player usa archivos .mp3 de Supabase Storage. Para el diseño inicial, usar audios placeholder de 30s desde cualquier CDN libre de derechos. Los audios reales se añadirán después.

3. La calculadora de ROI es completamente client-side. No necesita backend. Los multiplicadores de mejora estimada se hardcodean por sector:
   - Seguros: open rate mejora estimada +35pp
   - Banca: +38pp
   - Retail: +42pp
   - Inmobiliaria: +31pp
   - Otros: +28pp

4. El formulario de demo y el de partners envían a un endpoint simple (Supabase Edge Function `submit-lead` — a implementar, o un Typeform/HubSpot form embed por ahora).

5. Mantener la sección de industrias y la calculadora de ROI como componentes separados y reutilizables — se usarán también en landing pages específicas por sector (`/seguros`, `/banca`, etc.) en fases futuras.

6. Mobile-first en todo. El audio player debe funcionar perfectamente en iOS Safari y Chrome Android.

---

## Prioridad de implementación

**Fase 1 (máximo impacto, mínimo tiempo):**
1. Hero con nuevo copy + audio modal funcional
2. How it works (4 pasos)
3. Resultados por industria con métricas contextualizadas
4. CTA final con formulario

**Fase 2:**
5. Calculadora de ROI
6. Sección partners
7. FAQ
8. Pricing reorientado a impacto

**Fase 3:**
9. Landing pages por sector (/seguros, /banca, /retail)
10. Blog/recursos
