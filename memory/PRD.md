# Noni / Non Sistemas — Sistema de Reservas (SaaS)

## Stack
Vite + React 19 + React Router 7 + Supabase (Auth + DB) + Tailwind v4. Deploy: Vercel.
Frontend root: /app (src/). Preview local: `yarn vite` :3000 vía supervisor.
.env local: VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY (claves públicas, sb_publishable...).
NO hay backend propio: toda la lógica es frontend + Supabase (RLS).

## Producto (qué hace)
SaaS multi-tenant para negocios con turnos (barberías, restaurantes, estéticas, etc.):
reservas públicas, agenda, servicios, equipo, horarios, inventario, catálogo, reportes/CRM,
flyer, recordatorios WhatsApp (manuales), panel super-admin (Nucleus), onboarding wizard.

## Sesión 2026-06-08 (A) — Corrección de colores (modo claro uniforme)
GuidedSetup, hero del dashboard y widget de link pasados a claro. colorScheme:light en
dashboard y vista pública. Verificado en todas las pestañas. (Detalle en historial.)

## Sesión 2026-06-08 (B) — Monetización: Suscripción + Prueba 7 días + Bloqueo
Decisión del usuario: prueba 7 días, $9.990 ARS/mes, plan único "Profesional",
SIN cobro automático (activación MANUAL desde super-admin), bloquear AMBAS (dashboard + vista pública) al vencer.

Implementado:
- `src/utils/suscripcion.js`: lógica pura `getEstadoSuscripcion(negocio)` → estados
  admin/trial/activo/vencido/suspendido (+ días restantes). Compatible hacia atrás
  (si faltan columnas, NO bloquea). 17 unit tests pasaron.
- `sql_suscripciones.sql`: agrega columnas trial_inicio, trial_fin (default +7d),
  fecha_vencimiento, plan. Grandfather: negocios activos previos reciben +365d (no se bloquean).
- Dashboard.jsx:
  - Bloqueo unificado (vencido/suspendido) con paywall: CTA WhatsApp "Activar mi plan" + "Ya pagué·Actualizar".
  - Banner de prueba/por-vencer arriba del dashboard (estado trial o activo ≤5d).
  - Tarjeta "Suscripción" en Ajustes (plan, precio, estado, días, vence, CTA activar/renovar).
  - Super-admin "Nucleus": badges de estado por negocio + acciones "+30 días" (registrarPago) y "Suspender".
  - Onboarding (Dashboard + OnboardingWizard) crea negocios como estado 'trial'.
- VistaPublica.jsx: bloquea reservas si !getEstadoSuscripcion(negocio).acceso.

Verificado: build OK; bloqueo dashboard+público en vivo (toggle suspendido); tarjeta Suscripción renderiza; sin regresión.

### PENDIENTE para que la monetización quede ACTIVA en producción
1. Ejecutar `sql_suscripciones.sql` en Supabase SQL Editor (1 vez). Sin esto, todos quedan "activo" (no arranca el trial/bloqueo).
2. Editar `CONTACTO_PAGO.whatsapp` en `src/utils/suscripcion.js` con el WhatsApp real del vendedor (hoy placeholder 5493510000000).
3. Save to Github → redeploy Vercel.

## Backlog / Próximos (P1/P2)
- Cobro automático real (Mercado Pago suscripción/preapproval) cuando consiga credenciales → reemplaza activación manual.
- Recordatorios WhatsApp 100% automáticos (hoy son disparo manual; requeriría cron/Edge Function).
- FloatingAssistant (burbuja) sigue oscura: pasar a claro si se desea.
- Robustez color de marca claro (texto blanco sobre acento claro) — caso borde.
