/**
 * Tests de la lógica de reservas.
 *
 * Se corren con el runner nativo de Node (sin dependencias extra):
 *   npm test
 *
 * Cubren los bugs que llegaron a producción:
 *   · turnos solapados que la app dejaba entrar
 *   · ingresos que desaparecían al marcar un turno como atendido
 *   · horarios con el JSON incompleto que rompían la pantalla
 *   · URLs arbitrarias embebidas en el iframe del mapa
 */

import { test, describe } from 'node:test'
import assert from 'node:assert/strict'

import {
  ocupaHorario,
  factura,
  precioTurno,
  duracionTurno,
  parseFecha,
  seSolapan,
  verificarDisponibilidad,
  normalizarHorarios,
  horariosPorDefecto,
  tieneHorariosConfigurados,
  mapaEmbedUrl,
} from './reservas.js'

describe('estados de un turno', () => {
  test('un turno atendido sigue ocupando el horario y facturando', () => {
    const turno = { estado: 'completado', servicios: { precio: 5000 } }
    assert.equal(ocupaHorario(turno), true)
    assert.equal(factura(turno), true)
  })

  test('cancelado y ausencia liberan el horario y no facturan', () => {
    for (const estado of ['cancelado', 'no_show']) {
      assert.equal(ocupaHorario({ estado }), false, estado)
      assert.equal(factura({ estado }), false, estado)
    }
  })

  test('un turno viejo sin estado se trata como activo', () => {
    assert.equal(ocupaHorario({ estado: null }), true)
    assert.equal(ocupaHorario({}), true)
  })

  test('precio y duración toleran servicios borrados', () => {
    assert.equal(precioTurno({ servicios: null }), 0)
    assert.equal(precioTurno({ servicios: { precio: '4500' } }), 4500)
    assert.equal(duracionTurno({ servicios: null }), 30)
    assert.equal(duracionTurno({ servicios: { duracion_minutos: 0 } }), 30)
    assert.equal(duracionTurno({ servicios: { duracion_minutos: 90 } }), 90)
  })
})

describe('parseo de fechas de Supabase', () => {
  test('acepta los formatos que devuelve Postgres', () => {
    const esperado = Date.UTC(2026, 8, 20, 15, 0, 0)
    for (const valor of [
      '2026-09-20T15:00:00Z',
      '2026-09-20 15:00:00+00',
      '2026-09-20 15:00:00+00:00',
      '2026-09-20T15:00:00',
    ]) {
      assert.equal(parseFecha(valor).getTime(), esperado, valor)
    }
  })

  test('respeta un offset distinto de UTC', () => {
    assert.equal(
      parseFecha('2026-09-20T15:00:00-03:00').getTime(),
      Date.UTC(2026, 8, 20, 18, 0, 0)
    )
  })

  test('devuelve null ante basura', () => {
    assert.equal(parseFecha(''), null)
    assert.equal(parseFecha(null), null)
    assert.equal(parseFecha('no-es-una-fecha'), null)
  })
})

describe('solapamiento de intervalos', () => {
  test('detecta el pisado parcial', () => {
    // 10:00-11:00 contra 10:30-11:00
    assert.equal(seSolapan(600, 660, 630, 690), true)
  })

  test('dos turnos consecutivos NO se solapan', () => {
    // 10:00-10:30 y 10:30-11:00
    assert.equal(seSolapan(600, 630, 630, 660), false)
  })
})

// ── Doble de prueba mínimo del cliente de Supabase ──────────────────────────
function supabaseFalso(filas, { error = null } = {}) {
  const query = {
    _empleado: undefined,
    _esNulo: false,
    select: () => query,
    eq(col, val) { if (col === 'empleado_id') { query._empleado = val } return query },
    is(col) { if (col === 'empleado_id') { query._esNulo = true } return query },
    gte: () => query,
    lte: () => query,
    then(resolve) {
      const data = filas.filter((f) =>
        query._esNulo ? f.empleado_id == null : f.empleado_id === query._empleado
      )
      return Promise.resolve(error ? { data: null, error } : { data, error: null }).then(resolve)
    },
  }
  return { from: () => query }
}

