/**
 * suscripcion.js — Lógica central de planes, prueba gratis y bloqueo de acceso.
 *
 * Modelo de datos (tabla `negocios`, ver sql_suscripciones.sql):
 *   - estado_suscripcion: 'trial' | 'activo' | 'suspendido'
 *   - trial_inicio       TIMESTAMPTZ
 *   - trial_fin          TIMESTAMPTZ  (inicio + 7 días)
 *   - fecha_vencimiento  TIMESTAMPTZ  (suscripción paga: se setea al activar manualmente)
 *   - plan               TEXT (default 'profesional')
 *
 * Compatibilidad: si faltan las columnas nuevas (datos viejos), NO se bloquea el acceso.
 */

export const PLAN = {
  id: 'profesional',
  nombre: 'Profesional',
  precio: 9990,
  moneda: 'ARS',
  trialDias: 7,
  cicloDias: 30,
}

// ⚠️ EDITAR: tu WhatsApp para recibir pedidos de activación (formato internacional, sin "+").
// Ej Argentina: 549 + característica sin 0 + número sin 15. p.ej: 5493511234567
export const CONTACTO_PAGO = {
  whatsapp: '5493510000000',
  email: 'soporte@nonsistemas.com',
}

const DIA_MS = 86400000

/** Días (redondeo hacia arriba) entre dos fechas. */
export function diasEntre(desde, hasta) {
  return Math.ceil((hasta.getTime() - desde.getTime()) / DIA_MS)
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

/** Link de WhatsApp para solicitar la activación manual del plan. */
export function whatsappActivacion(negocio, email) {
  const msg = `Hola! Quiero activar mi suscripción de Noni para "${negocio?.nombre || ''}" (ID: ${negocio?.id || ''}). Mi email: ${email || ''}.`
  const num = (CONTACTO_PAGO.whatsapp || '').replace(/[^0-9]/g, '')
  if (!num) return `mailto:${CONTACTO_PAGO.email}?subject=${encodeURIComponent('Activar suscripción')}&body=${encodeURIComponent(msg)}`
  return `https://wa.me/${num}?text=${encodeURIComponent(msg)}`
}

/** Próxima fecha de vencimiento al registrar un pago (extiende si todavía está vigente). */
export function calcularNuevoVencimiento(negocio, ahora = new Date()) {
  const actual = negocio?.fecha_vencimiento ? new Date(negocio.fecha_vencimiento) : null
  const base = actual && actual.getTime() > ahora.getTime() ? actual : ahora
  return new Date(base.getTime() + PLAN.cicloDias * DIA_MS)
}
