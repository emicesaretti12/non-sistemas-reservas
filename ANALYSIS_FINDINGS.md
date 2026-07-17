# Análisis Profundo - Noni (App de Reservas)

## Estado Actual
La aplicación es una PWA/Web App construida con React 19, Vite y Tailwind v4. Utiliza Supabase para autenticación y base de datos. 
El diseño actual intenta ser moderno pero tiene inconsistencias graves entre el "Dashboard Home" (oscuro y pulido) y las pestañas internas (claras, con componentes que parecen de escritorio y UX rota en móvil).

## Problemas Identificados
1. **Inconsistencia Cromática**: El Home es oscuro (`#0f1117`), pero al navegar a Agenda, Clientes o Ajustes, el fondo cambia a blanco/gris claro (`#F8FAFC`), rompiendo la inmersión.
2. **UX de Escritorio en Móvil**:
    - Las tablas de clientes y servicios no se adaptan bien a pantallas pequeñas.
    - Los selectores de fecha y hora en la agenda son modales clásicos que ocupan mucha pantalla en lugar de ser Bottom Sheets nativos.
    - El "Asistente Noni" (FloatingAssistant) es intrusivo y tapa elementos de navegación.
3. **Elementos Rotos**:
    - Algunos botones no tienen el tamaño adecuado para el dedo (menores a 44px).
    - La barra de navegación inferior (BottomNav) es muy básica y carece de feedback visual de estado activo (solo un pequeño punto).
    - Los formularios de edición de servicios/empleados son modales gigantes que se cortan en móvil.
4. **Usabilidad**:
    - El flujo de reserva pública (`VistaPublica.jsx`) es funcional pero visualmente ruidoso, con demasiados pasos y barras de progreso que distraen.
    - La navegación entre pestañas es instantánea, sin transiciones fluidas.

## Objetivos del Rediseño (Native Feel)
1. **Unificación de Tema**: Llevar el modo oscuro elegante a toda la aplicación (Owner Dashboard).
2. **Componentes Nativos**:
    - Reemplazar modales por **Bottom Sheets** animados (usando Framer Motion).
    - Implementar **Haptic-like feedback** (escalado suave al tocar botones).
    - Rediseñar la **BottomNav** con iconos más grandes y labels claros.
3. **Optimización de Pantallas**:
    - **Agenda**: Vista de timeline más vertical y fácil de scrollear.
    - **Clientes**: Lista tipo "Contactos de iOS/Android" con acciones rápidas al deslizar o tocar.
    - **Ajustes**: Agrupación por tarjetas con iconos laterales, similar a los ajustes del sistema de un móvil.
4. **Noni Assistant**: Transformarlo en un elemento más discreto o que se integre mejor en la interfaz sin tapar el contenido.

## Restricciones
- No tocar `/landing` ni `LandingPage.jsx`.
- No modificar esquemas de base de datos.
- Mantener compatibilidad con Supabase.
