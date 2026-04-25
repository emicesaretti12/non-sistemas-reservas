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

  const accent = colorPrimario || '#0f172a'

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

      // Traer turnos del período actual
      const { data: turnos } = await supabase
        .from('turnos')
        .select('*, servicios(nombre, precio, duracion_minutos), empleados(nombre)')
        .eq('negocio_id', negocioId)
        .eq('estado', 'confirmado')
        .gte('fecha_hora', fechaInicio.toISOString())
        .order('fecha_hora', { ascending: true })

      // Traer turnos del período anterior para comparación
      const { data: turnosAnteriores } = await supabase
        .from('turnos')
        .select('*, servicios(precio)')
        .eq('negocio_id', negocioId)
        .eq('estado', 'confirmado')
        .gte('fecha_hora', fechaInicioAnterior.toISOString())
        .lt('fecha_hora', fechaInicio.toISOString())

      const listaTurnos = turnos || []
      const listaAnteriores = turnosAnteriores || []

      // === MÉTRICAS PRINCIPALES ===
      const ingresosPeriodo = listaTurnos.reduce((a, t) => a + (t.servicios?.precio || 0), 0)
      const turnosPeriodo = listaTurnos.length
      const ticketPromedio = turnosPeriodo > 0 ? Math.round(ingresosPeriodo / turnosPeriodo) : 0

      // Período anterior
      const ingresosAnterior = listaAnteriores.reduce((a, t) => a + (t.servicios?.precio || 0), 0)
      const turnosAnterior = listaAnteriores.length

      // === TOP SERVICIOS ===
      const servicioMap = {}
      listaTurnos.forEach(t => {
        const nombre = t.servicios?.nombre || 'Sin servicio'
        if (!servicioMap[nombre]) servicioMap[nombre] = { nombre, count: 0, revenue: 0 }
        servicioMap[nombre].count++
        servicioMap[nombre].revenue += (t.servicios?.precio || 0)
      })
      const topServicios = Object.values(servicioMap)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5)

      // === TOP EMPLEADOS ===
      const empleadoMap = {}
      listaTurnos.forEach(t => {
        const nombre = t.empleados?.nombre || vocab.fallbackStaff
        if (!empleadoMap[nombre]) empleadoMap[nombre] = { nombre, count: 0, revenue: 0 }
        empleadoMap[nombre].count++
        empleadoMap[nombre].revenue += (t.servicios?.precio || 0)
      })
      const topEmpleados = Object.values(empleadoMap)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5)

      // === TOP CLIENTES ===
      const clienteMap = {}
      listaTurnos.forEach(t => {
        const key = t.cliente_telefono || t.cliente_nombre
        if (!clienteMap[key]) clienteMap[key] = { nombre: t.cliente_nombre, count: 0, revenue: 0 }
        clienteMap[key].count++
        clienteMap[key].revenue += (t.servicios?.precio || 0)
      })
      const topClientes = Object.values(clienteMap)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5)

      // === HORAS PICO ===
      const horasMap = {}
      listaTurnos.forEach(t => {
        const hora = new Date(t.fecha_hora).getHours()
        horasMap[hora] = (horasMap[hora] || 0) + 1
      })

      // === INGRESOS POR DÍA (últimos 7 o 30 días) ===
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
          if (diasData[key]) {
            diasData[key].valor += (t.servicios?.precio || 0)
            diasData[key].turnos++
          }
        })
      } else {
        // Por mes si es "todo"
        const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
        for (let i = 0; i < 12; i++) {
          diasData[meses[i]] = { label: meses[i], valor: 0, turnos: 0 }
        }
        listaTurnos.forEach(t => {
          const d = new Date(t.fecha_hora)
          const key = meses[d.getMonth()]
          if (diasData[key]) {
            diasData[key].valor += (t.servicios?.precio || 0)
            diasData[key].turnos++
          }
        })
      }

      setDatos({
        ingresosPeriodo,
        turnosPeriodo,
        ticketPromedio,
        topServicios,
        topEmpleados,
        topClientes,
        horasPico: horasMap,
        ingresosPorDia: Object.values(diasData),
        comparacion: { ingresosAnterior, turnosAnterior }
      })
    } catch (e) {
      console.error('Error cargando reportes:', e.message)
    } finally {
      setLoading(false)
    }
  }

  // Helpers
  const calcVariacion = (actual, anterior) => {
    if (anterior === 0) return actual > 0 ? 100 : 0
    return Math.round(((actual - anterior) / anterior) * 100)
  }

  const maxIngresoDia = Math.max(...datos.ingresosPorDia.map(d => d.valor), 1)
  const maxHoraPico = Math.max(...Object.values(datos.horasPico), 1)
  const variacionIngresos = calcVariacion(datos.ingresosPeriodo, datos.comparacion.ingresosAnterior)
  const variacionTurnos = calcVariacion(datos.turnosPeriodo, datos.comparacion.turnosAnterior)

  if (loading) return (
    <div className="flex justify-center items-center h-48">
      <div className="w-6 h-6 border-2 border-slate-200 border-t-slate-900 rounded-full animate-spin"></div>
    </div>
  )

  return (
    <div className="space-y-4 md:space-y-6 animate-in fade-in duration-700">
      
      {/* HEADER + SELECTOR DE PERÍODO */}
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-white p-4 md:p-6 rounded-[1.5rem] md:rounded-[2rem] shadow-sm border border-slate-200 gap-3">
        <div>
          <h2 className="text-xl md:text-3xl font-bold tracking-tighter text-slate-900 leading-none">Reportes</h2>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1">Análisis de rendimiento</p>
        </div>
        <div className="flex bg-slate-100 rounded-xl p-1 gap-0.5">
          {[
            { id: 'semana', label: 'Semana' },
            { id: 'mes', label: 'Mes' },
            { id: 'todo', label: 'Anual' }
          ].map(p => (
            <button key={p.id} onClick={() => setPeriodo(p.id)} className={`px-3 md:px-4 py-2 rounded-lg text-[9px] md:text-[10px] font-bold uppercase tracking-widest transition-all ${periodo === p.id ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>
              {p.label}
            </button>
          ))}
        </div>
      </header>

      {/* KPIs PRINCIPALES CON COMPARACIÓN */}
      <div className="grid grid-cols-3 gap-2 md:gap-4">
        <div className="bg-white p-4 md:p-6 rounded-[1.3rem] md:rounded-[1.5rem] border border-slate-200 shadow-sm">
          <p className="text-[8px] md:text-[9px] font-bold text-slate-400 uppercase tracking-widest">Ingresos</p>
          <h3 className="text-xl md:text-3xl font-bold tracking-tighter text-slate-900 mt-1">${datos.ingresosPeriodo.toLocaleString()}</h3>
          <div className={`flex items-center gap-1 mt-1.5 text-[9px] font-bold ${variacionIngresos >= 0 ? 'text-green-600' : 'text-red-500'}`}>
            <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
              <path d={variacionIngresos >= 0 ? "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" : "M13 17h8m0 0v-8m0 8l-8-8-4 4-6-6"} strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {variacionIngresos >= 0 ? '+' : ''}{variacionIngresos}%
          </div>
        </div>
        <div className="bg-white p-4 md:p-6 rounded-[1.3rem] md:rounded-[1.5rem] border border-slate-200 shadow-sm">
          <p className="text-[8px] md:text-[9px] font-bold text-slate-400 uppercase tracking-widest">Turnos</p>
          <h3 className="text-xl md:text-3xl font-bold tracking-tighter text-slate-900 mt-1">{datos.turnosPeriodo}</h3>
          <div className={`flex items-center gap-1 mt-1.5 text-[9px] font-bold ${variacionTurnos >= 0 ? 'text-green-600' : 'text-red-500'}`}>
            <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
              <path d={variacionTurnos >= 0 ? "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" : "M13 17h8m0 0v-8m0 8l-8-8-4 4-6-6"} strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {variacionTurnos >= 0 ? '+' : ''}{variacionTurnos}%
          </div>
        </div>
        <div className="bg-white p-4 md:p-6 rounded-[1.3rem] md:rounded-[1.5rem] border border-slate-200 shadow-sm">
          <p className="text-[8px] md:text-[9px] font-bold text-slate-400 uppercase tracking-widest">Ticket Prom.</p>
          <h3 className="text-xl md:text-3xl font-bold tracking-tighter text-slate-900 mt-1">${datos.ticketPromedio}</h3>
          <p className="text-[9px] font-medium text-slate-400 mt-1.5 italic">Por reserva</p>
        </div>
      </div>

      {/* GRÁFICO DE INGRESOS POR DÍA */}
      <div className="bg-white p-4 md:p-6 rounded-[1.5rem] md:rounded-[2rem] border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-4 md:mb-6">
          <div>
            <h4 className="text-sm md:text-base font-bold text-slate-900">Ingresos por {periodo === 'todo' ? 'Mes' : 'Día'}</h4>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Tendencia de facturación</p>
          </div>
          <span className="text-lg md:text-2xl font-black text-slate-900 tracking-tighter">${datos.ingresosPeriodo.toLocaleString()}</span>
        </div>
        <div className="flex items-end gap-[3px] md:gap-1.5 h-28 md:h-40">
          {datos.ingresosPorDia.map((d, idx) => (
            <div key={idx} className="flex-1 flex flex-col items-center gap-1 group min-w-0">
              <span className="text-[7px] md:text-[9px] font-bold text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity truncate">${d.valor}</span>
              <div 
                className="w-full rounded-t-md md:rounded-t-lg transition-all duration-500 group-hover:opacity-80 min-h-[2px]" 
                style={{ 
                  height: `${Math.max(3, (d.valor / maxIngresoDia) * 100)}%`,
                  backgroundColor: d.valor > 0 ? accent : '#e2e8f0'
                }}
              ></div>
              <span className="text-[6px] md:text-[8px] font-bold text-slate-300 truncate w-full text-center">{d.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* GRID: TOP SERVICIOS + TOP EMPLEADOS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
        
        {/* TOP SERVICIOS */}
        <div className="bg-white rounded-[1.5rem] border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 md:p-5 border-b border-slate-100">
            <h4 className="text-sm font-bold text-slate-900">{vocab.servicioPlural} más rentables</h4>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Por facturación</p>
          </div>
          {datos.topServicios.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sin datos</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {datos.topServicios.map((s, idx) => {
                const maxRev = datos.topServicios[0]?.revenue || 1
                return (
                  <div key={idx} className="px-4 md:px-5 py-3 flex items-center gap-3 hover:bg-slate-50/50 transition-colors">
                    <span className="text-[10px] font-black text-slate-300 w-5 text-center">{idx + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">{s.nombre}</p>
                      <div className="mt-1.5 h-1 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${(s.revenue / maxRev) * 100}%`, backgroundColor: accent }}></div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-black text-slate-900">${s.revenue.toLocaleString()}</p>
                      <p className="text-[9px] font-medium text-slate-400">{s.count} {vocab.turnos}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* TOP EMPLEADOS */}
        <div className="bg-white rounded-[1.5rem] border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 md:p-5 border-b border-slate-100">
            <h4 className="text-sm font-bold text-slate-900">{vocab.empleadoPlural} por rendimiento</h4>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Por facturación generada</p>
          </div>
          {datos.topEmpleados.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sin datos</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {datos.topEmpleados.map((e, idx) => {
                const maxRev = datos.topEmpleados[0]?.revenue || 1
                return (
                  <div key={idx} className="px-4 md:px-5 py-3 flex items-center gap-3 hover:bg-slate-50/50 transition-colors">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs text-white shrink-0" style={{ backgroundColor: accent }}>
                      {e.nombre.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">{e.nombre}</p>
                      <div className="mt-1.5 h-1 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${(e.revenue / maxRev) * 100}%`, backgroundColor: accent }}></div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-black text-slate-900">${e.revenue.toLocaleString()}</p>
                      <p className="text-[9px] font-medium text-slate-400">{e.count} {vocab.turnos}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* HORAS PICO + TOP CLIENTES */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
        
        {/* HORAS PICO */}
        <div className="bg-white p-4 md:p-6 rounded-[1.5rem] border border-slate-200 shadow-sm">
          <h4 className="text-sm font-bold text-slate-900 mb-1">Horas con más demanda</h4>
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-4">Distribución horaria</p>
          
          {Object.keys(datos.horasPico).length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sin datos</p>
            </div>
          ) : (
            <div className="space-y-2">
              {Object.entries(datos.horasPico)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 6)
                .map(([hora, count]) => (
                  <div key={hora} className="flex items-center gap-3">
                    <span className="text-[10px] font-bold text-slate-500 w-12 shrink-0">{hora}:00</span>
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${(count / maxHoraPico) * 100}%`, backgroundColor: accent }}></div>
                    </div>
                    <span className="text-[10px] font-black text-slate-900 w-6 text-right">{count}</span>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* TOP CLIENTES */}
        <div className="bg-white rounded-[1.5rem] border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 md:p-5 border-b border-slate-100">
            <h4 className="text-sm font-bold text-slate-900">{vocab.clientePlural.replace('Base de ', '')} destacados</h4>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Mayor facturación</p>
          </div>
          {datos.topClientes.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sin datos</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {datos.topClientes.map((c, idx) => (
                <div key={idx} className="px-4 md:px-5 py-3 flex items-center gap-3 hover:bg-slate-50/50 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center font-black text-xs text-slate-500 shrink-0">
                    {c.nombre?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate">{c.nombre}</p>
                    <p className="text-[9px] font-medium text-slate-400">{c.count} {vocab.turnos}</p>
                  </div>
                  <span className="text-xs font-black text-green-600 shrink-0">${c.revenue.toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
