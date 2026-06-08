# Noni / Non Sistemas — Sistema de Reservas

## Stack
Vite + React 19 + React Router 7 + Supabase + Tailwind v4 (deploy: Vercel).
Frontend root: /app (src/). Preview corre con `yarn vite` :3000 vía supervisor (/app/frontend/package.json bridge).
.env (local preview) tiene VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY (claves públicas).

## Sesión 2026-06-08 — Corrección de colores (Modo claro uniforme)
Pedido: dashboard y vista pública tenían colores/componentes oscuros inconsistentes. Usuario pidió TODO a modo claro.
Hecho:
- GuidedSetup.jsx: panel "NONI · TU ASISTENTE" convertido de oscuro a claro (blanco, acentos indigo/emerald, texto legible).
- Dashboard.jsx: hero/banner del negocio convertido de gradiente navy a tarjeta blanca con barra de acento del color de marca.
- Dashboard.jsx: widget "Link de Reservas" convertido de bg-slate-900 a blanco.
- Dashboard.jsx + VistaPublica.jsx: forzado `colorScheme: light` para que date/time pickers nativos no salgan oscuros.
Verificado visualmente: Monitor, Agenda, Reportes, Servicios, Staff, Clientes, Inventario, vista pública — todo claro y consistente.

## Backlog / Próximos
- FloatingAssistant (burbuja chat inferior derecha) sigue oscura — se dejó como widget de marca; convertir a claro si se desea.
- Robustez: si un negocio elige un color_primario CLARO, los acentos con texto blanco podrían perder contraste (edge case).
- Botones CTA primarios (bg-slate-900) se mantienen oscuros (estándar sobre fondo claro).
