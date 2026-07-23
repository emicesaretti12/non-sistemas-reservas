# Análisis Profundo - Noni v2 (Rediseño Integral)

## 1. ERRORES DE LÓGICA IDENTIFICADOS

### 1.1 OnboardingWizard.jsx - Limpieza de localStorage inconsistente
**Línea 302-307**: Al finalizar el onboarding, se limpian las claves de tour/asistente:
```javascript
localStorage.removeItem('ns_tour_completed_v2')
localStorage.removeItem('ns_assistant_v2')
localStorage.removeItem('ns_bubble_shown')
```
**Problema**: Esto impide que el tour se muestre después de crear el negocio, ya que el usuario debería ver el tour guiado inmediatamente después.

### 1.2 Dashboard.jsx - hasShared siempre en false
**Línea 1581-1588**: El asistente recibe `hasShared: false` siempre:
```javascript
const setupData = {
  hasServicios: !!servicios?.length,
  hasEmpleados: !!empleados?.length,
  hasHorarios: !!negocio?.horarios,
  hasShared: false, // ← SIEMPRE FALSE
}
```
**Problema**: El asistente nunca sugiere compartir el link porque esta bandera nunca cambia.

### 1.3 FloatingAssistant.jsx - Persistencia de estado rota
**Línea 5**: Usa clave `ns_assistant_state_v3` pero no sincroniza con Dashboard.
**Problema**: El estado del asistente no persiste correctamente entre navegaciones.

### 1.4 DashboardTour.jsx - Scroll behavior en móvil
**Línea 134-137**: Usa `scrollIntoView({ behavior: 'smooth' })` que puede causar saltos en móvil.
**Problema**: En pantallas pequeñas, el tour se desalinea del contenido.

## 2. ERRORES DE DISEÑO IDENTIFICADOS

### 2.1 Navbar Móvil Roto
**Archivo**: `index.css` líneas 607-710
**Problemas**:
- La navbar está fija en `bottom: 0` pero en móvil está en `bottom: 12px` (inconsistencia)
- Los items no tienen suficiente área táctil (44px mínimo de Apple HIG)
- El feedback visual de estado activo es muy sutil (solo un pequeño punto)
- En pantallas muy pequeñas (< 320px), los labels se cortan

### 2.2 Inconsistencia de Tema
**Dashboard.jsx**: El home es oscuro (`#0f1117`) pero al navegar a otras secciones, el fondo cambia a blanco/gris claro.
**Problema**: Rompe la inmersión visual y la experiencia de usuario.

### 2.3 Botones sin Efecto 3D Plastilina Consistente
**index.css líneas 369-418**: Los botones tienen el efecto, pero muchos componentes usan botones genéricos de Tailwind.
**Problema**: Inconsistencia visual en toda la app.

### 2.4 Modales Gigantes en Móvil
**Servicios.jsx, Empleados.jsx**: Los formularios de edición son modales que ocupan toda la pantalla.
**Problema**: UX de escritorio forzada en móvil.

## 3. PROBLEMAS DE USABILIDAD

### 3.1 Asistente Noni Muy Básico
- Solo responde con fallbacks determinísticos
- No tiene contexto real del negocio
- No sugiere acciones inteligentes basadas en métricas
- El avatar no tiene expresiones o feedback visual

### 3.2 Onboarding Poco Atractivo
- El OnboardingWizard es funcional pero visualmente plano
- No hay feedback de progreso claro
- La pantalla final no es celebratoria
- No hay transiciones suaves entre pasos

### 3.3 Dashboard Tour Poco Interactivo
- El tour es informativo pero no guía acciones
- No hay integración con el asistente
- El progreso no es visible de forma clara

## 4. SOLUCIONES PROPUESTAS

### Fase 1: Correcciones de Lógica
1. Sincronizar `hasShared` con localStorage
2. Limpiar localStorage de forma correcta en onboarding
3. Mejorar persistencia del estado del asistente
4. Arreglar scroll behavior en móvil

### Fase 2: Rediseño de Componentes 3D Plastilina
1. Aplicar efecto 3D consistente a todos los botones
2. Mejorar sombras y profundidad
3. Agregar micro-interacciones (haptic-like feedback)
4. Unificar tema oscuro en todo el dashboard

### Fase 3: Navbar Móvil Mejorado
1. Aumentar área táctil a 48px mínimo
2. Mejorar feedback visual de estado activo
3. Hacer responsive para pantallas muy pequeñas
4. Agregar animaciones suaves

### Fase 4: Asistente Noni Avanzado
1. Integrar con IA real (Manus LLM)
2. Contexto dinámico del negocio
3. Sugerencias inteligentes basadas en métricas
4. Avatar con expresiones y emociones
5. Historial de chat persistente

### Fase 5: Onboarding Mejorado
1. Rediseño visual completo
2. Animaciones entre pasos
3. Pantalla final celebratoria
4. Integración con tour guiado
5. Mejor feedback de progreso

## 5. PRIORIDADES

1. **CRÍTICO**: Arreglar navbar móvil (afecta usabilidad)
2. **CRÍTICO**: Corregir lógica de hasShared
3. **ALTO**: Rediseñar asistente Noni
4. **ALTO**: Mejorar onboarding
5. **MEDIO**: Aplicar efectos 3D plastilina consistentes
6. **MEDIO**: Mejorar tour guiado
