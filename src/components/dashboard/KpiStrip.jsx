/**
 * KpiStrip — Strip de 4 KPIs principales con sparklines y deltas.
 * Datos: turnos hoy, ingresos hoy, semana, clientes registrados.
 */
import Sparkline from './Sparkline'

export default function KpiStrip({ stats, clientes, actividadReciente, distribucionSemanal, vocab }) {
  // ─── Generar series para sparklines a partir de datos reales ───

  // Serie de últimos 7 días de turnos (usa distribucionSemanal si está, sino simula desde actividad)
  const turnosSerie = distribucionSemanal && distribucionSemanal.length === 7
    ? [...distribucionSemanal]
    : [0, 0, 0, 0, 0, 0, stats?.hoy || 0]

  // Serie de ingresos por día de la última semana (estimada via actividadReciente)
  const ingresosSerie = (() => {
    const hoy = new Date()
    const buckets = Array.from({ length: 7 }, () => 0)
    if (!actividadReciente) return buckets
    actividadReciente.forEach(t => {
      if (!t?.fecha_hora || !t?.servicios?.precio) return
      const d = new Date(t.fecha_hora)
      const diff = Math.floor((hoy - d) / 86400000)
      if (diff >= 0 && diff < 7) {
        buckets[6 - diff] += t.servicios.precio
      }
    })
    return buckets
  })()

  // Serie de semana (acumulado) — usa últimos 7 días
  const semanaSerie = turnosSerie.map((_, i) => turnosSerie.slice(0, i + 1).reduce((a, b) => a + b, 0))

  // Serie de clientes (estimada — crecimiento lineal hacia clientes.length)
  const clientesTotal = clientes?.length || 0
  const clientesSerie = Array.from({ length: 7 }, (_, i) => Math.round(clientesTotal * (i / 6)))

  const calcDelta = (serie) => {
    if (!serie || serie.length < 2) return null
    const last = serie[serie.length - 1]
    const prev = serie[serie.length - 2] || 0
    if (prev === 0 && last === 0) return null
    if (prev === 0) return { val: 100, up: true }
    const diff = ((last - prev) / Math.abs(prev)) * 100
    return { val: Math.round(diff), up: diff >= 0 }
  }

  const kpis = [
    {
      id: 'hoy',
      label: vocab?.monitorHoy || `${vocab?.turnos || 'Turnos'} hoy`,
      value: stats?.hoy || 0,
      format: (v) => v.toLocaleString('es-AR'),
      serie: turnosSerie,
      color: '#0EA5E9',
      delta: calcDelta(turnosSerie),
      hint: stats?.hoy === 0 ? 'Sin turnos por hoy' : null,
    },
    {
      id: 'ingresos',
      label: vocab?.monitorIngresos || 'Ingresos hoy',
      value: stats?.ingresos || 0,
      format: (v) => `$${v.toLocaleString('es-AR')}`,
      serie: ingresosSerie,
      color: '#059669',
      delta: calcDelta(ingresosSerie),
      hint: stats?.ingresos === 0 ? 'Se calcula con turnos confirmados' : null,
    },
    {
      id: 'semana',
      label: vocab?.monitorSemana || 'Esta semana',
      value: stats?.semana || 0,
      format: (v) => v.toLocaleString('es-AR'),
      serie: semanaSerie,
      color: '#0F172A',
      delta: null,
      hint: stats?.semana === 0 ? 'Acumulado de la semana en curso' : null,
    },
    {
      id: 'clientes',
      label: (vocab?.clientes || 'Clientes').charAt(0).toUpperCase() + (vocab?.clientes || 'Clientes').slice(1),
      value: clientesTotal,
      format: (v) => v.toLocaleString('es-AR'),
      serie: clientesSerie,
      color: '#7C3AED',
      delta: null,
      hint: clientesTotal === 0 ? 'Se agregan con las reservas' : 'Total registrados',
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-slate-300/60 border border-slate-300/60 rounded-xl overflow-hidden shadow-sm" data-testid="kpi-strip">
      {kpis.map(k => (
        <div key={k.id} className="bg-white p-4 md:p-5 relative group transition-colors hover:bg-slate-50/60" data-testid={`kpi-${k.id}`}>
          {/* Top row: label + delta */}
          <div className="flex items-center justify-between mb-3">
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.22em] truncate" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
              {k.label}
            </p>
            {k.delta && (
              <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold ${k.delta.up ? 'text-emerald-600' : 'text-red-600'}`} style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d={k.delta.up ? 'M5 10l7-7m0 0l7 7m-7-7v18' : 'M19 14l-7 7m0 0l-7-7m7 7V3'} />
                </svg>
                {Math.abs(k.delta.val)}%
              </span>
            )}
          </div>

          {/* Big number */}
          <p className="text-[28px] md:text-[34px] font-light tracking-[-0.03em] leading-none text-[#0F172A] mb-3" style={{ fontFamily: '"Fraunces", serif' }}>
            {k.format(k.value)}
          </p>

          {/* Sparkline */}
          <Sparkline data={k.serie} color={k.color} height={26} />

          {/* Hint */}
          {k.hint && (
            <p className="text-[10px] text-slate-400 mt-2 font-medium leading-tight">{k.hint}</p>
          )}
        </div>
      ))}
    </div>
  )
}
