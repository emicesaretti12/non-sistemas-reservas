/**
 * Almacén local de Noni.
 *
 * Una sola puerta para todo lo que la app guarda en el dispositivo: la última
 * pestaña, los filtros, los borradores de formularios, la caché de datos para
 * abrir sin señal. Antes cada componente hablaba con `localStorage` por su
 * cuenta, con `try/catch` repetidos y sin vencimientos: un modo privado de
 * Safari o una cuota llena rompían cosas distintas en lugares distintos.
 *
 *   · Claves con espacio de nombres (`noni:v1:`): si mañana cambia el formato
 *     alcanza con subir la versión y lo viejo se ignora.
 *   · Cada entrada guarda `{ v, t, e }`: valor, cuándo se escribió y cuándo
 *     vence. Lo vencido se descarta al leer.
 *   · Si `localStorage` no existe o tira (modo privado, iframe con cookies
 *     bloqueadas), se usa memoria: la app funciona igual durante la sesión.
 *   · Con la cuota llena se liberan primero las entradas de caché más viejas
 *     y se reintenta; nunca se borran preferencias ni borradores para hacer
 *     lugar.
 *   · Cambios en otra pestaña llegan a los suscriptores por el evento
 *     `storage`, así dos pestañas abiertas no se pisan.
 */

export const PREFIJO = 'noni:v1:'
export const PREFIJO_CACHE = 'cache:'

const memoria = new Map()
const oyentes = new Map()

let backend = detectarBackend()

function detectarBackend() {
  try {
    const ls = globalThis.localStorage
    if (!ls) return null
    const prueba = `${PREFIJO}__prueba`
    ls.setItem(prueba, '1')
    ls.removeItem(prueba)
    return ls
  } catch {
    return null
  }
}

/** Sólo para tests: reemplaza el backend (o `null` para forzar memoria). */
export function _usarBackend(nuevo) {
  backend = nuevo
  memoria.clear()
  oyentes.clear()
}

function leerCrudo(clave) {
  if (backend) {
    try {
      const valor = backend.getItem(clave)
      if (valor != null) return valor
    } catch { /* cae a memoria */ }
  }
  return memoria.has(clave) ? memoria.get(clave) : null
}

function escribirCrudo(clave, texto) {
  if (!backend) {
    memoria.set(clave, texto)
    return true
  }
  try {
    backend.setItem(clave, texto)
    memoria.delete(clave)
    return true
  } catch {
    return false
  }
}

function borrarCrudo(clave) {
  memoria.delete(clave)
  if (!backend) return
  try { backend.removeItem(clave) } catch { /* nada que hacer */ }
}

function todasLasClaves() {
  const claves = new Set(memoria.keys())
  if (backend) {
    try {
      for (let i = 0; i < backend.length; i++) {
        const k = backend.key(i)
        if (k) claves.add(k)
      }
    } catch { /* sin acceso: sólo memoria */ }
  }
  return [...claves].filter(k => k.startsWith(PREFIJO))
}

function decodificar(texto) {
  if (texto == null) return null
  try {
    const entrada = JSON.parse(texto)
    if (!entrada || typeof entrada !== 'object' || !('v' in entrada)) return null
    return entrada
  } catch {
    return null
  }
}

function emitir(clave, valor) {
  const set = oyentes.get(clave)
  if (!set) return
  for (const cb of [...set]) {
    try { cb(valor) } catch (e) { console.warn('[almacen] oyente falló:', e) }
  }
}

/**
 * Devuelve `{ valor, guardadoEn, venceEn }` o `null` si no hay nada vigente.
 * Útil para mostrar "datos de hace 5 min" cuando se sirve algo de la caché.
 */
export function leerEntrada(clave, ahora = Date.now()) {
  const completa = PREFIJO + clave
  const texto = leerCrudo(completa)
  if (texto == null) return null
  const entrada = decodificar(texto)
  if (!entrada) {
    borrarCrudo(completa)
    return null
  }
  if (entrada.e && entrada.e <= ahora) {
    borrarCrudo(completa)
    return null
  }
  return { valor: entrada.v, guardadoEn: entrada.t || 0, venceEn: entrada.e || null }
}

