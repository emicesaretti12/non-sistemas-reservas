import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

export default function Turnos({ negocioId }) {
  const [loading, setLoading] = useState(true)
  const [fechaActual, setFechaActual] = useState(new Date())
  const [turnos, setTurnos] = useState([])
  const [empleados, setEmpleados] = useState([])
  const [servicios, setServicios] = useState([])
  const [filtroEmpleado, setFiltroEmpleado] = useState('todos')
  
  const [modalAbierto, setModalAbierto] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [nuevoTurno, setNuevoTurno] = useState({
    cliente_nombre: '', cliente_telefono: '', empleado_id: '', servicio_id: '', hora: '09:00'
  })

  useEffect(() => {
    if (negocioId) bootSmartAgenda()
  }, [negocioId, fechaActual, filtroEmpleado])

  async function bootSmartAgenda() {
    setLoading(true)
    try {
      const [resEmp, resServ] = await Promise.all([
        supabase.from('empleados').select('*').eq('negocio_id', negocioId),
        supabase.from('servicios').select('*').eq('negocio_id', negocioId)
      ])
      
      if (resEmp.data) setEmpleados(resEmp.data)
      if (resServ.data) setServicios(resServ.data)

      // Timezone Safe Database Call
      const inicio = new Date(fechaActual); inicio.setHours(0,0,0,0)
      const fin = new Date(fechaActual); fin.setHours(23,59,59,999)

      let query = supabase.from('turnos')
        .select('*, empleados(nombre, foto_url), servicios(nombre, duracion, precio)')
        .eq('negocio_id', negocioId)
        .gte('fecha_hora', inicio.toISOString())
        .lte('fecha_hora', fin.toISOString())
        .order('fecha_hora', { ascending: true })

      if (filtroEmpleado !== 'todos') query = query.eq('empleado_id', filtroEmpleado)

      const { data, error } = await query
      if (error) throw error
      setTurnos(data || [])
    } catch (e) {
      console.error("Smart Agenda Error:", e.message)
    } finally {
      setLoading(false)
    }
  }

  const dispararGoogleCalendar = (turnoRaw, servicioData, empleadoData) => {
    // Si es un turno de DB, viene en UTC. Si es un insert manual fresco, armamos el Date
    const inicio = turnoRaw.fecha_hora ? new Date(turnoRaw.fecha_hora) : new Date(`${fechaActual.getFullYear()}-${String(fechaActual.getMonth()+1).padStart(2,'0')}-${String(fechaActual.getDate()).padStart(2,'0')}T${turnoRaw.hora}:00`)
    
    const duracion = servicioData?.duracion || 30
    const fin = new Date(inicio.getTime() + duracion * 60000)
    
    const fmt = (d) => d.toISOString().replace(/-|:|\.\d\d\d/g, "")
    
    const titulo = encodeURIComponent(`RESERVA: ${servicioData?.nombre || 'Servicio'} - ${turnoRaw.cliente_nombre}`)
    const detalles = encodeURIComponent(`Cliente: ${turnoRaw.cliente_nombre}\nWhatsApp: ${turnoRaw.cliente_telefono}\nEspecialista: ${empleadoData?.nombre}\n\nGestión: Non Sistemas`)
    const intervalo = `${fmt(inicio)}/${fmt(fin)}`
    
    window.open(`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${titulo}&dates=${intervalo}&details=${detalles}&sf=true&output=xml`, '_blank')
  }

  const obtenerRangoDias = () => {
    const dias = []
    for (let i = -7; i <= 30; i++) {
      const d = new Date(); d.setDate(d.getDate() + i)
      dias.push(d)
    }
    return dias
  }

  async function handleGuardarTurno(e) {
    e.preventDefault()
    setGuardando(true)
    try {
      // FORMATEO LOCAL ESTRICTO
      const yyyy = fechaActual.getFullYear()
      const mm = String(fechaActual.getMonth() + 1).padStart(2, '0')
      const dd = String(fechaActual.getDate()).padStart(2, '0')
      const dateObj = new Date(`${yyyy}-${mm}-${dd}T${nuevoTurno.hora}:00`)
      const fechaHoraExacta = dateObj.toISOString()

      // Verificación de colisión Timezone Safe
      const { data: colision } = await supabase
        .from('turnos')
        .select('id')
        .eq('empleado_id', nuevoTurno.empleado_id)
        .eq('fecha_hora', fechaHoraExacta)
        .eq('estado', 'confirmado')

      if (colision && colision.length > 0) {
        alert("Ese horario ya fue reservado para este empleado. Elija otro.")
        setGuardando(false)
        return
      }

      const serv = servicios.find(s => s.id === nuevoTurno.servicio_id)
      const emp = empleados.find(e => e.id === nuevoTurno.empleado_id)

      const { error } = await supabase.from('turnos').insert([{
        ...nuevoTurno, 
        negocio_id: negocioId, 
        fecha_hora: fechaHoraExacta, 
        estado: 'confirmado'
      }])

      if (error) throw error
      
      dispararGoogleCalendar(nuevoTurno, serv, emp)
      setModalAbierto(false)
      setNuevoTurno({ cliente_nombre: '', cliente_telefono: '', empleado_id: '', servicio_id: '', hora: '09:00' })
      bootSmartAgenda()
    } catch (err) {
      alert("Error al agendar: " + err.message)
    } finally {
      setGuardando(false)
    }
  }

  async function cancelarTurno(id) {
    if (confirm('¿Estás seguro de que deseas cancelar y eliminar este turno?')) {
      await supabase.from('turnos').delete().eq('id', id)
      bootSmartAgenda()
    }
  }

  const turnosMañana = turnos.filter(t => new Date(t.fecha_hora).getHours() < 12)
  const turnosTarde = turnos.filter(t => {
    const h = new Date(t.fecha_hora).getHours()
    return h >= 12 && h < 18
  })
  const turnosNoche = turnos.filter(t => new Date(t.fecha_hora).getHours() >= 18)

  const renderTurnoCard = (t) => {
    // Convierte el UTC de la DB a la hora local para mostrarlo bien
    const horaLocal = new Date(t.fecha_hora).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
    
    return (
      <div key={t.id} className="bg-white rounded-3xl p-5 md:p-6 shadow-[0_8px_30px_rgba(0,0,0,0.03)] border border-slate-100 flex items-center gap-4 md:gap-6 group hover:shadow-md transition-all">
         <div className="flex flex-col items-center justify-center shrink-0 w-16 md:w-20">
            <span className="text-2xl md:text-3xl font-black tracking-tighter text-slate-900 leading-none">{horaLocal}</span>
            <span className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{t.servicios?.duracion || 30} MIN</span>
         </div>
         
         <div className="w-px h-12 bg-slate-100 shrink-0"></div>

         <div className="flex-1 overflow-hidden">
            <h4 className="text-base md:text-lg font-bold text-slate-900 truncate leading-tight">{t.cliente_nombre}</h4>
            <div className="flex flex-wrap items-center gap-2 mt-1.5">
               <span className="text-[10px] md:text-[11px] font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md truncate uppercase tracking-widest">
                 {t.servicios?.nombre}
               </span>
               <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1 uppercase tracking-widest truncate">
                 <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                 {t.empleados?.nombre.split(' ')[0]}
               </span>
            </div>
         </div>

         <div className="flex flex-col sm:flex-row gap-2 shrink-0">
            <button onClick={() => dispararGoogleCalendar(t, t.servicios, t.empleados)} className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-slate-50 text-slate-400 hover:bg-blue-50 hover:text-blue-600 flex items-center justify-center transition-all shadow-sm" title="Agendar en Google">
               <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zM9 14H7v-2h2v2zm4 0h-2v-2h2v2zm4 0h-2v-2h2v2zm-8 4H7v-2h2v2zm4 0h-2v-2h2v2zm4 0h-2v-2h2v2z"/></svg>
            </button>
            <button onClick={() => cancelarTurno(t.id)} className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-slate-50 text-slate-400 hover:bg-red-50 hover:text-red-500 flex items-center justify-center transition-all shadow-sm" title="Cancelar Turno">
               <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
         </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[85vh] max-w-2xl mx-auto bg-[#F8FAFC] rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden relative">
      
      <header className="px-4 py-6 md:px-8 md:pt-8 md:pb-6 bg-white border-b border-slate-100 z-20 shrink-0">
         <div className="flex justify-between items-center mb-6">
            <div>
               <h1 className="text-3xl md:text-4xl font-bold tracking-tighter text-slate-900 leading-none">
                  {fechaActual.toLocaleDateString('es-ES', { month: 'long', day: 'numeric' })}
               </h1>
               <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400 mt-1.5">
                 {turnos.length} Citas Registradas
               </p>
            </div>
            <button onClick={() => setModalAbierto(true)} className="md:hidden w-12 h-12 rounded-full bg-slate-900 text-white flex items-center justify-center shadow-xl active:scale-90 transition-all">
               <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" strokeLinecap="round"/></svg>
            </button>
         </div>

         <div className="flex gap-2 overflow-x-auto no-scrollbar snap-x pb-2">
            {obtenerRangoDias().map((d, i) => {
               const isSelected = d.toDateString() === fechaActual.toDateString()
               const isToday = d.toDateString() === new Date().toDateString()
               return (
                  <button key={i} onClick={() => setFechaActual(d)} className={`snap-center shrink-0 w-14 md:w-16 py-3 md:py-4 rounded-2xl flex flex-col items-center transition-all ${isSelected ? 'bg-slate-900 text-white shadow-lg scale-[1.02]' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}>
                     <span className="text-[9px] font-bold uppercase tracking-widest mb-1">{d.toLocaleDateString('es-ES', { weekday: 'short' }).replace('.','')}</span>
                     <span className={`text-xl font-bold tracking-tighter ${isToday && !isSelected ? 'text-blue-500' : ''}`}>{d.getDate()}</span>
                  </button>
               )
            })}
         </div>

         <div className="flex gap-2 mt-4 overflow-x-auto no-scrollbar pb-1">
            <button onClick={() => setFiltroEmpleado('todos')} className={`px-4 py-2 rounded-full text-[9px] font-bold uppercase tracking-widest border transition-all shrink-0 ${filtroEmpleado === 'todos' ? 'bg-slate-900 border-slate-900 text-white shadow-md' : 'bg-white border-slate-200 text-slate-500'}`}>Staff Completo</button>
            {empleados.map(e => (
               <button key={e.id} onClick={() => setFiltroEmpleado(e.id)} className={`px-4 py-2 rounded-full text-[9px] font-bold uppercase tracking-widest border transition-all flex items-center gap-2 shrink-0 ${filtroEmpleado === e.id ? 'bg-slate-900 border-slate-900 text-white shadow-md' : 'bg-white border-slate-200 text-slate-500'}`}>
                  <div className="w-4 h-4 rounded-full overflow-hidden shrink-0 bg-slate-200">
                    {e.foto_url && <img src={e.foto_url} className="object-cover h-full w-full" />}
                  </div>
                  {e.nombre.split(' ')[0]}
               </button>
            ))}
         </div>
      </header>

      <div className="flex-1 overflow-y-auto no-scrollbar p-4 md:p-6 relative">
         {loading ? (
           <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin"></div>
           </div>
         ) : turnos.length === 0 ? (
           <div className="flex flex-col items-center justify-center h-full text-center opacity-50 py-20">
              <svg className="w-16 h-16 text-slate-300 mb-4" fill="none" stroke="currentColor" strokeWidth="1" viewBox="0 0 24 24"><path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
              <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Sin citas registradas</p>
           </div>
         ) : (
           <div className="space-y-8 pb-20">
              {turnosMañana.length > 0 && (
                <div className="space-y-4">
                   <div className="flex items-center gap-3 px-2">
                      <svg className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                      <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Turno Mañana</h3>
                      <div className="flex-1 h-px bg-slate-200"></div>
                   </div>
                   <div className="space-y-3">{turnosMañana.map(t => renderTurnoCard(t))}</div>
                </div>
              )}
              {turnosTarde.length > 0 && (
                <div className="space-y-4">
                   <div className="flex items-center gap-3 px-2">
                      <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" /></svg>
                      <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Turno Tarde</h3>
                      <div className="flex-1 h-px bg-slate-200"></div>
                   </div>
                   <div className="space-y-3">{turnosTarde.map(t => renderTurnoCard(t))}</div>
                </div>
              )}
              {turnosNoche.length > 0 && (
                <div className="space-y-4">
                   <div className="flex items-center gap-3 px-2">
                      <svg className="w-4 h-4 text-indigo-900" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
                      <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Turno Noche</h3>
                      <div className="flex-1 h-px bg-slate-200"></div>
                   </div>
                   <div className="space-y-3">{turnosNoche.map(t => renderTurnoCard(t))}</div>
                </div>
              )}
           </div>
         )}
      </div>

      <div className="hidden md:block absolute bottom-6 right-6 z-30">
         <button onClick={() => setModalAbierto(true)} className="flex items-center gap-3 px-8 py-4 rounded-full bg-slate-900 text-white shadow-[0_10px_30px_rgba(0,0,0,0.2)] hover:scale-105 active:scale-95 transition-all">
            <span className="text-[11px] font-bold uppercase tracking-[0.2em]">Agendar Turno</span>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" strokeLinecap="round"/></svg>
         </button>
      </div>

      {modalAbierto && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
           <div className="bg-white w-full max-w-lg rounded-t-[3rem] sm:rounded-[3rem] shadow-2xl p-6 md:p-10 animate-in slide-in-from-bottom-full duration-500 border border-slate-100">
              <div className="flex justify-between items-center mb-8">
                 <div>
                    <h2 className="text-3xl font-bold tracking-tighter text-slate-900">Nueva Cita</h2>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1">Carga manual en sistema</p>
                 </div>
                 <button onClick={() => setModalAbierto(false)} className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-all"><svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeLinecap="round"/></svg></button>
              </div>

              <form onSubmit={handleGuardarTurno} className="space-y-5">
                 <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-2">Nombre Cliente</label>
                    <input required className="w-full p-5 bg-[#F8FAFC] rounded-[1.5rem] outline-none font-bold text-slate-900 border border-transparent focus:bg-white focus:border-slate-300 transition-all text-base" placeholder="Ej: Juan Perez" value={nuevoTurno.cliente_nombre} onChange={e => setNuevoTurno({...nuevoTurno, cliente_nombre: e.target.value})} />
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                       <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-2">WhatsApp</label>
                       <input required type="tel" className="w-full p-5 bg-[#F8FAFC] rounded-[1.5rem] outline-none font-bold text-slate-900 border border-transparent focus:bg-white focus:border-slate-300 transition-all text-base" placeholder="351..." value={nuevoTurno.cliente_telefono} onChange={e => setNuevoTurno({...nuevoTurno, cliente_telefono: e.target.value})} />
                    </div>
                    <div className="space-y-1.5">
                       <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-2">Hora Inicio</label>
                       <input required type="time" className="w-full p-5 bg-[#F8FAFC] rounded-[1.5rem] outline-none font-bold text-slate-900 border border-transparent focus:bg-white focus:border-slate-300 transition-all text-base" value={nuevoTurno.hora} onChange={e => setNuevoTurno({...nuevoTurno, hora: e.target.value})} />
                    </div>
                 </div>

                 <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-1.5">
                       <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-2">Servicio Requerido</label>
                       <select required className="w-full p-5 bg-[#F8FAFC] rounded-[1.5rem] outline-none font-bold text-slate-900 border border-transparent focus:bg-white focus:border-slate-300 appearance-none transition-all text-sm cursor-pointer" value={nuevoTurno.servicio_id} onChange={e => setNuevoTurno({...nuevoTurno, servicio_id: e.target.value})}>
                          <option value="">Seleccionar Servicio</option>
                          {servicios.map(s => <option key={s.id} value={s.id}>{s.nombre} (${s.precio})</option>)}
                       </select>
                    </div>
                    <div className="space-y-1.5">
                       <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-2">Especialista</label>
                       <select required className="w-full p-5 bg-[#F8FAFC] rounded-[1.5rem] outline-none font-bold text-slate-900 border border-transparent focus:bg-white focus:border-slate-300 appearance-none transition-all text-sm cursor-pointer" value={nuevoTurno.empleado_id} onChange={e => setNuevoTurno({...nuevoTurno, empleado_id: e.target.value})}>
                          <option value="">Seleccionar Profesional</option>
                          {empleados.map(emp => <option key={emp.id} value={emp.id}>{emp.nombre}</option>)}
                       </select>
                    </div>
                 </div>

                 <button disabled={guardando} type="submit" className="w-full py-6 rounded-[1.5rem] bg-slate-900 text-white font-bold text-[11px] tracking-widest uppercase shadow-2xl active:scale-95 transition-all flex justify-center items-center gap-3 mt-6">
                    {guardando ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : 'Bloquear y Sincronizar'}
                 </button>
              </form>
           </div>
        </div>
      )}

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  )
}