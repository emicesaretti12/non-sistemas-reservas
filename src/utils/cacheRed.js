/**
 * Caché de red para las lecturas de Supabase.
 *
 * Estrategia "primero la red": cada lectura (`GET`/`HEAD` a `/rest/v1/`) va
 * al servidor como siempre y, si responde bien, la respuesta se copia al
 * almacén local. Sólo cuando la red falla —sin señal, timeout, un 502 del
 * proxy— se contesta con la última copia guardada. Así el panel abre en el
 * subte con la agenda de hoy en vez de una pantalla de error, y con señal
 * nunca se muestra nada viejo.
 *
 *   · Las copias son por usuario (el `sub` del JWT): en un celular compartido
 *     una cuenta no ve los datos de otra.
 *   · Con señal mala de verdad (la red no contesta en `ESPERA_CON_COPIA`) y
 *     una copia disponible, se muestra la copia y la respuesta real, si llega,
 *     actualiza la caché para la próxima.
 *   · Cada vez que se sirve una copia se avisa con el evento `noni:red`, para
 *     que la interfaz diga "mostrando datos guardados".
 */

import { guardar, leerEntrada, borrarPrefijo, PREFIJO_CACHE } from './almacen.js'

export const TTL_COPIA = 7 * 24 * 60 * 60 * 1000
export const MAX_CUERPO = 200 * 1024
export const ESPERA_CON_COPIA = 6000

/** Hash corto y estable (FNV-1a de 32 bits) para no guardar URLs enteras en la clave. */
export function hashCorto(texto) {
  let h = 0x811c9dc5
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0).toString(36)
}

/** Identifica al dueño del pedido por el `sub` del JWT; sin token, `anon`. */
export function usuarioDelPedido(headers) {
  const auth = headers.get('authorization') || ''
  const partes = auth.replace(/^Bearer\s+/i, '').split('.')
  if (partes.length !== 3) return 'anon'
  try {
    const json = JSON.parse(atob(partes[1].replace(/-/g, '+').replace(/_/g, '/')))
    return json.sub || 'anon'
  } catch {
    return 'anon'
  }
}

function datosDelPedido(input, init) {
  const esObjeto = typeof input === 'object' && input !== null && !(input instanceof URL)
  const url = typeof input === 'string' ? input : (input instanceof URL ? input.href : input.url)
  const metodo = String(init.method || (esObjeto && input.method) || 'GET').toUpperCase()
  const headers = new Headers(init.headers || (esObjeto ? input.headers : undefined))
  return { url, metodo, headers }
}

export function claveDeCopia({ url, metodo, headers }) {
  const u = new URL(url, 'http://local')
  const ruta = u.pathname.split('/rest/v1/')[1] || ''
  const tabla = ruta.split('/')[0] || 'x'
  const firma = [metodo, ruta, u.search, headers.get('accept') || '', headers.get('prefer') || ''].join('|')
  return `${PREFIJO_CACHE}${usuarioDelPedido(headers)}:${tabla}:${hashCorto(firma)}`
}

function avisar(detalle) {
  if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function') return
  try { window.dispatchEvent(new CustomEvent('noni:red', { detail: detalle })) } catch { /* sin DOM */ }
}

function respuestaDesdeCopia(copia, metodo) {
  const { status, cuerpo, tipo, rango } = copia.valor
  const headers = new Headers({ 'x-noni-cache': 'hit' })
  if (tipo) headers.set('content-type', tipo)
  if (rango) headers.set('content-range', rango)
  return new Response(metodo === 'HEAD' ? null : cuerpo, { status: status || 200, headers })
}

function copiar(clave, respuesta, metodo) {
  const tipo = respuesta.headers.get('content-type') || ''
  const rango = respuesta.headers.get('content-range') || ''
  const leerCuerpo = metodo === 'HEAD' ? Promise.resolve('') : respuesta.clone().text()
  return leerCuerpo.then((cuerpo) => {
    if (cuerpo.length > MAX_CUERPO) return
    guardar(clave, { status: respuesta.status, cuerpo, tipo, rango }, { ttl: TTL_COPIA })
  }).catch(() => { /* sin copia: no pasa nada */ })
}

const esRecuperable = (status) => status === 502 || status === 503 || status === 504

/**
 * Envuelve un `fetch` con la caché. `fetchBase` es el fetch real (con su
 * propio timeout); `opciones.espera` permite acortar la espera en tests.
 */
export function crearFetchConCache(fetchBase, { espera = ESPERA_CON_COPIA } = {}) {
  return function fetchConCache(input, init = {}) {
    const pedido = datosDelPedido(input, init)
    const esLectura = pedido.metodo === 'GET' || pedido.metodo === 'HEAD'
    if (!esLectura || !pedido.url.includes('/rest/v1/')) return fetchBase(input, init)

    const clave = claveDeCopia(pedido)
    const copia = leerEntrada(clave)

    const red = fetchBase(input, init).then((respuesta) => {
      if (respuesta.ok) {
        copiar(clave, respuesta, pedido.metodo)
        avisar({ estado: 'ok' })
      }
      return respuesta
    })

    if (!copia) return red

    const servirCopia = (motivo) => {
      avisar({ estado: 'copia', guardadoEn: copia.guardadoEn, motivo })
      return respuestaDesdeCopia(copia, pedido.metodo)
    }

    return new Promise((resolve, reject) => {
      let listo = false
      const terminar = (fn, valor) => {
        if (listo) return
        listo = true
        clearTimeout(reloj)
        fn(valor)
      }
      const reloj = setTimeout(() => terminar(resolve, servirCopia('lenta')), espera)

      red.then(
        (respuesta) => {
          if (esRecuperable(respuesta.status)) terminar(resolve, servirCopia('servidor'))
          else terminar(resolve, respuesta)
        },
        (error) => {
          // Si el que llamó canceló a propósito (desmontaje), respetamos el error.
          if (init.signal?.aborted) return terminar(reject, error)
          terminar(resolve, servirCopia('sin-red'))
        },
      )
    })
  }
}

/** Borra las copias de un usuario (o todas). Se llama al cerrar sesión. */
export function limpiarCopias(usuario) {
  return borrarPrefijo(usuario ? `${PREFIJO_CACHE}${usuario}:` : PREFIJO_CACHE)
}
