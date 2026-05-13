import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { getVocabulario } from '../utils/vocabulario'
import { IconRobot } from './NoniIcons'

export default function Turnos({ negocioId, rubro, negocio }) {
  const vocab = getVocabulario(rubro)
  const [loading, setLoading] = useState(true)
  const [fechaActual, setFechaActual] = useState(new Date())
  const [turnos, setTurnos] = useState([])
  const [todosLosTurnos, setTodosLosTurnos] = useState([])
  const [empleados, setEmpleados] = useState([])
  const [servicios, setServicios] = useState([])
  const [filtroEmpleado, setFiltroEmpleado] = useState('todos')
  
  const [modalDiaAbierto, setModalDiaAbierto] = useState(false)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [nuevoTurno, setNuevoTurno] = useState({
    cliente_nombre: '', cliente_telefono: '', empleado_id: '', servicio_id: '', hora: '09:00'
  })

  // Unificamos el parseo ultra robusto de los strings de Supabase para toda la vista
  const safeParseDate = (dbString) => {
     let rawDate = dbString ? dbString.replace(' ', 'T') : ''
     if (!rawDate.endsWith('Z') && !rawDate.includes('+') && rawDate.split('-').length <= 3) {
        rawDate += 'Z'
     }
     const d = new Date(rawDate)
     return isNaN(d.getTime()) ? null : d
  }

  useEffect(() => {
    if (negocioId) bootSmartAgenda()
  }, [negocioId, filtroEmpleado])

  // Derivación sincrónica e inmediata: Los puntitos y la lista de abajo mirarán la misma fuente de verdad
  useEffect(() => {
    const filtradosDeHoy = todosLosTurnos.filter(t => {
       const tDate = safeParseDate(t.fecha_hora)
       if (!tDate) return false
       return tDate.getFullYear() === fechaActual.getFullYear() &&
              tDate.getMonth() === fechaActual.getMonth() &&
              tDate.getDate() === fechaActual.getDate()
    })
    setTurnos(filtradosDeHoy)
  }, [fechaActual, todosLosTurnos])

  // Scroll Lock nativo para móviles: evita que el fondo rebote o se mueva cuando el modal está abierto
  useEffect(() => {
    if (modalDiaAbierto || modalAbierto) {
      document.body.style.overflow = 'hidden'
      document.body.style.touchAction = 'none' // Previene tirones en iOS
    } else {
      document.body.style.overflow = ''
      document.body.style.touchAction = ''
    }
    return () => {
      document.body.style.overflow = ''
      document.body.style.touchAction = ''
    }
  }, [modalDiaAbierto, modalAbierto])

  async function bootSmartAgenda() {
    setLoading(true)
    try {
      const [resEmp, resServ] = await Promise.all([
        supabase.from('empleados').select('*').eq('negocio_id', negocioId),
        supabase.from('servicios').select('*').eq('negocio_id', negocioId)
      ])
      
      if (resEmp.data) setEmpleados(resEmp.data)
      if (resServ.data) setServicios(resServ.data)

      // Traer turnos muy amplios para que el administrador pueda navegar históricamente
      const limiteTemporal = new Date(fechaActual.getFullYear(), fechaActual.getMonth() - 2, 1)

      let query = supabase.from('turnos')
        .select('*, empleados(nombre, foto_url), servicios(nombre, duracion_minutos, precio)')
        .eq('negocio_id', negocioId)
        .gte('fecha_hora', limiteTemporal.toISOString())
        .order('fecha_hora', { ascending: true })

      if (filtroEmpleado !== 'todos') query = query.eq('empleado_id', filtroEmpleado)

      const { data, error } = await query
      if (error) throw error

      setTodosLosTurnos(data || [])
    } catch (e) {
      console.error("Smart Agenda Error:", e.message)
      // Si JWT expiró, intentar renovar sesión
      if (e.message?.includes('JWT') || e.message?.includes('expired')) {
        const { error: refreshErr } = await supabase.auth.refreshSession()
        if (refreshErr) {
          alert('Tu sesión expiró. Serás redirigido al login.')
          await supabase.auth.signOut()
          window.location.href = '/login'
        } else {
          // Reintentar la carga tras refresh exitoso
          bootSmartAgenda()
          return
        }
      }
    } finally {
      setLoading(false)
    }
  }

  const dispararGoogleCalendar = (turnoRaw, servicioData, empleadoData) => {
    // Si es un turno de DB, viene en UTC. Si es un insert manual fresco, armamos el Date
    const inicio = turnoRaw.fecha_hora ? new Date(turnoRaw.fecha_hora) : new Date(`${fechaActual.getFullYear()}-${String(fechaActual.getMonth()+1).padStart(2,'0')}-${String(fechaActual.getDate()).padStart(2,'0')}T${turnoRaw.hora}:00`)
    
    const duracion = servicioData?.duracion_minutos || 30
    const fin = new Date(inicio.getTime() + duracion * 60000)
    
    const fmt = (d) => d.toISOString().replace(/-|:|\.\d\d\d/g, "")
    
    const titulo = encodeURIComponent(`RESERVA: ${servicioData?.nombre || vocab.servicio} - ${turnoRaw.cliente_nombre}`)
    const detalles = encodeURIComponent(`Cliente: ${turnoRaw.cliente_nombre}\nWhatsApp: ${turnoRaw.cliente_telefono}\n${vocab.empleado.charAt(0).toUpperCase() + vocab.empleado.slice(1)}: ${empleadoData?.nombre}\n\nGestión: Non Sistemas`)
    const intervalo = `${fmt(inicio)}/${fmt(fin)}`
    
    window.open(`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${titulo}&dates=${intervalo}&details=${detalles}&sf=true&output=xml`, '_blank')
  }

  const renderCalendarioCompleto = () => {
    const year = fechaActual.getFullYear()
    const month = fechaActual.getMonth()
    const primerDia = new Date(year, month, 1).getDay()
    const diasEnMes = new Date(year, month + 1, 0).getDate()
    
    const nombresDias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
    const blanks = Array.from({ length: primerDia }).map((_, i) => <div key={`b-${i}`} className="p-1"></div>)
    
    const days = Array.from({ length: diasEnMes }).map((_, i) => {
      const dayNum = i + 1
      const d = new Date(year, month, dayNum)
      const isSelected = d.toDateString() === fechaActual.toDateString()
      const isToday = d.toDateString() === new Date().toDateString()
      
      // Contar turnos interactivos sincronizados con Parseo Exacto Multi-Navegador
      const turnosEseDia = todosLosTurnos.filter(t => {
         const tDate = safeParseDate(t.fecha_hora)
         if (!tDate) return false
         return tDate.getFullYear() === year &&
                tDate.getMonth() === month &&
                tDate.getDate() === dayNum
      })
      const contador = turnosEseDia.length
      
      return (
        <button 
          key={dayNum} 
          onClick={() => { setFechaActual(d); setModalDiaAbierto(true); }}
          className={`aspect-square flex flex-col items-center justify-center rounded-[1rem] md:rounded-2xl transition-all relative overflow-hidden ${isSelected ? 'bg-slate-900 text-white shadow-xl scale-110 z-10' : 'bg-slate-50 hover:bg-slate-200'} ${isToday && !isSelected ? 'border-2 border-blue-400' : 'border border-transparent'}`}
        >
          <span className={`text-[13px] md:text-base ${isSelected ? 'font-black' : 'font-bold text-slate-700'} mb-2 md:mb-1.5`}>{dayNum}</span>
          
          {contador > 0 && (
             <div className="absolute bottom-1 md:bottom-2 left-1/2 -translate-x-1/2 flex gap-0.5 md:gap-1 items-center">
                {contador < 4 ? 
                   Array.from({length: contador}).map((_, idx) => <div key={idx} className={`w-1 h-1 md:w-1.5 md:h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-blue-500'}`}></div>)
                   :
                   <div className={`text-[8px] md:text-[9px] font-black ${isSelected ? 'text-white' : 'text-blue-500'}`}>+{contador}</div>
                }
             </div>
          )}
        </button>
      )
    })

    return (
      <div className="bg-white border border-slate-100 rounded-3xl p-4 shadow-sm w-full animate-in fade-in zoom-in-95 duration-500">
        <div className="flex justify-between items-center mb-4 px-2">
           <button onClick={() => setFechaActual(new Date(year, month - 1, 1))} className="w-8 h-8 flex items-center justify-center bg-slate-50 text-slate-500 rounded-full hover:bg-slate-900 hover:text-white transition-all">
             <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
           </button>
           <h3 className="font-black text-slate-800 uppercase tracking-widest text-xs md:text-sm">
              {new Date(year, month, 1).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
           </h3>
           <button onClick={() => setFechaActual(new Date(year, month + 1, 1))} className="w-8 h-8 flex items-center justify-center bg-slate-50 text-slate-500 rounded-full hover:bg-slate-900 hover:text-white transition-all">
             <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
           </button>
        </div>
        <div className="grid grid-cols-7 gap-1 md:gap-2 mb-2 text-center">
           {nombresDias.map(n => <div key={n} className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{n}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1 md:gap-2">
           {blanks}
           {days}
        </div>
      </div>
    )
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

      const { hora, ...turnoData } = nuevoTurno
      const { error } = await supabase.from('turnos').insert([{
        ...turnoData, 
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
      const { error } = await supabase.from('turnos').delete().eq('id', id)
      
      if (error) {
        // Si el JWT expiró, intentar refrescar la sesión y reintentar
        if (error.message?.includes('JWT') || error.code === '401' || error.message?.includes('expired')) {
          const { error: refreshErr } = await supabase.auth.refreshSession()
          if (refreshErr) {
            alert('Tu sesión expiró. Serás redirigido al login.')
            await supabase.auth.signOut()
            window.location.href = '/login'
            return
          }
          // Reintentar tras refresh exitoso
          const { error: retryErr } = await supabase.from('turnos').delete().eq('id', id)
          if (retryErr) {
            alert('Error al eliminar el turno: ' + retryErr.message)
            return
          }
        } else {
          alert('Error al eliminar el turno: ' + error.message)
          return
        }
      }
      
      bootSmartAgenda()
    }
  }

  // ── Marcar estado del turno (completado / no_show) ──
  async function marcarEstado(id, nuevoEstado) {
    const label = nuevoEstado === 'completado' ? 'completado' : 'no-show'
    const { error } = await supabase.from('turnos').update({ estado: nuevoEstado }).eq('id', id)
    if (error) {
      alert(`Error al marcar como ${label}: ${error.message}`)
      return
    }
    bootSmartAgenda()
  }

  // ── Enviar recordatorio por WhatsApp ──
  async function enviarRecordatorio(t) {
    const num = t.cliente_telefono?.replace(/[^0-9]/g, '') || ''
    const nombreCorto = t.cliente_nombre?.split(' ')[0] || ''
    const servNombre = t.servicios?.nombre?.toLowerCase() || vocab.servicio
    const horaLocal = new Date(t.fecha_hora).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
    const fechaLocal = new Date(t.fecha_hora).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })
    const mje = `Hola ${nombreCorto}, te recuerdo tu ${servNombre} el ${fechaLocal} a las ${horaLocal} hs. ¡Te esperamos!`
    window.open(`https://wa.me/${num}?text=${encodeURIComponent(mje)}`, '_blank')

    const { error } = await supabase.from('turnos').update({ recordatorio_enviado: true }).eq('id', t.id)
    if (!error) {
      bootSmartAgenda()
    }
  }

  const extraeHoraSegura = (fechaString) => {
     const tDate = safeParseDate(fechaString)
     return tDate ? tDate.getHours() : 0
  }

  const turnosMañana = turnos.filter(t => extraeHoraSegura(t.fecha_hora) < 12)
  const turnosTarde = turnos.filter(t => {
    const h = extraeHoraSegura(t.fecha_hora)
    return h >= 12 && h < 18
  })
  const turnosNoche = turnos.filter(t => extraeHoraSegura(t.fecha_hora) >= 18)

  const renderTurnoCard = (t) => {
    // Convierte el UTC de la DB a la hora local para mostrarlo bien
    const horaLocal = new Date(t.fecha_hora).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
    const fechaAmigable = new Date(t.fecha_hora).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })
    const esResuelto = t.estado === 'completado' || t.estado === 'no_show'
    const esFuturo = new Date(t.fecha_hora) > new Date()
    
    return (
      <div key={t.id} className={`rounded-2xl md:rounded-3xl p-4 md:p-6 shadow-[0_8px_30px_rgba(0,0,0,0.03)] border flex flex-col md:flex-row items-start md:items-center gap-3 md:gap-6 group transition-all ${
        t.estado === 'completado' ? 'bg-emerald-50/50 border-emerald-100 opacity-75' :
        t.estado === 'no_show' ? 'bg-red-50/30 border-red-100 opacity-60' :
        'bg-white border-slate-100 hover:shadow-md'
      }`}>
         <div className="flex md:flex-col items-center gap-2.5 md:gap-0 justify-between md:justify-center shrink-0 w-full md:w-20">
            <span className={`text-2xl md:text-3xl font-black tracking-tighter leading-none ${esResuelto ? 'text-slate-400' : 'text-slate-900'}`}>{horaLocal}</span>
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest md:mt-1">{t.servicios?.duracion_minutos || 30} MIN</span>
              {/* Estado badge */}
              {t.estado === 'completado' && (
                <span className="text-[8px] font-bold text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded-md uppercase tracking-wider md:mt-1">Atendido</span>
              )}
              {t.estado === 'no_show' && (
                <span className="text-[8px] font-bold text-red-600 bg-red-100 px-1.5 py-0.5 rounded-md uppercase tracking-wider md:mt-1">No vino</span>
              )}
            </div>
         </div>
         
         <div className="hidden md:block w-px h-16 bg-slate-100 shrink-0"></div>

         <div className="flex-1 overflow-hidden w-full">
            <h4 className={`text-base md:text-xl font-bold truncate leading-tight mb-0.5 md:mb-1 ${esResuelto ? 'text-slate-500 line-through decoration-1' : 'text-slate-900'}`}>{t.cliente_nombre}</h4>
            
            <div className="flex items-center gap-2 mb-2 text-slate-500">
               <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
               <span className="text-xs font-semibold tracking-wide">{t.cliente_telefono}</span>
               
               {t.cliente_email && (
                 <>
                   <span className="w-1 h-1 bg-slate-300 rounded-full mx-1"></span>
                   <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2v10a2 2 0 002 2z"/></svg>
                   <span className="text-xs font-semibold tracking-wide truncate">{t.cliente_email}</span>
                 </>
               )}
            </div>

            <div className="flex flex-wrap items-center gap-2 mt-2">
               <span className="text-[10px] md:text-[11px] font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md truncate uppercase tracking-widest">
                 {t.servicios?.nombre}
               </span>
               <span className="text-[10px] font-bold text-slate-500 bg-slate-50 px-2.5 py-1 rounded-md flex items-center gap-1.5 uppercase tracking-widest truncate">
                 <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                 {t.empleados ? t.empleados.nombre.split(' ')[0] : vocab.fallbackStaff}
               </span>
               {t.servicios?.precio > 0 && (
                 <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md uppercase tracking-widest">
                   ${t.servicios.precio}
                 </span>
               )}
               {t.notas && (
                 <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-md flex items-center gap-1.5 uppercase tracking-widest">
                   <svg className="w-3 h-3 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
                   {t.notas}
                 </span>
               )}
            </div>
         </div>

         {/* Action buttons */}
         <div className="flex flex-row gap-1.5 shrink-0 w-full md:w-auto mt-1 md:mt-0 justify-end border-t md:border-none border-slate-50 pt-3 md:pt-0">
            {esResuelto ? (
              /* Resolved state — only show undo */
              <button onClick={() => marcarEstado(t.id, 'confirmado')} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600 text-[9px] font-bold uppercase tracking-widest transition-all" title="Revertir estado">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a5 5 0 010 10H9m-6-10l4-4m-4 4l4 4"/></svg>
                Revertir
              </button>
            ) : (
              /* Active state — full action set */
              <>
                {/* Mark completed */}
                <button onClick={() => marcarEstado(t.id, 'completado')} className="w-10 h-10 md:w-11 md:h-11 rounded-xl bg-emerald-50 text-emerald-500 hover:bg-emerald-500 hover:text-white flex items-center justify-center transition-all shadow-sm" title="Marcar como atendido">
                   <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>
                {/* Mark no-show */}
                <button onClick={() => marcarEstado(t.id, 'no_show')} className="w-10 h-10 md:w-11 md:h-11 rounded-xl bg-orange-50 text-orange-500 hover:bg-orange-500 hover:text-white flex items-center justify-center transition-all shadow-sm" title="No se presentó">
                   <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>
                {/* WhatsApp reminder */}
                <button onClick={() => enviarRecordatorio(t)} className={`w-10 h-10 md:w-11 md:h-11 rounded-xl flex items-center justify-center transition-all shadow-sm ${t.recordatorio_enviado ? 'bg-emerald-500 text-white' : 'bg-slate-50 text-slate-400 hover:bg-green-50 hover:text-green-500'}`} title={t.recordatorio_enviado ? 'Recordatorio enviado' : 'Enviar recordatorio por WhatsApp'}>
                   <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/></svg>
                </button>
                {/* Google Calendar */}
                <button onClick={() => dispararGoogleCalendar(t, t.servicios, t.empleados)} className="w-10 h-10 md:w-11 md:h-11 rounded-xl bg-slate-50 text-slate-400 hover:bg-blue-50 hover:text-blue-600 flex items-center justify-center transition-all shadow-sm shrink-0" title="Agendar en Google">
                   <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zM9 14H7v-2h2v2zm4 0h-2v-2h2v2zm4 0h-2v-2h2v2zm-8 4H7v-2h2v2zm4 0h-2v-2h2v2zm4 0h-2v-2h2v2z"/></svg>
                </button>
                {/* Cancel */}
                <button onClick={() => cancelarTurno(t.id)} className="w-10 h-10 md:w-11 md:h-11 rounded-xl bg-slate-50 text-slate-400 hover:bg-red-50 hover:text-red-500 flex items-center justify-center transition-all shadow-sm shrink-0" title="Cancelar Turno">
                   <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>
              </>
            )}
         </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col max-w-2xl mx-auto bg-[#F8FAFC] rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden relative">
      
      {loading && (
         <div className="absolute top-4 right-4 z-50">
            <div className="w-6 h-6 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin"></div>
         </div>
      )}

      {/* VISTA PRINCIPAL: CALENDARIO PANORÁMICO */}
      <div className="flex-1 px-3 py-5 md:px-8 md:py-8 bg-[#F8FAFC] overflow-y-auto no-scrollbar w-full">
         <div className="mb-5 md:mb-8 px-1 md:px-2">
            <h1 className="text-2xl md:text-5xl font-black tracking-tighter text-slate-900 leading-none">
               Agenda
            </h1>
            <p className="text-[9px] md:text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400 mt-1 md:mt-2">
              {todosLosTurnos.length} {vocab.citasRegistradas}
            </p>
         </div>

         <div className="mb-4 md:mb-8 w-full">
            {renderCalendarioCompleto()}
         </div>

         <div className="flex gap-2 overflow-x-auto no-scrollbar pb-4 px-2 w-full">
            <button onClick={() => setFiltroEmpleado('todos')} className={`px-4 py-3 rounded-2xl text-[9px] font-bold uppercase tracking-widest border transition-all shrink-0 ${filtroEmpleado === 'todos' ? 'bg-slate-900 border-slate-900 text-white shadow-lg' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}>{vocab.filtroTodos}</button>
            {empleados.map(e => (
               <button key={e.id} onClick={() => setFiltroEmpleado(e.id)} className={`px-4 py-3 rounded-2xl text-[9px] font-bold uppercase tracking-widest border transition-all flex items-center gap-2 shrink-0 ${filtroEmpleado === e.id ? 'bg-slate-900 border-slate-900 text-white shadow-lg' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                  <div className="w-5 h-5 rounded-full overflow-hidden shrink-0 bg-slate-200">
                    {e.foto_url && <img src={e.foto_url} className="object-cover h-full w-full" />}
                  </div>
                  {e.nombre.split(' ')[0]}
               </button>
            ))}
         </div>

         {/* === PRÓXIMOS TURNOS === */}
         {(() => {
           const ahora = new Date()
           const proximos = todosLosTurnos
             .filter(t => {
               const tDate = safeParseDate(t.fecha_hora)
               return tDate && tDate > ahora
             })
             .slice(0, 5)
           
           if (proximos.length === 0) return null
           return (
             <div className="mt-6 md:mt-8 px-1">
               <div className="flex items-center gap-2 mb-3">
                 <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                 <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">Próximos {vocab.turnos}</h3>
               </div>
               <div className="space-y-2">
                 {proximos.map(t => {
                   const tDate = safeParseDate(t.fecha_hora)
                   const horaStr = tDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
                   const fechaStr = tDate.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' }).replace('.', '')
                   const esHoy = tDate.toDateString() === new Date().toDateString()
                   return (
                     <div key={t.id} className="bg-white rounded-xl p-3 border border-slate-100 shadow-sm flex items-center gap-3 hover:shadow-md transition-all">
                       <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center shrink-0 ${esHoy ? 'bg-blue-50 text-blue-600' : 'bg-slate-50 text-slate-600'}`}>
                         <span className="text-sm font-black leading-none">{horaStr}</span>
                         <span className="text-[8px] font-bold uppercase tracking-wider mt-0.5 opacity-60">{esHoy ? 'Hoy' : fechaStr}</span>
                       </div>
                       <div className="flex-1 min-w-0">
                         <p className="text-sm font-bold text-slate-900 truncate">{t.cliente_nombre}</p>
                         <p className="text-[10px] text-slate-400 font-medium truncate">
                           {t.servicios?.nombre} · {t.empleados?.nombre?.split(' ')[0] || vocab.fallbackStaff}
                         </p>
                       </div>
                       <a
                         href={`https://wa.me/${t.cliente_telefono?.replace(/[^0-9]/g, '')}`}
                         target="_blank"
                         rel="noopener noreferrer"
                         className="w-8 h-8 rounded-lg bg-green-50 text-green-500 flex items-center justify-center hover:bg-green-100 transition-colors shrink-0"
                         title="WhatsApp"
                       >
                         <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" /></svg>
                       </a>
                     </div>
                   )
                 })}
               </div>
             </div>
           )
         })()}

         {/* === LUGARES LIBRES HOY === */}
         {(() => {
           const horarios = negocio?.horarios
           if (!horarios) return null
           
           const diasMap = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']
           const hoy = new Date()
           const diaKey = diasMap[hoy.getDay()]
           const config = horarios[diaKey]
           
           if (!config || !config.abierto) return (
             <div className="mt-6 md:mt-8 px-1">
               <div className="flex items-center gap-2 mb-3">
                 <div className="w-2 h-2 bg-slate-300 rounded-full" />
                 <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">Lugares libres hoy</h3>
               </div>
               <div className="bg-white rounded-xl p-4 border border-slate-100 text-center">
                 <p className="text-sm text-slate-400 font-medium">Hoy no hay horario de atención configurado</p>
               </div>
             </div>
           )
           
           // Generate all possible time slots based on the minimum service duration
           const minDuration = servicios.length > 0 
             ? Math.min(...servicios.map(s => s.duracion_minutos || 30))
             : 30
           
           const parseTime = (str) => {
             const [h, m] = str.split(':').map(Number)
             return h * 60 + m
           }
           
           const inicioMin = parseTime(config.inicio)
           const finMin = parseTime(config.fin)
           const pausaInicio = config.pausa ? parseTime(config.inicioPausa) : null
           const pausaFin = config.pausa ? parseTime(config.finPausa) : null
           
           // Get booked slots for today
           const turnosHoy = todosLosTurnos.filter(t => {
             const tDate = safeParseDate(t.fecha_hora)
             if (!tDate) return false
             return tDate.toDateString() === hoy.toDateString()
           })
           
           const bookedMinutes = turnosHoy.map(t => {
             const tDate = safeParseDate(t.fecha_hora)
             const start = tDate.getHours() * 60 + tDate.getMinutes()
             const dur = t.servicios?.duracion_minutos || 30
             return { start, end: start + dur, empId: t.empleado_id }
           })
           
           // Generate free slots for each employee
           const freeSlots = []
           const nowMin = hoy.getHours() * 60 + hoy.getMinutes()
           
           const empsActivos = empleados.filter(e => e.estado === 'activo' || !e.estado)
           
           empsActivos.forEach(emp => {
             const empBookings = bookedMinutes.filter(b => b.empId === emp.id)
             
             for (let slot = inicioMin; slot + minDuration <= finMin; slot += minDuration) {
               // Skip pause period
               if (pausaInicio !== null && slot >= pausaInicio && slot < pausaFin) continue
               // Skip past slots
               if (slot < nowMin) continue
               // Check if slot overlaps with any booking
               const isBooked = empBookings.some(b => {
                 return (slot >= b.start && slot < b.end) || (slot + minDuration > b.start && slot < b.end)
               })
               if (!isBooked) {
                 freeSlots.push({
                   time: slot,
                   timeStr: `${String(Math.floor(slot / 60)).padStart(2, '0')}:${String(slot % 60).padStart(2, '0')}`,
                   emp: emp,
                 })
               }
             }
           })
           
           // Group by time
           const byTime = {}
           freeSlots.forEach(s => {
             if (!byTime[s.timeStr]) byTime[s.timeStr] = []
             byTime[s.timeStr].push(s.emp)
           })
           
           const timeKeys = Object.keys(byTime).sort()
           
           if (timeKeys.length === 0) return (
             <div className="mt-6 md:mt-8 px-1">
               <div className="flex items-center gap-2 mb-3">
                 <div className="w-2 h-2 bg-emerald-400 rounded-full" />
                 <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">Lugares libres hoy</h3>
               </div>
               <div className="bg-white rounded-xl p-4 border border-slate-100 text-center">
                 <p className="text-sm text-slate-400 font-medium">No hay lugares disponibles por el resto del día</p>
               </div>
             </div>
           )
           
           return (
             <div className="mt-6 md:mt-8 px-1">
               <div className="flex items-center justify-between mb-3">
                 <div className="flex items-center gap-2">
                   <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                   <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">Lugares libres hoy</h3>
                 </div>
                 <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full uppercase tracking-widest">
                   {timeKeys.length} {timeKeys.length === 1 ? 'horario' : 'horarios'}
                 </span>
               </div>
               <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                 {timeKeys.slice(0, 12).map(time => (
                   <button
                     key={time}
                     onClick={() => {
                       setFechaActual(new Date())
                       setNuevoTurno(prev => ({ ...prev, hora: time, empleado_id: byTime[time][0]?.id || '' }))
                       setModalAbierto(true)
                     }}
                     className="bg-white rounded-xl p-3 border border-emerald-100 hover:border-emerald-300 hover:shadow-md transition-all text-left group"
                   >
                     <p className="text-lg font-black text-slate-900 tracking-tighter group-hover:text-emerald-600 transition-colors">{time}</p>
                     <div className="flex items-center gap-1 mt-1">
                       {byTime[time].slice(0, 3).map(emp => (
                         <div key={emp.id} className="w-5 h-5 rounded-full bg-slate-100 overflow-hidden border border-white shadow-sm" title={emp.nombre}>
                           {emp.foto_url ? <img src={emp.foto_url} className="w-full h-full object-cover" /> : <span className="text-[8px] font-bold text-slate-400 flex items-center justify-center h-full">{emp.nombre[0]}</span>}
                         </div>
                       ))}
                       {byTime[time].length > 3 && <span className="text-[9px] font-bold text-slate-400">+{byTime[time].length - 3}</span>}
                     </div>
                     <p className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest mt-1.5">
                       {byTime[time].length} {byTime[time].length === 1 ? 'disponible' : 'disponibles'}
                     </p>
                   </button>
                 ))}
               </div>
               {timeKeys.length > 12 && (
                 <p className="text-[10px] text-slate-400 font-medium text-center mt-3">Y {timeKeys.length - 12} horarios más disponibles</p>
               )}
             </div>
           )
         })()}

         {/* Spacer for FAB */}
         <div className="h-24" />
      </div>

      <div className="absolute bottom-6 right-4 md:bottom-6 md:right-6 z-30 ns-fab-mobile">
         <button onClick={() => setModalAbierto(true)} className="flex items-center gap-2 px-5 md:px-8 py-3.5 md:py-4 rounded-full bg-slate-900 text-white shadow-[0_10px_30px_rgba(0,0,0,0.2)] hover:scale-105 active:scale-95 transition-all">
            <svg className="w-5 h-5 md:w-5 md:h-5" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" strokeLinecap="round"/></svg>
            <span className="text-[10px] md:text-[11px] font-bold uppercase tracking-[0.15em] md:tracking-[0.2em]">{vocab.nuevaCita}</span>
         </button>
      </div>

      {/* MODAL BOTTOM-SHEET PARA VER TURNOS DEL DIA SELECCIONADO */}
      {modalDiaAbierto && (
        <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
           <div className="bg-white w-full max-w-lg rounded-t-[3rem] sm:rounded-[3rem] shadow-2xl h-[85vh] sm:h-[80vh] flex flex-col animate-in slide-in-from-bottom-[60%] sm:zoom-in-95 duration-500 overflow-hidden sm:m-4 border border-slate-100">
               
              <div className="px-6 pt-8 pb-6 border-b border-slate-100 flex justify-between items-center bg-white shrink-0 z-10 shadow-sm relative">
                 <div>
                    <h2 className="text-3xl font-black tracking-tighter text-slate-900 leading-none">
                       {fechaActual.getDate()} {fechaActual.toLocaleDateString('es-ES', { month: 'short' }).replace('.','')}
                    </h2>
                    <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400 mt-1.5">{turnos.length} {vocab.citasAsignadas}</p>
                 </div>
                 <button onClick={() => setModalDiaAbierto(false)} className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-900 hover:bg-slate-200 transition-all active:scale-90"><svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeLinecap="round"/></svg></button>
              </div>

              <div className="flex-1 overflow-y-auto bg-[#F8FAFC] p-4 md:p-6 no-scrollbar relative">
                 {turnos.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center py-20 pb-40">
                       {servicios.length === 0 || empleados.length === 0 ? (
                         <>
                           <div className="w-14 h-14 bg-gradient-to-br from-purple-100 to-blue-50 rounded-2xl flex items-center justify-center mb-4">
                             <IconRobot size={28} className="text-purple-500" />
                           </div>
                           <p className="text-sm font-bold text-slate-700">Todavía no podés recibir turnos</p>
                           <p className="text-[11px] text-slate-400 font-medium mt-2 max-w-[260px] leading-relaxed">
                             {servicios.length === 0 ? 'Primero creá al menos un servicio' : 'Agregá al menos un profesional a tu equipo'} para que los clientes puedan reservar.
                           </p>
                         </>
                       ) : (
                         <>
                           <svg className="w-14 h-14 text-slate-200 mb-4" fill="none" stroke="currentColor" strokeWidth="1" viewBox="0 0 24 24"><path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                           <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Día Libre</p>
                           <p className="text-[10px] text-slate-400 font-medium mt-2">Tocá el botón "+" para agendar un turno manual</p>
                         </>
                       )}
                    </div>
                 ) : (
                   <div className="space-y-8 pb-32">
                      {turnosMañana.length > 0 && (
                        <div className="space-y-4">
                           <div className="flex items-center gap-3 px-2">
                              <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Bloque Mañana</h3>
                              <div className="flex-1 h-px bg-slate-200"></div>
                           </div>
                           <div className="space-y-3">{turnosMañana.map(t => renderTurnoCard(t))}</div>
                        </div>
                      )}
                      {turnosTarde.length > 0 && (
                        <div className="space-y-4">
                           <div className="flex items-center gap-3 px-2">
                              <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" /></svg>
                              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Bloque Tarde</h3>
                              <div className="flex-1 h-px bg-slate-200"></div>
                           </div>
                           <div className="space-y-3">{turnosTarde.map(t => renderTurnoCard(t))}</div>
                        </div>
                      )}
                      {turnosNoche.length > 0 && (
                        <div className="space-y-4">
                           <div className="flex items-center gap-3 px-2">
                              <svg className="w-5 h-5 text-indigo-900" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
                              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Bloque Noche</h3>
                              <div className="flex-1 h-px bg-slate-200"></div>
                           </div>
                           <div className="space-y-3">{turnosNoche.map(t => renderTurnoCard(t))}</div>
                        </div>
                      )}
                   </div>
                 )}
              </div>
           </div>
        </div>
      )}

      {/* MODAL PARA AGREGAR NUEVO TURNO (CARGA MANUAL) */}
      {modalAbierto && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
           <div className="bg-white w-full max-w-lg rounded-t-[2.5rem] sm:rounded-[3rem] shadow-2xl p-5 md:p-10 animate-in slide-in-from-bottom-[20%] duration-500 border border-slate-100 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6 md:mb-8">
                 <div>
                    <h2 className="text-2xl md:text-3xl font-bold tracking-tighter text-slate-900">{vocab.nuevaCita}</h2>
                    <p className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1">Carga manual en sistema</p>
                 </div>
                 <button onClick={() => setModalAbierto(false)} className="w-10 h-10 md:w-12 md:h-12 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-all"><svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeLinecap="round"/></svg></button>
              </div>

              <form onSubmit={handleGuardarTurno} className="space-y-4 md:space-y-5">
                 <div className="space-y-1.5">
                    <label className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1 md:ml-2">Nombre Cliente</label>
                    <input required className="w-full p-4 md:p-5 bg-[#F8FAFC] rounded-[1.2rem] md:rounded-[1.5rem] outline-none font-bold text-slate-900 border border-transparent focus:bg-white focus:border-slate-300 transition-all text-sm md:text-base" placeholder="Ej: Juan Perez" value={nuevoTurno.cliente_nombre} onChange={e => setNuevoTurno({...nuevoTurno, cliente_nombre: e.target.value})} />
                 </div>

                 <div className="grid grid-cols-2 gap-3 md:gap-4">
                    <div className="space-y-1.5">
                       <label className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1 md:ml-2">WhatsApp</label>
                       <input required type="tel" className="w-full p-4 md:p-5 bg-[#F8FAFC] rounded-[1.2rem] md:rounded-[1.5rem] outline-none font-bold text-slate-900 border border-transparent focus:bg-white focus:border-slate-300 transition-all text-sm md:text-base" placeholder="351..." value={nuevoTurno.cliente_telefono} onChange={e => setNuevoTurno({...nuevoTurno, cliente_telefono: e.target.value})} />
                    </div>
                    <div className="space-y-1.5">
                       <label className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1 md:ml-2">Hora Inicio</label>
                       <input required type="time" className="w-full p-4 md:p-5 bg-[#F8FAFC] rounded-[1.2rem] md:rounded-[1.5rem] outline-none font-bold text-slate-900 border border-transparent focus:bg-white focus:border-slate-300 transition-all text-sm md:text-base" value={nuevoTurno.hora} onChange={e => setNuevoTurno({...nuevoTurno, hora: e.target.value})} />
                    </div>
                 </div>

                 <div className="space-y-3 md:space-y-4">
                    <div className="space-y-1.5">
                       <label className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1 md:ml-2">{vocab.labelServicioRequerido}</label>
                       <select required className="w-full p-4 md:p-5 bg-[#F8FAFC] rounded-[1.2rem] md:rounded-[1.5rem] outline-none font-bold text-slate-900 border border-transparent focus:bg-white focus:border-slate-300 appearance-none transition-all text-sm cursor-pointer" value={nuevoTurno.servicio_id} onChange={e => setNuevoTurno({...nuevoTurno, servicio_id: e.target.value})}>
                          <option value="">{vocab.seleccionarServicio}</option>
                          {servicios.map(s => <option key={s.id} value={s.id}>{s.nombre} (${s.precio})</option>)}
                       </select>
                    </div>
                    <div className="space-y-1.5">
                       <label className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1 md:ml-2">{vocab.labelEmpleado}</label>
                       <select required className="w-full p-4 md:p-5 bg-[#F8FAFC] rounded-[1.2rem] md:rounded-[1.5rem] outline-none font-bold text-slate-900 border border-transparent focus:bg-white focus:border-slate-300 appearance-none transition-all text-sm cursor-pointer" value={nuevoTurno.empleado_id} onChange={e => setNuevoTurno({...nuevoTurno, empleado_id: e.target.value})}>
                          <option value="">{vocab.seleccionarEmpleado}</option>
                          {empleados.map(emp => <option key={emp.id} value={emp.id}>{emp.nombre}</option>)}
                       </select>
                    </div>
                 </div>

                 <button disabled={guardando} type="submit" className="w-full py-5 md:py-6 rounded-[1.2rem] md:rounded-[1.5rem] bg-slate-900 text-white font-bold text-[10px] md:text-[11px] tracking-widest uppercase shadow-2xl active:scale-95 transition-all flex justify-center items-center gap-3 mt-4 md:mt-6">
                    {guardando ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : vocab.confirmarCita}
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