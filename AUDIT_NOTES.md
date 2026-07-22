# Auditoría NON Sistemas Reservas - Notas de Implementación

## Stack
- React 19 + Vite 8 + TailwindCSS v4 + Framer Motion + GSAP
- Supabase backend
- Colores marca: #5B3DF5 (primary), #E8DEFF (accent)

## Archivos clave
- src/index.css - Sistema de estilos globales (YA ACTUALIZADO con Plastilina 3D)
- src/components/Dashboard.jsx - Shell principal (1607 líneas)
  - Líneas 1060-1088: Tab selector desktop/mobile
  - Líneas 1090-1116: Área de contenido principal (Turnos, Reportes, etc.)
  - Líneas 1118-1277: Sección Clientes (inline en Dashboard)
  - Líneas 1279-1539: Sección Ajustes
  - Líneas 1548-1562: Bottom nav
  - Líneas 1575-1604: FloatingAssistant wiring
- src/components/FloatingAssistant.jsx - Asistente Noni (ROTO: usa sky-blue en vez de marca)
- src/components/Reportes.jsx - Reportes (417 líneas)
- src/components/ConfiguracionHorarios.jsx - Horarios (217 líneas)
- src/components/FlyerCreator.jsx - Flyer creator (515 líneas)

## Problemas identificados
1. FloatingAssistant: Usa colores sky-blue (#0284c7, #38bdf8) - NO usa colores de marca
2. FloatingAssistant: Panel en móvil puede quedar oculto bajo bottom nav
3. FloatingAssistant: hasShared hardcodeado en false (línea 1584 Dashboard)
4. Reportes: Barras del gráfico con opacity 40% fija (difícil de leer)
5. FlyerCreator: Paleta sky-blue/emerald/rose en templates
6. Clientes: Mezcla de estilos slate y colores de marca
7. Horarios: Diseño básico sin efecto 3D plastilina

## Tokens CSS nuevos en index.css
- --ns-plastilina-card: sombra 3D para cards
- --ns-plastilina-btn: sombra 3D para botones
- --ns-plastilina-active: sombra 3D para estado activo
- --ns-shadow-xl: sombra extra grande
- Nuevas clases: ns-kpi-card, ns-cliente-card, ns-section-header, ns-bar-chart-bar, etc.

## Orden de implementación
1. ✅ index.css - Sistema de estilos globales
2. → Dashboard.jsx - Layout + tabs + sección Clientes
3. → Reportes.jsx - Rediseño completo
4. → ConfiguracionHorarios.jsx - Rediseño
5. → FlyerCreator.jsx - Rediseño + fix paleta
6. → FloatingAssistant.jsx - Fix colores + fix panel móvil
