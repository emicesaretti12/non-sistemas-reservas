/**
 * suscripcion.js — Lógica central de planes, prueba gratis y bloqueo de acceso.
 *
 * Modelo de datos (tabla `negocios`, ver sql/2026-09-20_seguridad_y_reservas.sql):
 *   - estado_suscripcion: 'trial' | 'activo' | 'suspendido'
 *   - trial_inicio       TIMESTAMPTZ
 *   - trial_fin          TIMESTAMPTZ  (inicio + 7 días)
 *   - fecha_vencimiento  TIMESTAMPTZ  (suscripción paga: se setea al activar manualmente)
 *   - plan               TEXT (default 'profesional')
 *
 * Compatibilidad: si faltan las columnas nuevas (datos viejos), NO se bloquea el acceso.
 *
 * ── CONFIGURACIÓN ───────────────────────────────────────────────────────────
 * Los datos de cobro se leen de variables de entorno para no tener que tocar
 * código al cambiarlos. Definilas en `.env` (local) y en Vercel (producción):
 *
 *   VITE_CONTACTO_WHATSAPP=5493513522968   ← internacional, sin "+"
 *   VITE_CONTACTO_EMAIL=soporte@nonsistemas.com
 *   VITE_PLAN_PRECIO=9990
 *   VITE_PLAN_NOMBRE=Profesional
 *
 * Si no se definen, se usan los valores por defecto de abajo.
 */

const env = import.meta.env

const precioEnv = Number(env.VITE_PLAN_PRECIO)

export const PLAN = {
  id: 'profesional',
  nombre: env.VITE_PLAN_NOMBRE || 'Profesional',
  precio: Number.isFinite(precioEnv) && precioEnv > 0 ? precioEnv : 9990,
  moneda: 'ARS',
  trialDias: 7,
  cicloDias: 30,
}

// Número de contacto para activaciones. Formato internacional sin "+":
//   54 (Argentina) + 9 (móvil) + 351 (Córdoba) + 3522968
// La variable de entorno tiene prioridad, así que se puede cambiar desde
// Vercel sin tocar el código ni volver a desplegar desde acá.
const WHATSAPP_POR_DEFECTO = '5493513522968'

export const CONTACTO_PAGO = {
  whatsapp: (env.VITE_CONTACTO_WHATSAPP || WHATSAPP_POR_DEFECTO).replace(/[^0-9]/g, ''),
  email: env.VITE_CONTACTO_EMAIL || 'soporte@nonsistemas.com',
}

/** true si todavía no se configuró un canal de cobro real. */
export const cobroSinConfigurar = !CONTACTO_PAGO.whatsapp

const DIA_MS = 86400000

/** Días (redondeo hacia arriba) entre dos fechas. */
export function diasEntre(desde, hasta) {
  return Math.ceil((hasta.getTime() - desde.getTime()) / DIA_MS)
}

/** Formatea un precio en pesos sin decimales. */
export function formatearPrecio(valor = PLAN.precio) {
  return `$${Number(valor || 0).toLocaleString('es-AR')}`
}

/**
 * Calcula el estado de acceso de un negocio.
 * @returns {{ acceso: boolean, estado: 'admin'|'trial'|'activo'|'vencido'|'suspendido', diasRestantes: number|null, vence: Date|null, enTrial: boolean }}
 */
export function getEstadoSuscripcion(negocio, ahora = new Date()) {
  const base = { acceso: true, estado: 'activo', diasRestantes: null, vence: null, enTrial: false }
  if (!negocio) return base

  // Super admin de la plataforma: siempre tiene acceso.
  if (negocio.es_admin_plataforma) return { ...base, estado: 'admin' }

  // Suspensión manual explícita.
  if (negocio.estado_suscripcion === 'suspendido') {
    return { acceso: false, estado: 'suspendido', diasRestantes: 0, vence: null, enTrial: false }
  }

  const venc = negocio.fecha_vencimiento ? new Date(negocio.fecha_vencimiento) : null
  const trialFin = negocio.trial_fin ? new Date(negocio.trial_fin) : null

  // 1) Suscripción paga (tiene fecha de vencimiento).
  if (venc && !isNaN(venc.getTime())) {
    if (venc.getTime() > ahora.getTime()) {
      return { acceso: true, estado: 'activo', diasRestantes: diasEntre(ahora, venc), vence: venc, enTrial: false }
    }
    return { acceso: false, estado: 'vencido', diasRestantes: 0, vence: venc, enTrial: false }
  }

  // 2) Período de prueba.
  if (trialFin && !isNaN(trialFin.getTime())) {
    if (trialFin.getTime() > ahora.getTime()) {
      return { acceso: true, estado: 'trial', diasRestantes: diasEntre(ahora, trialFin), vence: trialFin, enTrial: true }
    }
    return { acceso: false, estado: 'vencido', diasRestantes: 0, vence: trialFin, enTrial: true }
  }

  // 3) Sin columnas nuevas (datos previos a la migración) -> acceso garantizado.
  return base
}

/** Etiqueta legible para un estado. */
export function etiquetaEstado(estado) {
  switch (estado) {
    case 'admin': return 'Administrador'
    case 'trial': return 'Prueba gratis'
    case 'activo': return 'Activo'
    case 'vencido': return 'Vencido'
    case 'suspendido': return 'Suspendido'
    default: return estado || '—'
  }
}

/** Link de WhatsApp (o mailto como fallback) para solicitar la activación del plan. */
export function whatsappActivacion(negocio, email) {
  const msg = `Hola! Quiero activar mi suscripción de Noni para "${negocio?.nombre || ''}" (ID: ${negocio?.id || ''}). Mi email: ${email || ''}.`
  if (!CONTACTO_PAGO.whatsapp) {
    return `mailto:${CONTACTO_PAGO.email}?subject=${encodeURIComponent('Activar suscripción')}&body=${encodeURIComponent(msg)}`
  }
  return `https://wa.me/${CONTACTO_PAGO.whatsapp}?text=${encodeURIComponent(msg)}`
}

/** Próxima fecha de vencimiento al registrar un pago (extiende si todavía está vigente). */
export function calcularNuevoVencimiento(negocio, ahora = new Date()) {
  const actual = negocio?.fecha_vencimiento ? new Date(negocio.fecha_vencimiento) : null
  const base = actual && actual.getTime() > ahora.getTime() ? actual : ahora
  return new Date(base.getTime() + PLAN.cicloDias * DIA_MS)
}
