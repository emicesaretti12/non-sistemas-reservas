# Noni — Sistema de Reservas (PRD)

## Problema original
"Necesito que rediseñes el dashboard ya que es poco útil y práctico y es difícil de usar, tiene que ser fácil para el uso de la mano."

## Stack
- Frontend: React 19 + Vite 8 + Tailwind v4 (en `/app` raíz, servido por supervisor `frontend` → `yarn vite` en :3000)
- Datos/Auth: Supabase (multi-tenant: negocios, turnos, servicios, empleados, inventario, clientes)
- Roles: Owner (dueño de negocio) y Super Admin (Nucleus)
- Env requeridas (frontend): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (en `/app/.env`, gitignored; en prod se setean en Vercel)

## Preferencias del usuario (verbatim)
- Propósito: administración/gestión de datos + ventas/negocio
- Dispositivo: ambos, priorizando móvil
- Estilo: oscuro y elegante
- De un vistazo: citas del día, turnos próximos, lugares disponibles
- Conservar: logo del negocio y el asistente "Noni"
- Alcance modo oscuro: solo el inicio + barras de navegación

## Implementado (2026-06-08)
- **Nuevo home oscuro mobile-first** `src/components/DashboardHome.jsx`:
  - Hero con saludo por hora, nombre del negocio (Fraunces serif), logo y estado en vivo
  - 3 métricas clave del día: Citas hoy · Lugares libres · Ingresos del día
  - Próxima cita destacada con countdown + recordatorio WhatsApp
  - Lista de Próximos turnos (timeline, targets grandes táctiles)
  - Lugares disponibles (reutiliza el algoritmo de slots libres de `Turnos.jsx`)
  - Acciones rápidas + Pulso semanal
- **Shell oscuro** en `Dashboard.jsx` (solo vista owner): canvas `.ns-owner-dark`, navbar `.ns-nav-dark`, tab pills `.nh-tab`, bottom nav `.ns-bottom-nav--dark`, hero de otras pestañas oscuro
- Estilos nuevos en `src/index.css` (sección "DASHBOARD HOME — DARK COMMAND CENTER")
- Noni (FloatingAssistant) y logo conservados
- Verificado con login real (studio77@gmail.com): render OK, sin errores de consola, todos los data-testid presentes; build de prod OK

## Backlog / Próximos
- P1: Extender modo oscuro a las pestañas internas (Agenda/Turnos, Clientes, Servicios, Empleados, Horarios, Inventario, Reportes, Ajustes) — hoy siguen en tema claro
- P2: Skeleton loaders en el home mientras cargan datos
- P2: Pull-to-refresh / actualización en vivo de turnos
- P3: Métrica de ocupación real basada en capacidad de horarios

## Credenciales de prueba
Ver `/app/memory/test_credentials.md`
