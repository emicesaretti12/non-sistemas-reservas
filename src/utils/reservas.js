/**
 * reservas.js — Reglas compartidas de turnos/reservas.
 *
 * Antes cada pantalla interpretaba el campo `estado` a su manera: el panel
 * público y la agenda sólo miraban 'confirmado', así que en cuanto el dueño
 * marcaba un turno como atendido ('completado') el turno desaparecía de los
 * reportes y su horario quedaba libre para que lo reservaran de nuevo.
 * Acá queda una única fuente de verdad.
 */

/** Estados que NO ocupan el horario ni suman facturación. */
export const ESTADOS_LIBERAN_HORARIO = ['cancelado', 'no_show']

/** Estados que ocupan el horario (incluye turnos históricos ya atendidos). */
export const ESTADOS_OCUPAN_HORARIO = ['confirmado', 'completado']

/** Estados que suman a la facturación. */
export const ESTADOS_FACTURAN = ['confirmado', 'completado']

/**
 * ¿Este turno ocupa el horario?
 * Los turnos viejos sin `estado` (datos previos) se consideran activos: es
 * preferible pecar de conservador y no permitir una sobreventa.
 */
export function ocupaHorario(turno) {
  if (!turno) return false
  return !ESTADOS_LIBERAN_HORARIO.includes(turno.estado)
}

/** ¿Este turno suma a los ingresos? */
export function factura(turno) {
  if (!turno) return false
  return !ESTADOS_LIBERAN_HORARIO.includes(turno.estado)
}

/** Precio del turno (0 si el servicio fue borrado). */
export function precioTurno(turno) {
  return Number(turno?.servicios?.precio) || 0
}

/** Duración en minutos del turno, con fallback de 30'. */
export function duracionTurno(turno, fallback = 30) {
  const d = Number(turno?.servicios?.duracion_minutos)
  return Number.isFinite(d) && d > 0 ? d : fallback
}

/**
 * Parseo robusto de los timestamps que devuelve Supabase.
 * Postgres puede mandar "2026-09-20 15:00:00+00" o ISO completo; Safari es
 * quisquilloso con el formato con espacio.
 */
export function parseFecha(valor) {
  if (!valor) return null
  if (valor instanceof Date) return isNaN(valor.getTime()) ? null : valor
  let raw = String(valor).replace(' ', 'T')
  // La zona puede venir como "Z", "+00", "+0000" o "+00:00" según el driver.
  const tieneZona = /(Z|[+-]\d{2}(:?\d{2})?)$/.test(raw.slice(10))
  if (!tieneZona) raw += 'Z'
  const d = new Date(raw)
  return isNaN(d.getTime()) ? null : d
}

/** ¿Se pisan dos intervalos [inicioA, finA) y [inicioB, finB)? */
export function seSolapan(inicioA, finA, inicioB, finB) {
  return Math.max(inicioA, inicioB) < Math.min(finA, finB)
}

/**
 * Chequeo de disponibilidad real contra la base, considerando DURACIÓN.
 *
 * El chequeo anterior comparaba sólo la igualdad exacta del timestamp, así que
 * un corte de 60' a las 10:00 no impedía reservar otro a las 10:30.
 *
 * @param {object} supabase       cliente de supabase
 * @param {object} opts
 * @param {string} opts.negocioId
 * @param {string|null} opts.empleadoId  null = negocio sin staff cargado
 * @param {Date}   opts.inicio
 * @param {number} opts.duracionMin
 * @param {string} [opts.ignorarTurnoId] para reprogramaciones
 * @returns {Promise<{ok: boolean, motivo?: string}>}
 */
export async function verificarDisponibilidad(supabase, {
  negocioId,
  empleadoId,
  inicio,
  duracionMin = 30,
  ignorarTurnoId = null,
}) {
  if (!(inicio instanceof Date) || isNaN(inicio.getTime())) {
    return { ok: false, motivo: 'La fecha y hora seleccionadas no son válidas.' }
  }

  const fin = new Date(inicio.getTime() + duracionMin * 60000)

  // Ventana de búsqueda generosa (±8h) para capturar turnos largos que
  // empezaron antes y todavía siguen ocupando la franja.
  const desde = new Date(inicio.getTime() - 8 * 3600000).toISOString()
  const hasta = new Date(fin.getTime() + 8 * 3600000).toISOString()

  let query = supabase
    .from('turnos')
    .select('id, fecha_hora, estado, empleado_id, servicios(duracion_minutos)')
    .eq('negocio_id', negocioId)
    .gte('fecha_hora', desde)
    .lte('fecha_hora', hasta)

  // `.eq(col, null)` NO filtra por NULL en PostgREST: hay que usar `.is`.
  // Sin esto, los negocios que no cargaron staff no detectaban ninguna colisión.
  query = empleadoId ? query.eq('empleado_id', empleadoId) : query.is('empleado_id', null)

  const { data, error } = await query

  if (error) {
    // Ante un error de red preferimos no bloquear la reserva, pero lo avisamos.
    console.error('No se pudo verificar disponibilidad:', error.message)
    return { ok: true, motivo: null }
  }

  const choque = (data || []).some((t) => {
    if (ignorarTurnoId && t.id === ignorarTurnoId) return false
    if (!ocupaHorario(t)) return false
    const tIni = parseFecha(t.fecha_hora)
    if (!tIni) return false
    const tFin = new Date(tIni.getTime() + duracionTurno(t) * 60000)
    return seSolapan(inicio.getTime(), fin.getTime(), tIni.getTime(), tFin.getTime())
  })

  return choque
    ? { ok: false, motivo: 'Ese horario acaba de ocuparse. Elegí otro, por favor.' }
    : { ok: true }
}

