# Plan de Rediseño Profesional - Noni (Native Mobile Feel)

Este documento detalla las mejoras visuales y de UX para transformar la aplicación actual en una experiencia que se sienta como una app móvil nativa.

## 1. Identidad Visual y Sistema de Diseño
*   **Paleta de Colores**: Mantendremos la base oscura pero refinaremos las superficies (`surface`) para crear mayor profundidad mediante elevación visual.
*   **Tipografía**: Optimizaremos el uso de `Inter Tight` y `JetBrains Mono` para jerarquías claras.
*   **Bordes y Sombras**: Ajustaremos los radios de curvatura para que sean más consistentes y usaremos sombras suaves para simular elevación real.
*   **Efectos**: Introducción de Glassmorphism controlado para elementos flotantes y navegación.

## 2. Experiencia de Usuario (UX) "Native-like"
*   **Navegación Inferior**: Rediseño de la `BottomNav` con animaciones de Framer Motion para que se sienta fluida y táctil.
*   **Gestos y Transiciones**: Implementación de transiciones de página (slide/fade) al cambiar de pestaña.
*   **Bottom Sheets**: Los modales en móvil se transformarán en "Bottom Sheets" que se deslizan desde abajo, un patrón estándar en iOS/Android.
*   **Tap Targets**: Asegurar que todos los botones y elementos interactivos tengan un tamaño mínimo de 44x44px para facilitar el uso táctil.

## 3. Componentes Críticos a Rediseñar
*   **Dashboard Shell**: Limpieza del layout principal, mejorando el espaciado del Navbar y la BottomNav.
*   **Tarjetas de Métricas**: Diseño más limpio, con iconos mejor integrados y tipografía más legible.
*   **Agenda/Turnos**: Optimización de la vista de calendario para que sea más intuitiva en pantallas pequeñas.
*   **Formularios**: Inputs con estados de enfoque más elegantes y validaciones visuales claras.

## 4. Restricciones Respetadas
*   **Base de Datos**: No se realizarán cambios en esquemas ni lógica de Supabase.
*   **Landing Page**: No se tocará el directorio `/landing` ni el componente `LandingPage.jsx`.
*   **Funcionalidad**: Se mantendrá toda la lógica de negocio actual.