export function leer(clave, porDefecto = null) {
  const entrada = leerEntrada(clave)
  return entrada ? entrada.valor : porDefecto
}

/**
 * Libera lugar borrando caché: primero lo vencido, después lo más viejo.
 * Devuelve cuántas entradas eliminó.
 */
export function liberarEspacio(cuantas = 8, ahora = Date.now()) {
  const candidatas = todasLasClaves()
    .filter(k => k.startsWith(PREFIJO + PREFIJO_CACHE))
    .map(k => {
      const e = decodificar(leerCrudo(k))
      const vencida = !e || (e.e && e.e <= ahora)
      return { k, t: vencida ? -1 : (e.t || 0) }
    })
    .sort((a, b) => a.t - b.t)

  let borradas = 0
  for (const { k, t } of candidatas) {
    if (borradas >= cuantas && t !== -1) break
    borrarCrudo(k)
    borradas++
  }
  return borradas
}

/**
 * Guarda un valor serializable. `ttl` en milisegundos (opcional).
 * Devuelve `true` si quedó persistido en el dispositivo y `false` si sólo
 * pudo quedar en memoria.
 */
export function guardar(clave, valor, { ttl } = {}) {
  if (valor === undefined) {
    borrar(clave)
    return true
  }
  const ahora = Date.now()
  const entrada = { v: valor, t: ahora }
  if (ttl) entrada.e = ahora + ttl

  let texto
  try {
    texto = JSON.stringify(entrada)
  } catch {
    return false
  }

  const completa = PREFIJO + clave
  let persistido = escribirCrudo(completa, texto)
  if (!persistido) {
    // Cuota llena: hacemos lugar con la caché y reintentamos dos veces.
    for (let intento = 0; intento < 2 && !persistido; intento++) {
      if (liberarEspacio(intento === 0 ? 8 : 64) === 0) break
      persistido = escribirCrudo(completa, texto)
    }
  }
  if (!persistido) memoria.set(completa, texto)

  emitir(clave, valor)
  return persistido
}

export function borrar(clave) {
  borrarCrudo(PREFIJO + clave)
  emitir(clave, null)
}

/** Borra todo lo que empiece con `prefijo` (sin el espacio de nombres). */
export function borrarPrefijo(prefijo) {
  const completo = PREFIJO + prefijo
  let n = 0
  for (const k of todasLasClaves()) {
    if (k.startsWith(completo)) {
      borrarCrudo(k)
      emitir(k.slice(PREFIJO.length), null)
      n++
    }
  }
  return n
}

/** Elimina entradas vencidas o corruptas. Se corre una vez al arrancar. */
export function purgarVencidos(ahora = Date.now()) {
  let n = 0
  for (const k of todasLasClaves()) {
    const e = decodificar(leerCrudo(k))
    if (!e || (e.e && e.e <= ahora)) {
      borrarCrudo(k)
      n++
    }
  }
  return n
}

/**
 * Escucha cambios de una clave: los de esta pestaña (vía `guardar`/`borrar`)
 * y los de otras pestañas (vía el evento `storage`). Devuelve la función para
 * dejar de escuchar.
 */
export function suscribir(clave, cb) {
  if (!oyentes.has(clave)) oyentes.set(clave, new Set())
  oyentes.get(clave).add(cb)
  return () => {
    const set = oyentes.get(clave)
    if (!set) return
    set.delete(cb)
    if (set.size === 0) oyentes.delete(clave)
  }
}

if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
  window.addEventListener('storage', (e) => {
    if (!e.key) {
      // `localStorage.clear()` en otra pestaña: avisamos a todos.
      for (const clave of oyentes.keys()) emitir(clave, null)
      return
    }
    if (!e.key.startsWith(PREFIJO)) return
    const clave = e.key.slice(PREFIJO.length)
    if (!oyentes.has(clave)) return
    const entrada = decodificar(e.newValue)
    emitir(clave, entrada ? entrada.v : null)
  })
}
