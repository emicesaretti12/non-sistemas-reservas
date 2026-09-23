/**
 * Tests del almacén local y de la caché de red.
 *
 *   npm test
 *
 * El almacén se prueba contra un `localStorage` falso con cuota, para cubrir
 * los casos que en un celular real aparecen sin aviso: modo privado, cuota
 * llena, datos corruptos, entradas vencidas.
 */

import { test, describe, beforeEach } from 'node:test'
import assert from 'node:assert/strict'

import {
  _usarBackend, guardar, leer, leerEntrada, borrar, borrarPrefijo,
  purgarVencidos, suscribir, liberarEspacio, PREFIJO,
} from './almacen.js'
import {
  crearFetchConCache, claveDeCopia, usuarioDelPedido, hashCorto, limpiarCopias,
} from './cacheRed.js'

class AlmacenFalso {
  constructor(cuota = Infinity) {
    this.m = new Map()
    this.cuota = cuota
  }
  get length() { return this.m.size }
  key(i) { return [...this.m.keys()][i] ?? null }
  getItem(k) { return this.m.has(k) ? this.m.get(k) : null }
  setItem(k, v) {
    let total = String(k).length + String(v).length
    for (const [kk, vv] of this.m) if (kk !== k) total += kk.length + vv.length
    if (total > this.cuota) {
      const e = new Error('cuota')
      e.name = 'QuotaExceededError'
      throw e
    }
    this.m.set(k, String(v))
  }
  removeItem(k) { this.m.delete(k) }
}

describe('almacen', () => {
  let ls
  beforeEach(() => {
    ls = new AlmacenFalso()
    _usarBackend(ls)
  })

  test('guarda y lee valores con espacio de nombres', () => {
    guardar('ui:tab', 'agenda')
    assert.equal(leer('ui:tab'), 'agenda')
    assert.ok(ls.getItem(`${PREFIJO}ui:tab`).includes('"agenda"'))
    assert.equal(leer('no-existe', 'def'), 'def')
  })

  test('respeta objetos y valores falsy', () => {
    guardar('a', { x: 1, lista: [1, 2] })
    guardar('cero', 0)
    guardar('falso', false)
    assert.deepEqual(leer('a'), { x: 1, lista: [1, 2] })
    assert.equal(leer('cero', 9), 0)
    assert.equal(leer('falso', true), false)
  })

  test('las entradas vencidas se descartan al leer', () => {
    guardar('temporal', 'hola', { ttl: 1000 })
    const entrada = leerEntrada('temporal')
    assert.equal(entrada.valor, 'hola')
    assert.equal(leerEntrada('temporal', Date.now() + 2000), null)
    assert.equal(ls.getItem(`${PREFIJO}temporal`), null)
  })

  test('datos corruptos no rompen: devuelven el valor por defecto y se limpian', () => {
    ls.setItem(`${PREFIJO}roto`, '{no es json')
    ls.setItem(`${PREFIJO}viejo`, JSON.stringify({ formato: 'anterior' }))
    assert.equal(leer('roto', 'def'), 'def')
    assert.equal(leer('viejo', 'def'), 'def')
    assert.equal(ls.getItem(`${PREFIJO}roto`), null)
  })

  test('sin localStorage funciona en memoria', () => {
    _usarBackend(null)
    assert.equal(guardar('x', 5), true)
    assert.equal(leer('x'), 5)
  })

  test('localStorage que tira en cada llamada (modo privado) cae a memoria', () => {
    const hostil = {
      length: 0,
      key() { throw new Error('bloqueado') },
      getItem() { throw new Error('bloqueado') },
      setItem() { throw new Error('bloqueado') },
      removeItem() { throw new Error('bloqueado') },
    }
    _usarBackend(hostil)
    assert.equal(guardar('x', 'y'), false)
    assert.equal(leer('x'), 'y')
  })

  test('con la cuota llena libera caché vieja y nunca preferencias', () => {
    ls = new AlmacenFalso(900)
    _usarBackend(ls)
    guardar('ui:pref', 'importante')
    for (let i = 0; i < 6; i++) guardar(`cache:u:t:${i}`, 'x'.repeat(60))
    const grande = 'y'.repeat(300)
    assert.equal(guardar('borrador', grande), true)
    assert.equal(leer('borrador'), grande)
    assert.equal(leer('ui:pref'), 'importante')
    assert.ok(leer('cache:u:t:0') === null, 'la copia más vieja se fue primero')
  })

  test('liberarEspacio borra primero lo vencido', () => {
    guardar('cache:a', 1, { ttl: 1 })
    guardar('cache:b', 2)
    const n = liberarEspacio(1, Date.now() + 10)
    assert.equal(n, 1)
    assert.equal(leer('cache:b'), 2)
  })

  test('borrarPrefijo y purgarVencidos', () => {
    guardar('cache:u1:turnos:1', 1)
    guardar('cache:u1:clientes:1', 2)
    guardar('cache:u2:turnos:1', 3)
    guardar('vence', 1, { ttl: 1 })
    assert.equal(borrarPrefijo('cache:u1:'), 2)
    assert.equal(leer('cache:u2:turnos:1'), 3)
    assert.equal(purgarVencidos(Date.now() + 10), 1)
  })

  test('suscribir avisa escrituras y borrados, y se puede desuscribir', () => {
    const vistos = []
    const salir = suscribir('k', v => vistos.push(v))
    guardar('k', 1)
    borrar('k')
    salir()
    guardar('k', 2)
    assert.deepEqual(vistos, [1, null])
  })
})

