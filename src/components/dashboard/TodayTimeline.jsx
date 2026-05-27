/**
 * TodayTimeline — Visual timeline de turnos del día con marker de "ahora".
 * Renderiza una línea horizontal con bloques de turnos en sus horas correspondientes.
 */
export default function TodayTimeline({ turnos = [], horaInicio = 8, horaFin = 22, onClickTurno, vocab }) {
  const ahora = new Date()
  const minutosHoy = ahora.getHours() * 60 + ahora.getMinutes()
  const minInicio = horaInicio * 60
  const minFin = horaFin * 60
  const rangoMin = minFin - minInicio

  const ahoraPercent = Math.max(0, Math.min(100, ((minutosHoy - minInicio) / rangoMin) * 100))
  const dentroDelRango = minutosHoy >= minInicio && minutosHoy <= minFin

  // Filtrar turnos de hoy
  const turnosHoy = turnos.filter(t => {
    if (!t?.fecha_hora) return false
    const d = new Date(t.fecha_hora)
    return d.toDateString() === ahora.toDateString()
  }).sort((a, b) => new Date(a.fecha_hora) - new Date(b.fecha_hora))

  const horasMarks = []
  for (let h = horaInicio; h <= horaFin; h += 2) {
    horasMarks.push({ h, percent: ((h * 60 - minInicio) / rangoMin) * 100 })
  }

  if (turnosHoy.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-300/70 shadow-sm p-5" data-testid="today-timeline">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[13px] font-bold text-[#0F172A] tracking-tight">Línea de tiempo · Hoy</h3>
          <span className="text-[9px] font-medium uppercase tracking-[0.22em] text-slate-400" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
            {horaInicio}:00 → {horaFin}:00
          </span>
        </div>
        <div className="py-8 flex flex-col items-center justify-center text-center">
          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mb-3">
            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
          </div>
          <p className="text-[12px] font-semibold text-[#0F172A]">Sin {vocab?.turnos || 'turnos'} cargados para hoy</p>
          <p className="text-[11px] text-slate-500 mt-0.5">La agenda se llenará al recibir reservas.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-slate-300/70 shadow-sm p-5" data-testid="today-timeline">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-[13px] font-bold text-[#0F172A] tracking-tight">Línea de tiempo · Hoy</h3>
          <p className="text-[9px] font-medium text-slate-500 uppercase tracking-[0.22em] mt-1" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
            {turnosHoy.length} {turnosHoy.length === 1 ? (vocab?.turno || 'turno') : (vocab?.turnos || 'turnos')} · {ahora.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        {dentroDelRango && (
          <span className="inline-flex items-center gap-1.5 text-[9px] font-bold text-[#0EA5E9] uppercase tracking-[0.22em]" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-[#0EA5E9] animate-pulse" />
            En vivo
          </span>
        )}
      </div>

      {/* Timeline track */}
      <div className="relative h-14 mb-3">
        {/* Track line */}
        <div className="absolute top-1/2 left-0 right-0 h-px bg-slate-300 -translate-y-1/2" />

        {/* Hour marks */}
        {horasMarks.map(m => (
          <div key={m.h} className="absolute top-1/2 -translate-y-1/2" style={{ left: `${m.percent}%` }}>
            <div className="w-px h-2 bg-slate-300 absolute -top-1" />
            <p className="absolute -top-5 -translate-x-1/2 text-[8px] font-medium text-slate-400 tabular-nums whitespace-nowrap" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
              {m.h.toString().padStart(2, '0')}
            </p>
          </div>
        ))}

        {/* Now marker */}
        {dentroDelRango && (
          <div className="absolute top-1/2 -translate-y-1/2 z-10" style={{ left: `${ahoraPercent}%` }}>
            <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-[#0EA5E9] ring-2 ring-white" />
            <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-[#0EA5E9] animate-ping opacity-50" />
            <p className="absolute top-4 -translate-x-1/2 text-[9px] font-bold text-[#0EA5E9] uppercase tracking-widest whitespace-nowrap" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
              Ahora
            </p>
          </div>
        )}

        {/* Turnos dots */}
        {turnosHoy.map(t => {
          const d = new Date(t.fecha_hora)
          const min = d.getHours() * 60 + d.getMinutes()
          if (min < minInicio || min > minFin) return null
          const percent = ((min - minInicio) / rangoMin) * 100
          const yaPaso = min <= minutosHoy
          return (
            <button
              key={t.id}
              onClick={() => onClickTurno?.(t)}
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 group"
              style={{ left: `${percent}%` }}
              data-testid={`timeline-turno-${t.id}`}
              title={`${d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} · ${t.cliente_nombre || ''}`}
            >
              <div className={`w-3 h-3 rounded-full ring-2 ring-white transition-all group-hover:scale-150 ${yaPaso ? 'bg-slate-400' : 'bg-[#0F172A]'}`} />
              <div className="absolute bottom-5 left-1/2 -translate-x-1/2 hidden group-hover:block bg-[#0F172A] text-white text-[10px] font-medium px-2 py-1 rounded whitespace-nowrap z-20">
                {d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} · {t.cliente_nombre || 'Cliente'}
              </div>
            </button>
          )
        })}
      </div>

      {/* Lista resumida (primeros 4) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-6 pt-4 border-t border-slate-200/70">
        {turnosHoy.slice(0, 4).map(t => {
          const d = new Date(t.fecha_hora)
          const hora = d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
          const yaPaso = d <= ahora
          return (
            <button
              key={`list-${t.id}`}
              onClick={() => onClickTurno?.(t)}
              className="text-left p-2.5 rounded-md border border-slate-200 hover:border-slate-400 hover:bg-slate-50/60 transition-all group"
              data-testid={`timeline-row-${t.id}`}
            >
              <p className={`text-[12px] font-bold tabular-nums ${yaPaso ? 'text-slate-400' : 'text-[#0EA5E9]'}`} style={{ fontFamily: '"JetBrains Mono", monospace' }}>{hora}</p>
              <p className="text-[11px] font-semibold text-[#0F172A] truncate mt-0.5">{t.cliente_nombre || 'Cliente'}</p>
              <p className="text-[10px] text-slate-500 truncate">{t.servicios?.nombre || '—'}</p>
            </button>
          )
        })}
        {turnosHoy.length > 4 && (
          <div className="flex items-center justify-center p-2.5 rounded-md border border-dashed border-slate-300 text-[11px] font-semibold text-slate-500">
            +{turnosHoy.length - 4} más
          </div>
        )}
      </div>
    </div>
  )
}
