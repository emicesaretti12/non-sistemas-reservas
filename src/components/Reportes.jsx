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
    <div className="flex flex-col h-full animate-in fade-in duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]">
      <header className="flex flex-col gap-6 mb-8 shrink-0">
        <div className="flex items-center justify-between bg-[#F7F5FF] p-8 md:p-10 rounded-[2.5rem] border border-[#EDE8F7] relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="w-24 h-24"><path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
          </div>
          <div className="relative z-10">
            <h2 className="text-3xl md:text-5xl font-black tracking-tighter text-[#1A1630] leading-none">Reportes</h2>
            <div className="flex items-center gap-2 mt-3">
              <span className="w-1.5 h-1.5 rounded-full bg-[#5B3DF5] animate-pulse" />
              <p className="text-[10px] md:text-xs font-black uppercase tracking-[0.2em] text-[#A09CB5]">Análisis de rendimiento</p>
            </div>
          </div>
          <div className="flex bg-[#F7F5FF] p-1.5 rounded-2xl relative z-10 border border-[#EDE8F7]">
            {[
              { id: 'semana', label: 'Semana' },
              { id: 'mes', label: 'Mes' },
              { id: 'todo', label: 'Anual' }
            ].map(p => (
              <button key={p.id} onClick={() => setPeriodo(p.id)} className={`px-6 py-3 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] transition-all ${periodo === p.id ? 'bg-white text-[#1A1630] shadow-2xl' : 'text-[#A09CB5] hover:text-[#6B6489]'}`}>
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* KPIs PRINCIPALES CON COMPARACIÓN */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-[#F7F5FF] p-8 rounded-[2.5rem] border border-[#EDE8F7] relative overflow-hidden group">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#A09CB5] mb-2">Ingresos</p>
          <h3 className="text-3xl font-black text-[#1A1630] tracking-tighter">${datos.ingresosPeriodo.toLocaleString()}</h3>
          <div className={`inline-flex items-center gap-2 mt-3 px-3 py-1 rounded-full text-[10px] font-black ${variacionIngresos >= 0 ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'}`}>
            <span>{variacionIngresos >= 0 ? '↑' : '↓'} {Math.abs(variacionIngresos)}%</span>
          </div>
          <div className="absolute -bottom-4 -right-4 w-20 h-20 bg-[#5B3DF5]/10 rounded-full blur-2xl group-hover:bg-[#5B3DF5]/20 transition-all" />
        </div>
        <div className="bg-[#F7F5FF] p-8 rounded-[2.5rem] border border-[#EDE8F7] relative overflow-hidden group">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#A09CB5] mb-2">Turnos</p>
          <h3 className="text-3xl font-black text-[#1A1630] tracking-tighter">{datos.turnosPeriodo}</h3>
          <div className={`inline-flex items-center gap-2 mt-3 px-3 py-1 rounded-full text-[10px] font-black ${variacionTurnos >= 0 ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'}`}>
            <span>{variacionTurnos >= 0 ? '↑' : '↓'} {Math.abs(variacionTurnos)}%</span>
          </div>
          <div className="absolute -bottom-4 -right-4 w-20 h-20 bg-violet-500/10 rounded-full blur-2xl group-hover:bg-violet-500/20 transition-all" />
        </div>
        <div className="bg-[#F7F5FF] p-8 rounded-[2.5rem] border border-[#EDE8F7] relative overflow-hidden group">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#A09CB5] mb-2">Ticket Prom.</p>
          <h3 className="text-3xl font-black text-[#1A1630] tracking-tighter">${datos.ticketPromedio.toLocaleString()}</h3>
          <div className="inline-flex items-center gap-2 mt-3 px-3 py-1 rounded-full text-[10px] font-black bg-[#F7F5FF] text-[#A09CB5] border border-[#EDE8F7]">
            <span>valor promedio</span>
          </div>
          <div className="absolute -bottom-4 -right-4 w-20 h-20 bg-fuchsia-500/10 rounded-full blur-2xl group-hover:bg-fuchsia-500/20 transition-all" />
        </div>
      </div>

      {/* GRÁFICO DE INGRESOS POR DÍA */}
      <div className="bg-[#F7F5FF] p-8 rounded-[2.5rem] border border-[#EDE8F7] mb-8 relative overflow-hidden group">
        <div className="flex items-center justify-between mb-8 relative z-10">
          <div>
            <h4 className="text-xl font-black text-[#1A1630] tracking-tighter">Ingresos por {periodo === 'todo' ? 'Mes' : 'Día'}</h4>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#A09CB5] mt-1">Tendencia de facturación</p>
          </div>
          <span className="text-3xl font-black text-[#5B3DF5] tracking-tighter">${datos.ingresosPeriodo.toLocaleString()}</span>
        </div>
        <div className="flex items-end gap-2 h-48 relative z-10">
          {datos.ingresosPorDia.map((d, idx) => (
            <div key={idx} className="flex-1 flex flex-col items-center gap-4 group min-w-0 h-full justify-end">
              <div className="w-full relative h-full flex items-end">
                <div 
                  className="w-full rounded-t-2xl transition-all duration-700 group-hover:opacity-100 opacity-40 bg-gradient-to-t from-[#5B3DF5] to-violet-500 shadow-[#5B3DF5]/20"
                  style={{ 
                    height: `${Math.max(3, (d.valor / maxIngresoDia) * 100)}%`,
                  }}
                />
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-white text-[#1A1630] text-[10px] font-black px-3 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-all whitespace-nowrap z-20 shadow-2xl scale-75 group-hover:scale-100">
                  ${d.valor.toLocaleString()}
                </div>
              </div>
              <span className="text-[8px] font-black text-[#A09CB5] uppercase tracking-tighter group-hover:text-[#A09CB5] transition-colors">{d.label}</span>
            </div>
          ))}
        </div>
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
          <div className="absolute bottom-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-[#5B3DF5]/5 blur-[80px]" />
        </div>
      </div>

      {/* GRID: TOP SERVICIOS + TOP EMPLEADOS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        
        {/* TOP SERVICIOS */}
        <div className="bg-[#F7F5FF] rounded-[2.5rem] border border-[#EDE8F7] overflow-hidden relative group">
          <div className="p-8 border-b border-[#EDE8F7]">
            <h4 className="text-xl font-black text-[#1A1630] tracking-tighter">{vocab.servicioPlural} más rentables</h4>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#A09CB5] mt-1">Por facturación</p>
          </div>
          {datos.topServicios.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#A09CB5]">Sin datos disponibles</p>
            </div>
          ) : (
            <div className="divide-y divide-[#EDE8F7]">
              {datos.topServicios.map((s, idx) => {
                const maxRev = datos.topServicios[0]?.revenue || 1
                return (
                  <div key={idx} className="px-8 py-5 flex items-center gap-4 hover:bg-[#E8DEFF]/40 transition-colors group/item">
                    <span className="text-xs font-black text-[#A09CB5] w-6 group-hover/item:text-[#5B3DF5] transition-colors">{idx + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-black text-[#1A1630] truncate leading-tight">{s.nombre}</p>
                      <div className="mt-2.5 h-1.5 bg-[#EDE8F7] rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-1000 bg-gradient-to-r from-[#5B3DF5] to-violet-500 shadow-[#5B3DF5]/20" style={{ width: `${(s.revenue / maxRev) * 100}%` }}></div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-black text-[#1A1630]">${s.revenue.toLocaleString()}</p>
                      <p className="text-[10px] font-black text-[#A09CB5] uppercase tracking-widest mt-1">{s.count} {vocab.turnos}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* TOP EMPLEADOS */}
        <div className="bg-[#F7F5FF] rounded-[2.5rem] border border-[#EDE8F7] overflow-hidden relative group">
          <div className="p-8 border-b border-[#EDE8F7]">
            <h4 className="text-xl font-black text-[#1A1630] tracking-tighter">{vocab.empleadoPlural} por rendimiento</h4>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#A09CB5] mt-1">Por facturación generada</p>
          </div>
          {datos.topEmpleados.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#A09CB5]">Sin datos disponibles</p>
            </div>
          ) : (
            <div className="divide-y divide-[#EDE8F7]">
              {datos.topEmpleados.map((e, idx) => {
                const maxRev = datos.topEmpleados[0]?.revenue || 1
                return (
                  <div key={idx} className="px-8 py-5 flex items-center gap-4 hover:bg-[#E8DEFF]/40 transition-colors group/item">
                    <div className="w-10 h-10 rounded-xl bg-[#5B3DF5]/20 text-[#5B3DF5] border border-[#5B3DF5]/20 flex items-center justify-center font-black text-sm shrink-0 group-hover/item:bg-[#5B3DF5] group-hover/item:text-white transition-all">
                      {e.nombre.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-black text-[#1A1630] truncate leading-tight">{e.nombre}</p>
                      <div className="mt-2.5 h-1.5 bg-[#EDE8F7] rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-1000 bg-gradient-to-r from-[#5B3DF5] to-violet-500 shadow-[#5B3DF5]/20" style={{ width: `${(e.revenue / maxRev) * 100}%` }}></div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-black text-[#1A1630]">${e.revenue.toLocaleString()}</p>
                      <p className="text-[10px] font-black text-[#A09CB5] uppercase tracking-widest mt-1">{e.count} {vocab.turnos}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* HORAS PICO + TOP CLIENTES */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-24">
        
        {/* HORAS PICO */}
        <div className="bg-[#F7F5FF] p-8 rounded-[2.5rem] border border-[#EDE8F7] relative group">
          <h4 className="text-xl font-black text-[#1A1630] tracking-tighter mb-1">Horas con más demanda</h4>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#A09CB5] mb-8">Distribución horaria</p>
          
          {Object.keys(datos.horasPico).length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#A09CB5]">Sin datos disponibles</p>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(datos.horasPico)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 6)
                .map(([hora, count]) => (
                  <div key={hora} className="flex items-center gap-4 group/item">
                    <span className="text-[10px] font-black text-[#A09CB5] w-12 shrink-0 group-hover/item:text-[#5B3DF5] transition-colors">{hora}:00</span>
                    <div className="flex-1 h-2 bg-[#EDE8F7] rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-1000 bg-gradient-to-r from-[#5B3DF5] to-violet-500 shadow-[#5B3DF5]/20" style={{ width: `${(count / maxHoraPico) * 100}%` }}></div>
                    </div>
                    <span className="text-xs font-black text-[#1A1630] w-6 text-right">{count}</span>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* TOP CLIENTES */}
        <div className="bg-[#F7F5FF] rounded-[2.5rem] border border-[#EDE8F7] overflow-hidden relative group">
          <div className="p-8 border-b border-[#EDE8F7]">
            <h4 className="text-xl font-black text-[#1A1630] tracking-tighter">{vocab.clientePlural.replace('Base de ', '')} destacados</h4>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#A09CB5] mt-1">Mayor facturación</p>
          </div>
          {datos.topClientes.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#A09CB5]">Sin datos disponibles</p>
            </div>
          ) : (
            <div className="divide-y divide-[#EDE8F7]">
              {datos.topClientes.map((c, idx) => (
                <div key={idx} className="px-8 py-5 flex items-center gap-4 hover:bg-[#E8DEFF]/40 transition-colors group/item">
                  <div className="w-10 h-10 rounded-xl bg-[#F7F5FF] border border-[#EDE8F7] flex items-center justify-center font-black text-sm text-[#A09CB5] group-hover/item:bg-white group-hover/item:text-[#1A1630] transition-all">
                    {c.nombre?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-[#1A1630] truncate leading-tight">{c.nombre}</p>
                    <p className="text-[10px] font-black text-[#A09CB5] uppercase tracking-widest mt-1">{c.count} {vocab.turnos}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-black text-[#1A1630]">${c.revenue.toLocaleString()}</p>
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