/** Horarios por defecto para un negocio nuevo (Lun a Vie de 9 a 18). */
export function horariosPorDefecto() {
  const laboral = { abierto: true, inicio: '09:00', fin: '18:00', pausa: false, inicioPausa: '13:00', finPausa: '14:00' }
  const cerrado = { abierto: false, inicio: '10:00', fin: '14:00', pausa: false, inicioPausa: '13:00', finPausa: '14:00' }
  return {
    lunes: { ...laboral },
    martes: { ...laboral },
    miercoles: { ...laboral },
    jueves: { ...laboral },
    viernes: { ...laboral },
    sabado: { ...cerrado },
    domingo: { ...cerrado },
  }
}

const DIAS = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo']

/**
 * Normaliza el JSON de horarios: completa los días faltantes y sanea valores.
 * Varios negocios activos tienen el campo a medio llenar (o en null) y eso
 * hacía explotar la pantalla de Horarios con "cannot read property of undefined".
 */
export function normalizarHorarios(horarios) {
  const base = horariosPorDefecto()
  if (!horarios || typeof horarios !== 'object') return base

  const salida = {}
  for (const dia of DIAS) {
    const d = horarios[dia] || {}
    salida[dia] = {
      abierto: typeof d.abierto === 'boolean' ? d.abierto : base[dia].abierto,
      inicio: typeof d.inicio === 'string' && d.inicio ? d.inicio : base[dia].inicio,
      fin: typeof d.fin === 'string' && d.fin ? d.fin : base[dia].fin,
      pausa: Boolean(d.pausa),
      inicioPausa: typeof d.inicioPausa === 'string' && d.inicioPausa ? d.inicioPausa : '13:00',
      finPausa: typeof d.finPausa === 'string' && d.finPausa ? d.finPausa : '14:00',
    }
  }
  return salida
}

/** ¿El negocio tiene al menos un día abierto configurado? */
export function tieneHorariosConfigurados(negocio) {
  const h = negocio?.horarios
  if (!h || typeof h !== 'object') return false
  return Object.values(h).some((d) => d && d.abierto)
}

/**
 * URL segura para incrustar un mapa.
 *
 * El campo `mapa_url` lo escribe el dueño del negocio y se inyectaba tal cual
 * en un `<iframe src>`, tanto en el panel como en la app pública: cualquier
 * sitio (o un `javascript:`) quedaba embebido. Acá sólo dejamos pasar Google
 * Maps y devolvemos null si no lo es.
 *
 * @returns {string|null} URL de embed o null si no es válida
 */
export function mapaEmbedUrl(valor, direccionFallback = '') {
  const texto = String(valor || '').trim()
  if (!texto) return null

  // Caso 1: pegaron el <iframe> completo que da "Insertar un mapa".
  const desdeIframe = texto.match(/<iframe[^>]+src="([^"]+)"/i)
  const candidato = desdeIframe ? desdeIframe[1] : texto

  let url
  try {
    url = new URL(candidato)
  } catch {
    // No es una URL: lo tratamos como una dirección escrita a mano.
    const consulta = candidato || direccionFallback
    return consulta ? `https://www.google.com/maps?q=${encodeURIComponent(consulta)}&output=embed` : null
  }

  if (url.protocol !== 'https:') return null

  const HOSTS = ['google.com', 'www.google.com', 'maps.google.com', 'goo.gl', 'maps.app.goo.gl']
  const hostOk = HOSTS.includes(url.hostname) || /(^|\.)google\.[a-z.]+$/i.test(url.hostname)
  if (!hostOk) return null

  // Los embeds oficiales ya vienen listos.
  if (url.pathname.startsWith('/maps/embed')) return url.toString()

  // Links cortos o de navegador: los pasamos por el modo embed de Maps.
  return `https://www.google.com/maps?q=${encodeURIComponent(url.toString())}&output=embed`
}
