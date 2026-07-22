import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { getVocabulario } from '../utils/vocabulario'

export default function Reportes({ negocioId, colorPrimario, rubro }) {
  const vocab = getVocabulario(rubro)
  const [loading, setLoading] = useState(true)
  const [periodo, setPeriodo] = useState('semana') // semana | mes | todo
  const [datos, setDatos] = useState({
    ingresosPeriodo: 0,
    turnosPeriodo: 0,
    ticketPromedio: 0,
    topServicios: [],
    topEmpleados: [],
    topClientes: [],
    horasPico: {},
    ingresosPorDia: [],
    comparacion: { ingresosAnterior: 0, turnosAnterior: 0 }
  })

  useEffect(() => {
    if (negocioId) cargarReportes()
  }, [negocioId, periodo])

  async function cargarReportes() {
    setLoading(true)
    try {
      const ahora = new Date()
      let fechaInicio, fechaInicioAnterior

      if (periodo === 'semana') {
        const dia = ahora.getDay()
        const diffLunes = dia === 0 ? 6 : dia - 1
        fechaInicio = new Date(ahora)
        fechaInicio.setDate(ahora.getDate() - diffLunes)
        fechaInicio.setHours(0, 0, 0, 0)
        fechaInicioAnterior = new Date(fechaInicio)
        fechaInicioAnterior.setDate(fechaInicioAnterior.getDate() - 7)
      } else if (periodo === 'mes') {
        fechaInicio = new Date(ahora.getFullYear(), ahora.getMonth(), 1)
        fechaInicioAnterior = new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1)
      } else {
        fechaInicio = new Date(ahora.getFullYear(), 0, 1)
        fechaInicioAnterior = new Date(ahora.getFullYear() - 1, 0, 1)
      }

      const { data: turnos } = await supabase
        .from('turnos')
        .select('*, servicios(nombre, precio, duracion_minutos), empleados(nombre)')
        .eq('negocio_id', negocioId)
        .eq('estado', 'confirmado')
        .gte('fecha_hora', fechaInicio.toISOString())
        .order('fecha_hora', { ascending: true })

      const { data: turnosAnteriores } = await supabase
        .from('turnos')
        .select('*, servicios(precio)')
        .eq('negocio_id', negocioId)
        .eq('estado', 'confirmado')
        .gte('fecha_hora', fechaInicioAnterior.toISOString())
        .lt('fecha_hora', fechaInicio.toISOString())

      const listaTurnos = turnos || []
      const listaAnteriores = turnosAnteriores || []

      const ingresosPeriodo = listaTurnos.reduce((a, t) => a + (t.servicios?.precio || 0), 0)
      const turnosPeriodo = listaTurnos.length
      const ticketPromedio = turnosPeriodo > 0 ? Math.round(ingresosPeriodo / turnosPeriodo) : 0
      const ingresosAnterior = listaAnteriores.reduce((a, t) => a + (t.servicios?.precio || 0), 0)
      const turnosAnterior = listaAnteriores.length

      const servicioMap = {}
      listaTurnos.forEach(t => {
        const nombre = t.servicios?.nombre || 'Sin servicio'
        if (!servicioMap[nombre]) servicioMap[nombre] = { nombre, count: 0, revenue: 0 }
        servicioMap[nombre].count++
        servicioMap[nombre].revenue += (t.servicios?.precio || 0)
      })
      const topServicios = Object.values(servicioMap).sort((a, b) => b.revenue - a.revenue).slice(0, 5)

      const empleadoMap = {}
      listaTurnos.forEach(t => {
        const nombre = t.empleados?.nombre || vocab.fallbackStaff
        if (!empleadoMap[nombre]) empleadoMap[nombre] = { nombre, count: 0, revenue: 0 }
        empleadoMap[nombre].count++
        empleadoMap[nombre].revenue += (t.servicios?.precio || 0)
      })
      const topEmpleados = Object.values(empleadoMap).sort((a, b) => b.revenue - a.revenue).slice(0, 5)

      const clienteMap = {}
      listaTurnos.forEach(t => {
        const key = t.cliente_telefono || t.cliente_nombre
        if (!clienteMap[key]) clienteMap[key] = { nombre: t.cliente_nombre, count: 0, revenue: 0 }
        clienteMap[key].count++
        clienteMap[key].revenue += (t.servicios?.precio || 0)
      })
      const topClientes = Object.values(clienteMap).sort((a, b) => b.revenue - a.revenue).slice(0, 5)

      const horasMap = {}
      listaTurnos.forEach(t => {
        const hora = new Date(t.fecha_hora).getHours()
        horasMap[hora] = (horasMap[hora] || 0) + 1
      })

      const diasData = {}
      const numDias = periodo === 'semana' ? 7 : periodo === 'mes' ? 30 : 12

      if (periodo !== 'todo') {
        for (let i = 0; i < numDias; i++) {
          const d = new Date(ahora)
          d.setDate(ahora.getDate() - (numDias - 1 - i))
          const key = `${d.getMonth() + 1}/${d.getDate()}`
          diasData[key] = { label: key, valor: 0, turnos: 0 }
        }
        listaTurnos.forEach(t => {
          const d = new Date(t.fecha_hora)
          const key = `${d.getMonth() + 1}/${d.getDate()}`
          if (diasData[key]) { diasData[key].valor += (t.servicios?.precio || 0); diasData[key].turnos++ }
        })
      } else {
        const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
        for (let i = 0; i < 12; i++) diasData[meses[i]] = { label: meses[i], valor: 0, turnos: 0 }
        listaTurnos.forEach(t => {
          const d = new Date(t.fecha_hora)
          const key = meses[d.getMonth()]
          if (diasData[key]) { diasData[key].valor += (t.servicios?.precio || 0); diasData[key].turnos++ }
        })
      }

      setDatos({
        ingresosPeriodo, turnosPeriodo, ticketPromedio, topServicios, topEmpleados,
        topClientes, horasPico: horasMap, ingresosPorDia: Object.values(diasData),
        comparacion: { ingresosAnterior, turnosAnterior }
      })
    } catch (e) {
      console.error('Error cargando reportes:', e.message)
    } finally {
      setLoading(false)
    }
  }

  const calcVariacion = (actual, anterior) => {
    if (anterior === 0) return actual > 0 ? 100 : 0
    return Math.round(((actual - anterior) / anterior) * 100)
  }

  const maxIngresoDia = Math.max(...datos.ingresosPorDia.map(d => d.valor), 1)
  const maxHoraPico = Math.max(...Object.values(datos.horasPico), 1)
  const variacionIngresos = calcVariacion(datos.ingresosPeriodo, datos.comparacion.ingresosAnterior)
  const variacionTurnos = calcVariacion(datos.turnosPeriodo, datos.comparacion.turnosAnterior)

  if (loading) return (
    <div className="flex flex-col justify-center items-center h-56 gap-4">
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'var(--ns-primary-bg)', boxShadow: 'var(--ns-plastilina-card)' }}>
        <div className="w-5 h-5 border-2 border-[#E8DEFF] border-t-[#5B3DF5] rounded-full animate-spin"></div>
      </div>
      <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--ns-text-muted)' }}>Cargando reportes...</p>
    </div>
  )

  return (
    <div className="flex flex-col gap-4 ns-tab-content-enter pb-6">

      {/* ── HEADER BENTO PLASTILINA ── */}
      <header className="ns-section-header">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'var(--ns-gradient-1)', boxShadow: 'var(--ns-plastilina-btn)' }}>
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </div>
              <span className="text-[9px] font-black uppercase tracking-[0.2em]" style={{ color: 'var(--ns-primary)' }}>Análisis de Rendimiento</span>
            </div>
            <h2 className="text-2xl md:text-4xl font-black tracking-tighter leading-none" style={{ color: 'var(--ns-text)' }}>Reportes</h2>
          </div>

          {/* Selector de período — Plastilina Pill */}
          <div className="ns-period-selector self-start sm:self-auto">
            {[
              { id: 'semana', label: 'Semana' },
              { id: 'mes', label: 'Mes' },
              { id: 'todo', label: 'Anual' }
            ].map(p => (
              <button
                key={p.id}
                onClick={() => setPeriodo(p.id)}
                className={`ns-period-btn ${periodo === p.id ? 'active' : ''}`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* ── KPIs PRINCIPALES — Plastilina 3D ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Ingresos */}
        <div className="ns-kpi-card ns-stagger-in ns-delay-1">
          <div className="flex items-start justify-between mb-3 relative z-10">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #5B3DF5, #8B7CF6)', boxShadow: 'var(--ns-plastilina-btn)' }}>
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </div>
            <div className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-[9px] font-black ${variacionIngresos >= 0 ? 'text-emerald-600' : 'text-red-500'}`}
              style={{ background: variacionIngresos >= 0 ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.08)' }}>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                <path d={variacionIngresos >= 0 ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {Math.abs(variacionIngresos)}%
            </div>
          </div>
          <p className="text-[9px] font-black uppercase tracking-[0.15em] mb-1 relative z-10" style={{ color: 'var(--ns-text-muted)' }}>Ingresos</p>
          <h3 className="text-3xl md:text-4xl font-black tracking-tighter relative z-10 ns-counter" style={{ color: 'var(--ns-text)' }}>
            ${datos.ingresosPeriodo.toLocaleString()}
          </h3>
          <p className="text-[10px] font-semibold mt-1 relative z-10" style={{ color: 'var(--ns-text-muted)' }}>
            vs. ${datos.comparacion.ingresosAnterior.toLocaleString()} período anterior
          </p>
          <div className="absolute -bottom-6 -right-6 w-24 h-24 rounded-full blur-2xl pointer-events-none" style={{ background: 'rgba(91,61,245,0.08)' }} />
        </div>

        {/* Turnos */}
        <div className="ns-kpi-card ns-stagger-in ns-delay-2">
          <div className="flex items-start justify-between mb-3 relative z-10">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #7C3AED, #A78BFA)', boxShadow: '0 4px 12px rgba(124,58,237,0.3)' }}>
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </div>
            <div className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-[9px] font-black ${variacionTurnos >= 0 ? 'text-emerald-600' : 'text-red-500'}`}
              style={{ background: variacionTurnos >= 0 ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.08)' }}>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                <path d={variacionTurnos >= 0 ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {Math.abs(variacionTurnos)}%
            </div>
          </div>
          <p className="text-[9px] font-black uppercase tracking-[0.15em] mb-1 relative z-10" style={{ color: 'var(--ns-text-muted)' }}>{vocab.turnos}</p>
          <h3 className="text-3xl md:text-4xl font-black tracking-tighter relative z-10 ns-counter" style={{ color: 'var(--ns-text)' }}>
            {datos.turnosPeriodo}
          </h3>
          <p className="text-[10px] font-semibold mt-1 relative z-10" style={{ color: 'var(--ns-text-muted)' }}>
            vs. {datos.comparacion.turnosAnterior} período anterior
          </p>
          <div className="absolute -bottom-6 -right-6 w-24 h-24 rounded-full blur-2xl pointer-events-none" style={{ background: 'rgba(124,58,237,0.08)' }} />
        </div>

        {/* Ticket Promedio */}
        <div className="ns-kpi-card ns-stagger-in ns-delay-3">
          <div className="flex items-start justify-between mb-3 relative z-10">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #0EA5E9, #38BDF8)', boxShadow: '0 4px 12px rgba(14,165,233,0.3)' }}>
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </div>
            <span className="text-[9px] font-black px-2.5 py-1 rounded-xl" style={{ background: 'var(--ns-primary-bg)', color: 'var(--ns-primary)' }}>
              Promedio
            </span>
          </div>
          <p className="text-[9px] font-black uppercase tracking-[0.15em] mb-1 relative z-10" style={{ color: 'var(--ns-text-muted)' }}>Ticket Prom.</p>
          <h3 className="text-3xl md:text-4xl font-black tracking-tighter relative z-10 ns-counter" style={{ color: 'var(--ns-text)' }}>
            ${datos.ticketPromedio.toLocaleString()}
          </h3>
          <p className="text-[10px] font-semibold mt-1 relative z-10" style={{ color: 'var(--ns-text-muted)' }}>
            por {vocab.turno} confirmado
          </p>
          <div className="absolute -bottom-6 -right-6 w-24 h-24 rounded-full blur-2xl pointer-events-none" style={{ background: 'rgba(14,165,233,0.08)' }} />
        </div>
      </div>

      {/* ── GRÁFICO DE INGRESOS — Plastilina 3D Bars ── */}
      <div className="ns-kpi-card ns-stagger-in ns-delay-4">
        <div className="flex items-center justify-between mb-6 relative z-10">
          <div>
            <h4 className="text-base md:text-lg font-black tracking-tight" style={{ color: 'var(--ns-text)' }}>
              Ingresos por {periodo === 'todo' ? 'Mes' : 'Día'}
            </h4>
            <p className="text-[9px] font-black uppercase tracking-[0.15em] mt-0.5" style={{ color: 'var(--ns-text-muted)' }}>Tendencia de facturación</p>
          </div>
          <span className="text-xl font-black tracking-tight" style={{ color: 'var(--ns-primary)' }}>
            ${datos.ingresosPeriodo.toLocaleString()}
          </span>
        </div>

        {/* Barras Plastilina 3D */}
        <div className="flex items-end gap-1.5 h-44 relative z-10" role="img" aria-label="Gráfico de ingresos">
          {datos.ingresosPorDia.map((d, idx) => {
            const pct = Math.max(4, (d.valor / maxIngresoDia) * 100)
            const isToday = idx === datos.ingresosPorDia.length - 1
            return (
              <div key={idx} className="flex-1 flex flex-col items-center gap-1 group min-w-0 h-full justify-end">
                <div className="w-full relative h-full flex items-end">
                  {/* Tooltip */}
                  <div className="absolute -top-9 left-1/2 -translate-x-1/2 px-2 py-1 rounded-xl text-[9px] font-black whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all scale-90 group-hover:scale-100 z-20 pointer-events-none"
                    style={{ background: 'var(--ns-text)', color: 'white', boxShadow: 'var(--ns-shadow-lg)' }}>
                    ${d.valor.toLocaleString()}
                  </div>
                  {/* Barra */}
                  <div
                    className="ns-bar-chart-bar w-full transition-all duration-700 group-hover:brightness-110"
                    style={{
                      height: `${pct}%`,
                      background: isToday
                        ? 'linear-gradient(180deg, #A78BFA 0%, #5B3DF5 100%)'
                        : d.valor > 0
                        ? 'linear-gradient(180deg, #8B7CF6 0%, #5B3DF5 100%)'
                        : 'var(--ns-border)',
                      opacity: d.valor > 0 ? 1 : 0.4,
                      boxShadow: d.valor > 0 ? '0 -2px 8px rgba(91,61,245,0.2)' : 'none',
                    }}
                  />
                </div>
                <span className="text-[7px] font-black uppercase tracking-tighter" style={{ color: isToday ? 'var(--ns-primary)' : 'var(--ns-text-muted)' }}>
                  {d.label}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── GRID: TOP SERVICIOS + TOP EMPLEADOS ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* TOP SERVICIOS */}
        <div className="ns-kpi-card ns-stagger-in ns-delay-5 p-0 overflow-hidden">
          <div className="p-5 md:p-6 border-b relative z-10" style={{ borderColor: 'var(--ns-border)' }}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'var(--ns-primary-bg)', boxShadow: 'var(--ns-shadow-sm)' }}>
                <svg className="w-4 h-4" style={{ color: 'var(--ns-primary)' }} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </div>
              <div>
                <h4 className="text-sm font-black tracking-tight" style={{ color: 'var(--ns-text)' }}>{vocab.servicioPlural} más rentables</h4>
                <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: 'var(--ns-text-muted)' }}>Por facturación</p>
              </div>
            </div>
          </div>
          {datos.topServicios.length === 0 ? (
            <div className="p-10 text-center relative z-10">
              <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--ns-text-muted)' }}>Sin datos disponibles</p>
            </div>
          ) : (
            <div className="divide-y relative z-10" style={{ borderColor: 'var(--ns-border)' }}>
              {datos.topServicios.map((s, idx) => {
                const maxRev = datos.topServicios[0]?.revenue || 1
                const pct = (s.revenue / maxRev) * 100
                return (
                  <div key={idx} className="px-5 py-4 flex items-center gap-3 transition-colors group/item" style={{ '--hover-bg': 'var(--ns-accent-bg)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--ns-accent-bg)'}
                    onMouseLeave={e => e.currentTarget.style.background = ''}>
                    <span className="text-[10px] font-black w-5 shrink-0 group-hover/item:text-[#5B3DF5] transition-colors" style={{ color: 'var(--ns-text-muted)' }}>{idx + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-black truncate leading-tight" style={{ color: 'var(--ns-text)' }}>{s.nombre}</p>
                      <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--ns-border)' }}>
                        <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #5B3DF5, #8B7CF6)' }} />
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[12px] font-black" style={{ color: 'var(--ns-text)' }}>${s.revenue.toLocaleString()}</p>
                      <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: 'var(--ns-text-muted)' }}>{s.count} {vocab.turnos}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* TOP EMPLEADOS */}
        <div className="ns-kpi-card ns-stagger-in ns-delay-6 p-0 overflow-hidden">
          <div className="p-5 md:p-6 border-b relative z-10" style={{ borderColor: 'var(--ns-border)' }}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(124,58,237,0.1)', boxShadow: 'var(--ns-shadow-sm)' }}>
                <svg className="w-4 h-4" style={{ color: '#7C3AED' }} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </div>
              <div>
                <h4 className="text-sm font-black tracking-tight" style={{ color: 'var(--ns-text)' }}>{vocab.empleadoPlural} por rendimiento</h4>
                <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: 'var(--ns-text-muted)' }}>Por facturación generada</p>
              </div>
            </div>
          </div>
          {datos.topEmpleados.length === 0 ? (
            <div className="p-10 text-center relative z-10">
              <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--ns-text-muted)' }}>Sin datos disponibles</p>
            </div>
          ) : (
            <div className="divide-y relative z-10" style={{ borderColor: 'var(--ns-border)' }}>
              {datos.topEmpleados.map((e, idx) => {
                const maxRev = datos.topEmpleados[0]?.revenue || 1
                return (
                  <div key={idx} className="px-5 py-4 flex items-center gap-3 transition-colors"
                    onMouseEnter={ev => ev.currentTarget.style.background = 'var(--ns-accent-bg)'}
                    onMouseLeave={ev => ev.currentTarget.style.background = ''}>
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm shrink-0 transition-all"
                      style={{ background: 'var(--ns-primary-bg)', color: 'var(--ns-primary)', boxShadow: 'var(--ns-shadow-sm)' }}>
                      {e.nombre.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-black truncate leading-tight" style={{ color: 'var(--ns-text)' }}>{e.nombre}</p>
                      <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--ns-border)' }}>
                        <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${(e.revenue / maxRev) * 100}%`, background: 'linear-gradient(90deg, #7C3AED, #A78BFA)' }} />
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[12px] font-black" style={{ color: 'var(--ns-text)' }}>${e.revenue.toLocaleString()}</p>
                      <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: 'var(--ns-text-muted)' }}>{e.count} {vocab.turnos}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── HORAS PICO + TOP CLIENTES ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* HORAS PICO */}
        <div className="ns-kpi-card ns-stagger-in ns-delay-7">
          <div className="flex items-center gap-3 mb-5 relative z-10">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(245,158,11,0.1)', boxShadow: 'var(--ns-shadow-sm)' }}>
              <svg className="w-4 h-4" style={{ color: '#D97706' }} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </div>
            <div>
              <h4 className="text-sm font-black tracking-tight" style={{ color: 'var(--ns-text)' }}>Horas con más demanda</h4>
              <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: 'var(--ns-text-muted)' }}>Distribución horaria</p>
            </div>
          </div>

          {Object.keys(datos.horasPico).length === 0 ? (
            <div className="py-10 text-center relative z-10">
              <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--ns-text-muted)' }}>Sin datos disponibles</p>
            </div>
          ) : (
            <div className="space-y-3 relative z-10">
              {Object.entries(datos.horasPico)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 6)
                .map(([hora, count], idx) => (
                  <div key={hora} className="flex items-center gap-3">
                    <span className="text-[10px] font-black w-12 shrink-0" style={{ color: idx === 0 ? '#D97706' : 'var(--ns-text-muted)' }}>{hora}:00</span>
                    <div className="flex-1 h-2.5 rounded-full overflow-hidden" style={{ background: 'var(--ns-border)', boxShadow: 'var(--ns-shadow-inner)' }}>
                      <div className="h-full rounded-full transition-all duration-1000"
                        style={{
                          width: `${(count / maxHoraPico) * 100}%`,
                          background: idx === 0 ? 'linear-gradient(90deg, #F59E0B, #FBBF24)' : 'linear-gradient(90deg, #5B3DF5, #8B7CF6)'
                        }} />
                    </div>
                    <span className="text-[11px] font-black w-5 text-right" style={{ color: 'var(--ns-text)' }}>{count}</span>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* TOP CLIENTES */}
        <div className="ns-kpi-card ns-stagger-in ns-delay-8 p-0 overflow-hidden">
          <div className="p-5 md:p-6 border-b relative z-10" style={{ borderColor: 'var(--ns-border)' }}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.1)', boxShadow: 'var(--ns-shadow-sm)' }}>
                <svg className="w-4 h-4" style={{ color: '#059669' }} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </div>
              <div>
                <h4 className="text-sm font-black tracking-tight" style={{ color: 'var(--ns-text)' }}>{vocab.clientePlural.replace('Base de ', '')} destacados</h4>
                <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: 'var(--ns-text-muted)' }}>Mayor facturación</p>
              </div>
            </div>
          </div>
          {datos.topClientes.length === 0 ? (
            <div className="p-10 text-center relative z-10">
              <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--ns-text-muted)' }}>Sin datos disponibles</p>
            </div>
          ) : (
            <div className="divide-y relative z-10" style={{ borderColor: 'var(--ns-border)' }}>
              {datos.topClientes.map((c, idx) => (
                <div key={idx} className="px-5 py-4 flex items-center gap-3 transition-colors"
                  onMouseEnter={ev => ev.currentTarget.style.background = 'var(--ns-accent-bg)'}
                  onMouseLeave={ev => ev.currentTarget.style.background = ''}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm shrink-0"
                    style={{ background: idx === 0 ? 'linear-gradient(135deg, #FEF3C7, #FDE68A)' : 'var(--ns-primary-bg)', color: idx === 0 ? '#D97706' : 'var(--ns-primary)', boxShadow: 'var(--ns-shadow-sm)' }}>
                    {c.nombre?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-black truncate leading-tight" style={{ color: 'var(--ns-text)' }}>{c.nombre}</p>
                    <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: 'var(--ns-text-muted)' }}>{c.count} {vocab.turnos}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[12px] font-black" style={{ color: 'var(--ns-text)' }}>${c.revenue.toLocaleString()}</p>
                    {idx === 0 && <p className="text-[8px] font-black uppercase tracking-widest" style={{ color: '#D97706' }}>Top</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
