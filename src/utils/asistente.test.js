/**
 * Tests del motor de respuestas del asistente.
 *
 * Los bugs que cubren: la clasificación era una cadena de `includes()` en
 * orden fijo, así que preguntas normales caían en la respuesta equivocada.
 * "¿cuántos clientes tengo?" entraba por la rama de ocupación porque esa
 * rama miraba la palabra "cliente"; "¿a qué hora abro?" nunca llegaba más
 * allá de "hora"; y cualquier pregunta escrita sin tildes dependía de que
 * alguien hubiera listado las dos variantes a mano.
 */

import { test, describe } from 'node:test'
import assert from 'node:assert/strict'

import { responder, sugerencias, normalizar } from './asistente.js'

const CONTEXTO = {
  turnosHoy: 4,
  ingresosHoy: 18000,
  ingresosMes: 320000,
  turnosSemana: 19,
  ocupacion: 55,
  totalClientes: 31,
  clientesVIP: 3,
  stockBajo: 2,
  negocio: { nombre: 'Barbería Sur' },
  vocab: { servicio: 'servicio', empleado: 'barbero' },
}

describe('normalizar', () => {
  test('saca tildes, signos y mayúsculas', () => {
    assert.equal(normalizar('¿CÓMO está mi OCUPACIÓN?'), 'como esta mi ocupacion')
    assert.equal(normalizar('  Turnos,  hoy!  '), 'turnos hoy')
  })

  test('tolera valores vacíos o nulos', () => {
    assert.equal(normalizar(null), '')
    assert.equal(normalizar(undefined), '')
  })
})

describe('responder — clasificación de intención', () => {
  const CASOS = [
    ['hola, buenas', 'saludo'],
    ['¿cuántos turnos tengo hoy?', 'turnos_hoy'],
    ['cuantos turnos tengo hoy', 'turnos_hoy'],
    ['¿cómo viene mi ocupación?', 'ocupacion'],
    ['tengo lugares libres hoy', 'ocupacion'],
    ['¿cuántos clientes tengo?', 'clientes'],
    ['¿cuánto facturé este mes?', 'ingresos'],
    ['cómo agrego un servicio', 'crear_servicio'],
    ['cómo sumo a mi equipo', 'equipo'],
    ['¿a qué hora abro mañana?', 'horarios'],
    ['quiero cambiar mi logo', 'marca'],
    ['cómo comparto mi link', 'link'],
    ['necesito más clientes', 'mas_clientes'],
    ['me falta stock', 'stock'],
    ['quiero cancelar un turno', 'cancelar'],
    ['¿cómo empiezo?', 'empezar'],
    ['mostrame el panel', 'tour'],
    ['¿cuánto sale el plan?', 'precio_plan'],
    ['gracias!', 'agradecer'],
    ['chau', 'despedida'],
  ]

  for (const [pregunta, esperada] of CASOS) {
    test(`"${pregunta}" → ${esperada}`, () => {
      assert.equal(responder(pregunta, CONTEXTO).id, esperada)
    })
  }

  test('"cliente" dentro de una pregunta de ocupación no secuestra la respuesta', () => {
    // El bug original: la rama de ocupación miraba la palabra "cliente".
    assert.equal(responder('¿cuántos clientes nuevos tengo?', CONTEXTO).id, 'clientes')
  })

  test('lo que no entiende no lo inventa', () => {
    const r = responder('asdkjhasd qwe', CONTEXTO)
    assert.equal(r.id, 'sin_match')
    assert.match(r.texto, /Probá preguntándome/)
  })

  test('una consulta vacía no rompe', () => {
    assert.equal(responder('', CONTEXTO).id, 'vacio')
    assert.equal(responder(null, CONTEXTO).id, 'vacio')
  })
})

describe('responder — uso de los datos reales', () => {
  test('cuenta los turnos del día', () => {
    assert.match(responder('turnos de hoy', CONTEXTO).texto, /4 turnos/)
  })

  test('un solo turno va en singular', () => {
    assert.match(responder('turnos de hoy', { ...CONTEXTO, turnosHoy: 1 }).texto, /1 turno\b/)
  })

  test('sin turnos propone compartir el link en vez de un número vacío', () => {
    const r = responder('turnos de hoy', { ...CONTEXTO, turnosHoy: 0 })
    assert.match(r.texto, /no tenés turnos/i)
  })

  test('la respuesta de ocupación cambia según el porcentaje', () => {
    const baja = responder('ocupación', { ...CONTEXTO, ocupacion: 12 }).texto
    const alta = responder('ocupación', { ...CONTEXTO, ocupacion: 95 }).texto
    assert.notEqual(baja, alta)
    assert.match(baja, /12%/)
    assert.match(alta, /95%/)
  })

  test('sin clientes cargados explica de dónde salen', () => {
    const r = responder('mis clientes', { ...CONTEXTO, totalClientes: 0 })
    assert.match(r.texto, /Todavía no tenés clientes/)
  })

  test('el inventario en orden no inventa faltantes', () => {
    assert.match(responder('stock', { ...CONTEXTO, stockBajo: 0 }).texto, /en orden/)
  })

  test('funciona aunque no reciba contexto', () => {
    const r = responder('¿cuántos turnos tengo hoy?')
    assert.equal(typeof r.texto, 'string')
    assert.ok(r.texto.length > 0)
  })
})

describe('responder — acciones', () => {
  test('la respuesta del link ofrece copiarlo', () => {
    assert.deepEqual(responder('mi link', CONTEXTO).accion, { copiarLink: true, label: 'Copiar mi link' })
  })

  test('la respuesta de horarios lleva a la sección', () => {
    assert.equal(responder('mis horarios', CONTEXTO).accion.tab, 'horarios')
  })

  test('las respuestas conversacionales no arrastran acciones', () => {
    assert.equal(responder('gracias', CONTEXTO).accion, null)
  })
})

describe('sugerencias', () => {
  test('prioriza lo que falta configurar', () => {
    const s = sugerencias({ setupData: { hasServicios: false }, smartAlerts: {} })
    assert.match(s[0], /servicios/i)
  })

  test('devuelve siempre cuatro y sin huecos', () => {
    const s = sugerencias({ setupData: { hasServicios: true, hasHorarios: true, hasEmpleados: true, hasShared: true }, smartAlerts: {} })
    assert.equal(s.length, 4)
    assert.ok(s.every((x) => typeof x === 'string' && x.length > 0))
  })

  test('no explota sin argumentos', () => {
    assert.equal(sugerencias({}).length, 4)
  })
})