function jwt(sub) {
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url')
  return `${b64({ alg: 'HS256' })}.${b64({ sub, role: 'authenticated' })}.firma`
}

const URL_TURNOS = 'https://x.supabase.co/rest/v1/turnos?select=*&negocio_id=eq.1'

describe('cacheRed', () => {
  beforeEach(() => _usarBackend(new AlmacenFalso()))

  test('usuarioDelPedido lee el sub del JWT', () => {
    assert.equal(usuarioDelPedido(new Headers({ Authorization: `Bearer ${jwt('abc')}` })), 'abc')
    assert.equal(usuarioDelPedido(new Headers()), 'anon')
    assert.equal(usuarioDelPedido(new Headers({ Authorization: 'Bearer basura' })), 'anon')
  })

  test('la clave separa usuario, tabla y forma del pedido', () => {
    const base = { url: URL_TURNOS, metodo: 'GET' }
    const a = claveDeCopia({ ...base, headers: new Headers({ Authorization: `Bearer ${jwt('u1')}` }) })
    const b = claveDeCopia({ ...base, headers: new Headers({ Authorization: `Bearer ${jwt('u2')}` }) })
    const c = claveDeCopia({ ...base, headers: new Headers({ Authorization: `Bearer ${jwt('u1')}`, Accept: 'application/vnd.pgrst.object+json' }) })
    assert.ok(a.startsWith('cache:u1:turnos:'))
    assert.notEqual(a, b)
    assert.notEqual(a, c)
    assert.equal(hashCorto('hola'), hashCorto('hola'))
  })

  test('con red guarda la copia; sin red la devuelve', async () => {
    const headers = { Authorization: `Bearer ${jwt('u1')}` }
    let online = true
    const base = async () => {
      if (!online) throw new TypeError('Failed to fetch')
      return new Response('[{"id":1}]', { status: 200, headers: { 'content-type': 'application/json', 'content-range': '0-0/1' } })
    }
    const f = crearFetchConCache(base, { espera: 50 })

    const r1 = await f(URL_TURNOS, { method: 'GET', headers })
    assert.equal(await r1.text(), '[{"id":1}]')
    await new Promise(r => setTimeout(r, 5))

    online = false
    const r2 = await f(URL_TURNOS, { method: 'GET', headers })
    assert.equal(r2.headers.get('x-noni-cache'), 'hit')
    assert.equal(r2.headers.get('content-range'), '0-0/1')
    assert.deepEqual(await r2.json(), [{ id: 1 }])
  })

  test('sin copia, el error de red llega al que llamó', async () => {
    const f = crearFetchConCache(async () => { throw new TypeError('Failed to fetch') })
    await assert.rejects(() => f(URL_TURNOS, { method: 'GET' }), /Failed to fetch/)
  })

  test('las escrituras nunca se cachean ni se sirven de copia', async () => {
    let llamadas = 0
    const f = crearFetchConCache(async () => { llamadas++; return new Response('{}', { status: 201 }) })
    await f(URL_TURNOS, { method: 'POST', body: '{}' })
    await f(URL_TURNOS, { method: 'PATCH', body: '{}' })
    assert.equal(llamadas, 2)
    assert.equal(limpiarCopias(), 0)
  })

  test('un 503 con copia disponible sirve la copia; un 401 no', async () => {
    let status = 200
    const f = crearFetchConCache(async () => new Response(status === 200 ? '[1]' : '{"error":1}', { status }), { espera: 50 })
    await (await f(URL_TURNOS)).text()
    await new Promise(r => setTimeout(r, 5))
    status = 503
    assert.equal((await f(URL_TURNOS)).headers.get('x-noni-cache'), 'hit')
    status = 401
    assert.equal((await f(URL_TURNOS)).status, 401)
  })

  test('red lenta con copia: responde la copia a tiempo', async () => {
    let lenta = false
    const f = crearFetchConCache(async () => {
      if (lenta) await new Promise(r => setTimeout(r, 200))
      return new Response('[2]', { status: 200 })
    }, { espera: 30 })
    await (await f(URL_TURNOS)).text()
    await new Promise(r => setTimeout(r, 5))
    lenta = true
    const t0 = Date.now()
    const r = await f(URL_TURNOS)
    assert.ok(Date.now() - t0 < 150)
    assert.equal(r.headers.get('x-noni-cache'), 'hit')
  })

  test('limpiarCopias borra sólo la caché', async () => {
    guardar('ui:tab', 'agenda')
    const f = crearFetchConCache(async () => new Response('[]', { status: 200 }))
    await (await f(URL_TURNOS)).text()
    await new Promise(r => setTimeout(r, 5))
    assert.equal(limpiarCopias(), 1)
    assert.equal(leer('ui:tab'), 'agenda')
  })
})
