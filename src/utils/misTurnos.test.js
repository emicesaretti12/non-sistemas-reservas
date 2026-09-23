import { test, describe, beforeEach } from 'node:test'
import assert from 'node:assert/strict'

import { _usarBackend } from './almacen.js'
import {
  leerCliente, recordarCliente, olvidarCliente,
  recordarTurno, turnosVigentes, proximoTurnoEn, cuandoEs,
} from './misTurnos.js'

const HORA = 60 * 60 * 1000

describe('misTurnos', () => {
  beforeEach(() => _usarBackend(null))

  test('recuerda y devuelve los datos del cliente', () => {
    assert.deepEqual(leerCliente(), { nombre: '', telefono: '', email: '' })
    recordarCliente({ nombre: ' Ana ', telefono: '11 5555', email: '' })
    assert.deepEqual(leerCliente(), { nombre: 'Ana', telefono: '11 5555', email: '' })
    olvidarCliente()
    assert.equal(leerCliente().nombre, '')
  })

  test('no guarda un cliente vacío', () => {
    recordarCliente({ nombre: '  ', telefono: '' })
    assert.equal(leerCliente().nombre, '')
  })

  test('guarda turnos, ignora duplicados y descarta los terminados', () => {
    const ahora = Date.now()
    const futuro = new Date(ahora + 48 * HORA).toISOString()
    const pasado = new Date(ahora - 5 * HORA).toISOString()
    recordarTurno({ negocioId: 'n1', inicio: futuro, duracion: 30, servicio: 'Corte' }, ahora)
    recordarTurno({ negocioId: 'n1', inicio: futuro, duracion: 30, servicio: 'Corte' }, ahora)
    recordarTurno({ negocioId: 'n1', inicio: pasado, duracion: 30 }, ahora - 6 * HORA)
    assert.equal(turnosVigentes(ahora).length, 1)
    assert.equal(proximoTurnoEn('n1', ahora).servicio, 'Corte')
    assert.equal(proximoTurnoEn('n2', ahora), null)
  })

  test('el turno en curso sigue visible hasta que termina', () => {
    const ahora = Date.now()
    const empezo = new Date(ahora - 10 * 60000).toISOString()
    recordarTurno({ negocioId: 'n1', inicio: empezo, duracion: 45 }, ahora - HORA)
    assert.ok(proximoTurnoEn('n1', ahora))
    assert.equal(proximoTurnoEn('n1', ahora + HORA), null)
  })

  test('cuandoEs', () => {
    const base = new Date(2026, 8, 23, 10, 0)
    assert.equal(cuandoEs(new Date(2026, 8, 23, 18, 0), base), 'Hoy')
    assert.equal(cuandoEs(new Date(2026, 8, 24, 9, 0), base), 'Mañana')
    assert.equal(cuandoEs(new Date(2026, 8, 26, 9, 0), base), 'En 3 días')
    assert.match(cuandoEs(new Date(2026, 9, 10, 9, 0), base), /octubre/)
  })
})