describe('verificarDisponibilidad', () => {
  const base = {
    negocioId: 'neg-1',
    empleadoId: 'emp-1',
    inicio: new Date('2026-09-20T13:00:00Z'),
    duracionMin: 30,
  }

  test('rechaza un turno que se pisa con uno existente más largo', async () => {
    // Ya hay un corte de 60' a las 12:30 → choca con las 13:00
    const db = supabaseFalso([
      { id: 't1', empleado_id: 'emp-1', estado: 'confirmado', fecha_hora: '2026-09-20T12:30:00Z', servicios: { duracion_minutos: 60 } },
    ])
    const r = await verificarDisponibilidad(db, base)
    assert.equal(r.ok, false)
  })

  test('acepta un turno pegado al anterior sin pisarlo', async () => {
    const db = supabaseFalso([
      { id: 't1', empleado_id: 'emp-1', estado: 'confirmado', fecha_hora: '2026-09-20T12:30:00Z', servicios: { duracion_minutos: 30 } },
    ])
    const r = await verificarDisponibilidad(db, base)
    assert.equal(r.ok, true)
  })

  test('un turno cancelado libera la franja', async () => {
    const db = supabaseFalso([
      { id: 't1', empleado_id: 'emp-1', estado: 'cancelado', fecha_hora: '2026-09-20T13:00:00Z', servicios: { duracion_minutos: 30 } },
    ])
    const r = await verificarDisponibilidad(db, base)
    assert.equal(r.ok, true)
  })

  test('negocio sin staff: detecta el choque con empleado_id NULL', async () => {
    // Este era el bug: `.eq("empleado_id", null)` no filtra NULL en PostgREST,
    // así que nunca se encontraba ninguna colisión y se sobrevendía el horario.
    const db = supabaseFalso([
      { id: 't1', empleado_id: null, estado: 'confirmado', fecha_hora: '2026-09-20T13:00:00Z', servicios: { duracion_minutos: 30 } },
    ])
    const r = await verificarDisponibilidad(db, { ...base, empleadoId: null })
    assert.equal(r.ok, false)
  })

  test('ignora el propio turno al reprogramar', async () => {
    const db = supabaseFalso([
      { id: 't1', empleado_id: 'emp-1', estado: 'confirmado', fecha_hora: '2026-09-20T13:00:00Z', servicios: { duracion_minutos: 30 } },
    ])
    const r = await verificarDisponibilidad(db, { ...base, ignorarTurnoId: 't1' })
    assert.equal(r.ok, true)
  })

  test('rechaza una fecha inválida', async () => {
    const r = await verificarDisponibilidad(supabaseFalso([]), { ...base, inicio: new Date('nada') })
    assert.equal(r.ok, false)
  })

  test('ante un error de red no bloquea la reserva', async () => {
    const db = supabaseFalso([], { error: { message: 'network' } })
    const r = await verificarDisponibilidad(db, base)
    assert.equal(r.ok, true)
  })
})

describe('normalización de horarios', () => {
  test('completa los días faltantes', () => {
    const h = normalizarHorarios({ lunes: { abierto: true, inicio: '10:00', fin: '20:00' } })
    assert.equal(h.lunes.inicio, '10:00')
    assert.equal(h.lunes.pausa, false)
    // domingo no venía en el JSON: no puede quedar undefined
    assert.ok(h.domingo)
    assert.equal(typeof h.domingo.abierto, 'boolean')
  })

  test('un JSON nulo devuelve los valores por defecto', () => {
    assert.deepEqual(normalizarHorarios(null), horariosPorDefecto())
    assert.deepEqual(normalizarHorarios('roto'), horariosPorDefecto())
  })

  test('detecta si el negocio puede recibir reservas', () => {
    assert.equal(tieneHorariosConfigurados({ horarios: null }), false)
    assert.equal(tieneHorariosConfigurados({ horarios: {} }), false)
    assert.equal(tieneHorariosConfigurados({ horarios: { lunes: { abierto: false } } }), false)
    assert.equal(tieneHorariosConfigurados({ horarios: { lunes: { abierto: true } } }), true)
    assert.equal(tieneHorariosConfigurados({ horarios: horariosPorDefecto() }), true)
  })
})

describe('saneo del mapa', () => {
  test('acepta un embed oficial de Google', () => {
    const url = 'https://www.google.com/maps/embed?pb=!1m18!1m12'
    assert.equal(mapaEmbedUrl(url), url)
  })

  test('extrae el src de un iframe pegado entero', () => {
    const html = '<iframe src="https://www.google.com/maps/embed?pb=!1m18" width="600"></iframe>'
    assert.equal(mapaEmbedUrl(html), 'https://www.google.com/maps/embed?pb=!1m18')
  })

  test('rechaza cualquier host que no sea Google', () => {
    assert.equal(mapaEmbedUrl('https://sitio-malicioso.com/x'), null)
    assert.equal(mapaEmbedUrl('http://www.google.com/maps'), null) // sin https
  })

  test('rechaza javascript: y data:', () => {
    assert.equal(mapaEmbedUrl('javascript:alert(1)'), null)
    assert.equal(mapaEmbedUrl('data:text/html,<script>alert(1)</script>'), null)
  })

  test('una dirección escrita a mano se convierte en búsqueda', () => {
    const r = mapaEmbedUrl('Av. Colón 1234, Córdoba')
    assert.ok(r.startsWith('https://www.google.com/maps?q='))
    assert.ok(r.endsWith('&output=embed'))
  })

  test('vacío devuelve null', () => {
    assert.equal(mapaEmbedUrl(''), null)
    assert.equal(mapaEmbedUrl(null), null)
  })
})
