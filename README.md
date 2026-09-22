# Noni — Sistema de Reservas

App de reservas y gestión para negocios de turnos: barberías, bares, estética,
uñas, tatuajes, gimnasios, veterinarias, talleres y más. Cada negocio tiene su
propio link público donde sus clientes reservan solos, y un panel para manejar
agenda, equipo, servicios, clientes, inventario y reportes.

- **Stack**: React 19 · Vite 8 · Tailwind v4 · Supabase (auth + Postgres)
- **Diseño**: neumorfismo de dos colores — `#990011` (marca) y `#FCF6F5` (papel)
- **Hosting**: Vercel (SPA con rewrite a `index.html`, ver `vercel.json`)
- **Imágenes**: Cloudinary (preset sin firma `non_sistemas`)

---

## Arranque rápido

```bash
npm install
cp .env.example .env    # completá las credenciales de Supabase
npm run dev             # http://localhost:3000
```

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción en `dist/` |
| `npm test` | Tests de la lógica de reservas (runner nativo de Node) |
| `npm run lint` | ESLint |
| `npm run check` | lint + tests + build — corrantelo antes de desplegar |

---

## Variables de entorno

Todas están documentadas en [`.env.example`](.env.example). Las mínimas para
que la app funcione:

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Y para que el botón **“Activar plan”** lleve a algún lado:

```
VITE_CONTACTO_WHATSAPP=5493511234567   # internacional, sin "+"
VITE_PLAN_PRECIO=9990
```

> ⚠️ Todo lo que empieza con `VITE_` se incrusta en el bundle y es **público**.
> Nunca pongas ahí la `service_role` key de Supabase.

En Vercel se cargan en *Settings → Environment Variables*. Vite las resuelve en
tiempo de build: **un cambio recién tiene efecto en el siguiente deploy**.

---

## Base de datos

### Migración pendiente (importante)

Antes de abrir el registro de suscriptores hay que correr, una sola vez, en
*Supabase → SQL Editor*:

```
sql/2026-09-20_seguridad_y_reservas.sql
```

Es aditiva: no borra ni modifica filas existentes. Resuelve tres cosas:

1. **Escalada de privilegios.** Sin ella, cualquier dueño puede ejecutar desde
   la consola del navegador `update negocios set es_admin_plataforma = true` y
   pasar a ver y administrar todos los negocios de la plataforma.
2. **Paywall evitable.** Por el mismo camino, cualquiera puede escribirse
   `estado_suscripcion = 'activo'` y usar el sistema gratis para siempre.
3. **Doble reserva.** Agrega el índice único que impide que dos clientes tomen
   la misma franja en el mismo instante.

Los scripts anteriores quedaron archivados en `sql/legacy/` como referencia
histórica; ya están contemplados dentro de la migración nueva.

### Designar un administrador de la plataforma

La app ya **no** se auto-asigna el rol (antes lo hacía comparando el email
contra una variable pública del bundle). Se hace desde el SQL Editor:

```sql
UPDATE public.negocios
   SET es_admin_plataforma = TRUE
 WHERE owner_id = (SELECT id FROM auth.users WHERE email = 'tu-email@dominio.com');
```

### Registrar un pago

Desde el panel *Nucleus* (visible para el admin) con el botón **+30 días**, o
a mano:

```sql
UPDATE public.negocios
   SET estado_suscripcion = 'activo',
       fecha_vencimiento  = GREATEST(COALESCE(fecha_vencimiento, now()), now()) + interval '30 days'
 WHERE id = 'UUID-DEL-NEGOCIO';
```

### Cómo funciona el acceso

| Situación | Resultado |
|---|---|
| `es_admin_plataforma = true` | Acceso total (panel Nucleus) |
| `estado_suscripcion = 'suspendido'` | Bloqueado, panel y link público caídos |
| `fecha_vencimiento` futura | Activo |
| `fecha_vencimiento` pasada | Vencido → pantalla de pago |
| Sin `fecha_vencimiento`, `trial_fin` futura | Prueba gratis (7 días) |
| Sin ninguna de las dos (datos viejos) | Acceso garantizado |

