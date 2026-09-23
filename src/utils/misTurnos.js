/**
 * Memoria del cliente en la app pública.
 *
 * Quien reserva desde el link de un negocio no tiene cuenta: todo lo que la
 * app "sabe" de esa persona vive en su propio teléfono.
 *
 *   · Sus datos de contacto, para no tipearlos cada vez (en cualquier
 *     negocio que use Noni: es la misma persona).
 *   · Sus turnos futuros, para mostrarle "Tu próximo turno" al volver al
 *     link en lugar de hacerle buscar el mensaje de confirmación.
 *
 * Nada de esto sale del dispositivo.
 */

import { guardar, leer, borrar } from './almacen.js'

const CLAVE_CLIENTE = 'publico:cliente'
const CLAVE_TURNOS = 'publico:turnos'
const CIENTO_OCHENTA_DIAS = 180 * 24 * 60 * 60 * 1000
const MAX_TURNOS = 12

export function leerCliente() {
  const c = leer(CLAVE_CLIENTE)
  if (!c || typeof c !== 'object') return { nombre: '', telefono: '', email: '' }
  return {
    nombre: typeof c.nombre === 'string' ? c.nombre : '',
    telefono: typeof c.telefono === 'string' ? c.telefono : '',
    email: typeof c.email === 'string' ? c.email : '',
  }
}

export function recordarCliente({ nombre = '', telefono = '', email = '' }) {
  if (!nombre.trim() && !telefono.trim()) return
  guardar(CLAVE_CLIENTE, { nombre: nombre.trim(), telefono: telefono.trim(), email: email.trim() }, { ttl: CIENTO_OCHENTA_DIAS })
}

export function olvidarCliente() {
  borrar(CLAVE_CLIENTE)
  borrar(CLAVE_TURNOS)
}

const finDe = (t) => new Date(t.inicio).getTime() + (Number(t.duracion) || 30) * 60000

/** Turnos que todavía no terminaron, del más cercano al más lejano. */
export function turnosVigentes(ahora = Date.now()) {
  const lista = leer(CLAVE_TURNOS, [])
  if (!Array.isArray(lista)) return []
  return lista
    .filter((t) => t && t.inicio && !Number.isNaN(new Date(t.inicio).getTime()) && finDe(t) > ahora)
    .sort((a, b) => new Date(a.inicio) - new Date(b.inicio))
}

export function recordarTurno(turno, ahora = Date.now()) {
  if (!turno?.inicio || !turno?.negocioId) return
  const lista = turnosVigentes(ahora).filter(
    (t) => !(t.negocioId === turno.negocioId && t.inicio === turno.inicio)
  )
  lista.push(turno)
  lista.sort((a, b) => new Date(a.inicio) - new Date(b.inicio))
  guardar(CLAVE_TURNOS, lista.slice(0, MAX_TURNOS), { ttl: CIENTO_OCHENTA_DIAS })
}

export function proximoTurnoEn(negocioId, ahora = Date.now()) {
  if (!negocioId) return null
  return turnosVigentes(ahora).find((t) => String(t.negocioId) === String(negocioId)) || null
}

/** "Hoy", "Mañana", "En 3 días" o la fecha, según cuánto falte. */
export function cuandoEs(inicio, ahora = new Date()) {
  const d = new Date(inicio)
  const dia = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime()
  const dias = Math.round((dia(d) - dia(ahora)) / 86400000)
  if (dias <= 0) return 'Hoy'
  if (dias === 1) return 'Mañana'
  if (dias < 7) return `En ${dias} días`
  return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'long' })
}
