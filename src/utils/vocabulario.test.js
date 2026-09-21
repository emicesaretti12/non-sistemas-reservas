/**
 * Tests del vocabulario por rubro.
 *
 * El bug que cubren: la búsqueda era por coincidencia EXACTA de string, así
 * que un rubro guardado como "Barberia / Peluqueria" (sin tildes) hacía que
 * toda la app cayera al vocabulario genérico y el cliente final leyera
 * "Seleccione un recurso" en vez de "Seleccione un especialista".
 */

import { test, describe } from 'node:test'
import assert from 'node:assert/strict'

import { getVocabulario, RUBROS_DISPONIBLES, esGastronomia } from './vocabulario.js'

describe('getVocabulario', () => {
  test('todos los rubros del onboarding tienen vocabulario propio', () => {
    const generico = getVocabulario('algo que no existe en ningun lado')
    for (const rubro of RUBROS_DISPONIBLES) {
      if (rubro === 'Otros Servicios') continue
      assert.notEqual(getVocabulario(rubro), generico, `"${rubro}" cae al genérico`)
    }
  })

  test('tolera la falta de acentos', () => {
    assert.equal(getVocabulario('Barberia / Peluqueria'), getVocabulario('Barbería / Peluquería'))
    assert.equal(getVocabulario('Restaurante / Gastronomia'), getVocabulario('Restaurante / Gastronomía'))
    assert.equal(getVocabulario('Unas / Manicuria'), getVocabulario('Uñas / Manicuría'))
  })

  test('tolera mayúsculas y espaciado raro', () => {
    const esperado = getVocabulario('Barbería / Peluquería')
    assert.equal(getVocabulario('BARBERÍA / PELUQUERÍA'), esperado)
    assert.equal(getVocabulario('barbería/peluquería'), esperado)
    assert.equal(getVocabulario('  Barbería  /  Peluquería  '), esperado)
  })

  test('resuelve nombres cortos y alias', () => {
    assert.equal(getVocabulario('Barberia'), getVocabulario('Barbería / Peluquería'))
    assert.equal(getVocabulario('gimnasio'), getVocabulario('Gimnasio / Entrenamiento'))
    assert.equal(getVocabulario('Tattoo'), getVocabulario('Tatuajes / Piercings'))
  })

  test('un rubro desconocido no rompe: devuelve el genérico completo', () => {
    const v = getVocabulario('Lavadero de autos')
    assert.equal(typeof v.servicio, 'string')
    assert.equal(typeof v.paso1Titulo, 'string')
    assert.equal(typeof v.waConfirmacion, 'function')
  })

  test('null / undefined / vacío devuelven el genérico sin explotar', () => {
    for (const valor of [null, undefined, '', '   ']) {
      const v = getVocabulario(valor)
      assert.equal(typeof v.servicio, 'string')
    }
  })

  test('el vocabulario expone todas las claves que usa la app', () => {
    const requeridas = [
      'servicio', 'servicios', 'empleado', 'empleados', 'cliente', 'clientes',
      'clientePlural', 'paso1Titulo', 'paso2Titulo', 'paso2Volver', 'paso3Volver',
      'paso4Titulo', 'paso4Volver', 'ticketTitulo', 'exitoTitulo', 'confirmarBtn',
      'tabServicios', 'tabStaff', 'tabClientes', 'fallbackStaff', 'citasAsignadas',
      'citasRegistradas', 'nuevaCita', 'shareWA', 'iconoServicio',
    ]
    for (const rubro of RUBROS_DISPONIBLES) {
      const v = getVocabulario(rubro)
      for (const clave of requeridas) {
        assert.ok(v[clave] !== undefined, `"${rubro}" no define "${clave}"`)
      }
    }
  })
})

describe('esGastronomia', () => {
  test('reconoce gastronomía y bares, con o sin acentos', () => {
    assert.equal(esGastronomia('Restaurante / Gastronomía'), true)
    assert.equal(esGastronomia('Restaurante / Gastronomia'), true)
    assert.equal(esGastronomia('Bar / Cervecería'), true)
    assert.equal(esGastronomia('Barbería / Peluquería'), false)
    assert.equal(esGastronomia(null), false)
  })
})
