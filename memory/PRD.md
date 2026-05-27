# Noni — Non Sistemas · PRD

## Problem Statement
Mejorar a profundidad el diseño del sistema y el login (sin tocar la landing page). Llevar el SaaS al nivel "vendible": estilo profesional/corporativo, sin pasarela de pagos por ahora. Quitar el look "AI-slop" (gradientes morados/violetas genéricos, layouts predecibles tipo "clon de Stripe").

## Arquitectura
- **Frontend**: Vite + React 19 (servidor en :3000, supervisor)
- **Backend / Auth / DB**: Supabase (xvijwjytsmaazaffkfxe.supabase.co)
- **Deploy**: Vercel (vercel.json presente)
- **Routing**: react-router-dom — rutas `/login`, `/admin`, `/actualizar-clave`, etc.

## Personas
- **Dueño de negocio (PyME servicios)**: barbería, salón, estética, consultorio. Argentina/LATAM. Quiere agenda, clientes, equipo, stock, reportes en un lugar.
- **Cliente final**: reserva turnos desde el link público `/app/:slug/:id`.

## Identidad Visual (nueva — Editorial Industrial)
- **Paleta**: Cream `#F5F2EA` (papel), Ink `#1A1814` (tinta), Orange `#FF4F00` (acento industrial). Sin gradientes púrpura.
- **Tipografía**:
  - `Fraunces` (serif, italic) → titulares editoriales con personalidad
  - `Inter Tight` → cuerpo
  - `JetBrains Mono` → labels, números de sección (N°01, N°02), kbd shortcuts
- **Marca**: "Noni." (con punto naranja). Monograma "N" en italic Fraunces sobre fondo ink, con bullet naranja superpuesto.
- **Detalles distintivos**: 
  - Section markers tipo magazine (`N°01 ─── Operaciones`)
  - Footer `EST. MMXXIV · SALSIPUEDES · ARGENTINA`
  - Live ops mock panel (no feature list cliché)
  - Botones cuadrados con uppercase mono tracking-wider
  - Inputs sin caja: solo underline que cambia a naranja en focus
  - Hover del CTA: ink → orange (no gradient transition)

## Implementado (2026-01)
- **`Login.jsx`** — Rediseño completo split-screen editorial. Tres modos (login/registro/recuperar). OAuth Google + GitHub. Cooldown de rate-limit. Strength meter con reglas. Mock "EN VIVO" panel con horario actual.
- **`ActualizarClave.jsx`** — Página de reset alineada con la nueva identidad.
- **`App.jsx`** — Splash screen actualizado (logo Noni con bullet pulsante + barra de progreso minimalista).
- **`Dashboard.jsx`** — 
  - Navbar global rediseñada (cream + Noni. + ⌘K search + Ver app + Salir)
  - Loading state rediseñado
  - Suspended account screen actualizado
  - Background general cambiado de `#F8FAFC` a cream `#F5F2EA`
- **`index.css`** — Design tokens completos sobreescritos: paleta, fuentes, sombras, radios. Bottom nav móvil con acento naranja.
- **`index.html`** — Fonts cargadas: Fraunces + Inter Tight + JetBrains Mono.
- **Soporte env**: `/app/.env` con `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`. `/app/vite.config.js` con `host: 0.0.0.0`, `port: 3000`, `allowedHosts: true`.
- **Supervisor**: Bridge `/app/frontend/package.json` con script `start` que ejecuta Vite desde `/app`.

## Verificación Funcional
- Registro de prueba ejecutado contra Supabase real → respuesta correcta: "Cuenta creada. Revisá tu email para confirmarla."
- Recuperar contraseña — UI verificada (envío real depende de SMTP de Supabase del usuario).
- Linter: 0 errores en `Login.jsx` y `ActualizarClave.jsx`.

## Backlog / Próximos Pasos
- **P0** — Verificar flujo completo logueado (requiere usuario con email confirmado en Supabase).
- **P1** — Refrescar los componentes internos del Dashboard (Empleados, Servicios, Turnos, Inventario, Reportes) que aún usan paleta slate/indigo para alinearlos con la nueva identidad editorial. Las cards blancas sobre cream funcionan bien hoy, pero los acentos azules/indigo todavía conviven.
- **P1** — Integrar pasarela de pagos (Stripe/MercadoPago) cuando el usuario lo decida.
- **P2** — Onboarding wizard: hacer pasar la misma estética editorial al wizard inicial.
- **P2** — Empty states de cada tab: aplicar microcopy con personalidad (mismo tono "Sin AI-slop" del login).
- **P2** — Modo oscuro coherente (hoy solo el dashboard de admin master usa dark).

## Notas
- La carpeta `/app/landing/` NO fue tocada según indicación expresa.
- La pasarela de pagos queda diferida.