Esa última fila es a propósito: los negocios que ya estaban activos antes de
la migración de suscripciones no se bloquean solos.

---

## Sistema de diseño

La interfaz usa **dos colores y nada más**:

| Token | Valor | Para qué |
|---|---|---|
| `--ns-paper` | `#FCF6F5` | Todas las superficies |
| `--ns-brand` | `#990011` | Acento, tinta y estados |

Cualquier otro tono de la app es una mezcla entre esos dos (`--ns-mix-*`). La
paleta de Tailwind está reasignada en `@theme` dentro de `src/index.css`: las
clases heredadas (`slate-*`, `violet-*`, `emerald-*`…) caen sobre la misma
escala, así que no hay forma de que se escape un color ajeno.

Como no hay una segunda tinta, **la jerarquía la da el relieve, no el color**:

- lo accionable **sale** del papel (`--neo-raised`),
- lo que está activo o es un campo **se hunde** (`--neo-inset`, `--neo-pressed`),
- y los estados se distinguen por forma: relleno = confirmado, contorno =
  pendiente, hundido = inactivo, tachado = cancelado (`.neo-chip--*`).

```
src/styles/
  base.css          Reset, tipografía y comportamiento táctil nativo
  animations.css    Curvas, keyframes y utilidades de movimiento
  neumorphism.css   Piezas base: tarjetas, botones, campos, chips, switches
  shell.css         Rail de escritorio, dock móvil, hojas y modales
  screens.css       Componentes de pantalla del panel
  views.css         Login, app pública de reservas y landing
```

Contraste verificado contra el papel: tinta principal 8.3:1, secundaria 6.0:1
y apagada 4.6:1 — todas cumplen WCAG AA.

---

## Estructura

```
src/
  App.jsx                  Ruteo + ErrorBoundary + code splitting por ruta
  supabaseClient.js        Cliente y detección de configuración faltante
  components/
    Dashboard.jsx          Shell del panel (owner y super admin)
    DashboardHome.jsx      Resumen del día
    VistaPublica.jsx       App pública de reservas (lo que ve el cliente final)
    Turnos.jsx             Agenda
    Servicios / Empleados / ConfiguracionHorarios / InventarioPro / Reportes
    OnboardingWizard.jsx   Alta de negocio nuevo
    GuidedSetup.jsx        Checklist de configuración inicial
    NoniAssistantV4.jsx    Asistente (hoja inferior en móvil, panel en escritorio)
    DashboardTourV2.jsx    Tour guiado con recorte sobre el elemento real
  styles/                  Sistema de diseño (ver arriba)
  utils/
    reservas.js            Reglas de turnos: solapamiento, estados, horarios
    reservas.test.js       Tests de esa lógica
    asistente.js           Motor de intenciones del asistente
    asistente.test.js      Tests de clasificación y respuestas
    haptics.js             Vibración corta al tocar (no-op donde no existe)
    suscripcion.js         Planes, prueba gratis y bloqueo
    vocabulario.js         Terminología por rubro (multirubro)
sql/                       Migraciones
landing/                   Landing en Next.js (proyecto aparte)
```

### Estados de un turno

Definidos en `src/utils/reservas.js` y usados por toda la app:

| Estado | ¿Ocupa el horario? | ¿Factura? |
|---|---|---|
| `confirmado` | Sí | Sí |
| `completado` (atendido) | Sí | Sí |
| `cancelado` | No | No |
| `no_show` (no vino) | No | No |
| `null` (turnos viejos) | Sí | Sí |

Cancelar un turno **no borra la fila**: lo marca como `cancelado` para no
perder el historial del cliente ni la facturación del período.

---

## Despliegue

1. `npm run check` en local.
2. Push a la rama que Vercel tiene conectada.
3. Verificar que las variables de entorno estén cargadas en Vercel.

El service worker se registra sólo en producción y recarga la pestaña una vez
cuando detecta una versión nueva, para que nadie quede con una mezcla de
assets viejos y nuevos.
