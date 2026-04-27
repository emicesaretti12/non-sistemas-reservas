import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { getVocabulario, esGastronomia } from '../utils/vocabulario'

export default function VistaPublica() {
  const { id } = useParams()
  
  // --- CORE DATA STATE ---
  const [loading, setLoading] = useState(true)
  const [negocio, setNegocio] = useState(null)
  const [servicios, setServicios] = useState([])
  const [empleados, setEmpleados] = useState([])
  
  // --- UI & FLOW STATE ---
  const [paso, setPaso] = useState(1)
  const [bioExpandida, setBioExpandida] = useState(false)
  const [reserva, setReserva] = useState({
    servicioId: null, 
    empleadoId: null, 
    fecha: '', 
    hora: '', 
    clienteNombre: '', 
    clienteTelefono: '',
    clienteEmail: '',
    campoExtra: ''
  })
  
  // --- CALENDAR & SLOTS STATE ---
  const [horasDisponibles, setHorasDisponibles] = useState({ mañana: [], tarde: [], noche: [] })
  const [buscandoHoras, setBuscandoHoras] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [diasCalendario, setDiasCalendario] = useState([])

  // Scroll lock en pasos de formulario en mobile
  useEffect(() => {
    // Scroll to top on step change for better mobile UX
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [paso])

  useEffect(() => {
    bootBrandedApp()
  }, [id])

  async function bootBrandedApp() {
    try {
      setLoading(true)
      const { data: biz, error } = await supabase
        .from('negocios')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      setNegocio(biz)

      const { data: srvs } = await supabase.from('servicios').select('*').eq('negocio_id', id)
      const { data: emps } = await supabase.from('empleados').select('*').eq('negocio_id', id)
      
      setServicios(srvs || [])
      setEmpleados(emps || [])
      generarCalendarioPro(biz.horarios)
    } catch (e) {
      console.error("Nucleus Error:", e.message)
    } finally {
      setLoading(false)
    }
  }

  // --- MOTOR DE FECHAS TIMEZONE SAFE ---
  const generarCalendarioPro = (horarios) => {
    const calendar = []
    const hoy = new Date()
    const daysMap = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']
    
    for (let i = 0; i < 90; i++) {
      const date = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + i)
      const isOpen = horarios?.[daysMap[date.getDay()]]?.abierto || false
      
      const yyyy = date.getFullYear()
      const mm = String(date.getMonth() + 1).padStart(2, '0')
      const dd = String(date.getDate()).padStart(2, '0')
      const fechaLocalStr = `${yyyy}-${mm}-${dd}`
      
      calendar.push({
        weekday: date.toLocaleDateString('es-ES', { weekday: 'short' }).toUpperCase().replace('.', ''),
        number: date.getDate(),
        month: date.toLocaleDateString('es-ES', { month: 'short' }).toUpperCase(),
        monthLong: date.toLocaleDateString('es-ES', { month: 'long' }),
        full: fechaLocalStr,
        available: isOpen,
        isNewMonth: date.getDate() === 1 || i === 0,
        isToday: i === 0
      })
    }
    setDiasCalendario(calendar)
  }

  const handleDateSelect = async (day) => {
    if (!day.available) return
    setReserva({ ...reserva, fecha: day.full, hora: '' })
    setBuscandoHoras(true)
    
    const [year, month, d] = day.full.split('-').map(Number)
    const dateObj = new Date(year, month - 1, d)
    
    const daysName = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']
    const config = negocio.horarios?.[daysName[dateObj.getDay()]]

    if (!config || !config.abierto || !config.inicio || !config.fin) {
      setHorasDisponibles({ mañana: [], tarde: [], noche: [] })
      setBuscandoHoras(false)
      return
    }

    const slots = []
    let cursor = config.inicio
    while (cursor < config.fin) {
      slots.push(cursor)
      const [h, m] = cursor.split(':').map(Number)
      const tempD = new Date()
      tempD.setHours(h, m + 30)
      cursor = tempD.toTimeString().slice(0, 5)
    }

    try {
      // Filtrado blindado por zona horaria local a UTC
      const inicioDiaISO = new Date(year, month - 1, d, 0, 0, 0).toISOString()
      const finDiaISO = new Date(year, month - 1, d, 23, 59, 59, 999).toISOString()

      const { data: taken } = await supabase
        .from('turnos')
        .select('fecha_hora, servicios(duracion_minutos)')
        .eq('empleado_id', reserva.empleadoId)
        .eq('estado', 'confirmado')
        .gte('fecha_hora', inicioDiaISO)
        .lte('fecha_hora', finDiaISO)

      const bookedIntervals = taken?.map(t => {
        let rawDate = t.fecha_hora ? t.fecha_hora.replace(' ', 'T') : ''
        if (!rawDate.endsWith('Z') && !rawDate.includes('+') && rawDate.split('-').length <= 3) {
           rawDate += 'Z'
        }
        const bdDate = new Date(rawDate)
        if (isNaN(bdDate.getTime())) return null

        const startMins = bdDate.getHours() * 60 + bdDate.getMinutes()
        const duration = t.servicios?.duracion_minutos || 30
        return { startMins, endMins: startMins + duration }
      }).filter(Boolean) || []

      const selectedService = servicios.find(s => s.id === reserva.servicioId)
      const selectedDuration = selectedService?.duracion_minutos || 30
      
      const [finH, finM] = config.fin.split(':').map(Number)
      const finMins = finH * 60 + finM

      const tienePausa = config.pausa
      let inicioPausaMins = 0, finPausaMins = 0
      if (tienePausa && config.inicioPausa && config.finPausa) {
          const [ipH, ipM] = config.inicioPausa.split(':').map(Number)
          inicioPausaMins = ipH * 60 + ipM
          const [fpH, fpM] = config.finPausa.split(':').map(Number)
          finPausaMins = fpH * 60 + fpM
      }

      const avail = slots.filter(s => {
        const [h, m] = s.split(':').map(Number)
        const startMins = h * 60 + m
        const endMins = startMins + selectedDuration
        
        // No puede exceder el horario de cierre
        if (endMins > finMins) return false
        
        // No puede chocar con la pausa (corte) del día
        if (tienePausa) {
            if (Math.max(startMins, inicioPausaMins) < Math.min(endMins, finPausaMins)) {
                return false
            }
        }
        
        // Comprobar solapamiento (overlap = max(start1, start2) < min(end1, end2))
        const hasOverlap = bookedIntervals.some(b => {
           return Math.max(startMins, b.startMins) < Math.min(endMins, b.endMins)
        })

        return !hasOverlap
      })

      setHorasDisponibles({
        mañana: avail.filter(h => h < "12:00"),
        tarde: avail.filter(h => h >= "12:00" && h < "18:00"),
        noche: avail.filter(h => h >= "18:00")
      })
    } catch (e) {
      console.error("Error en slots")
    } finally {
      setBuscandoHoras(false)
    }
  }

  async function submitBooking(e) {
    e.preventDefault()
    setGuardando(true)
    try {
      // Empaquetado de hora local a UTC exacto
      const [year, month, day] = reserva.fecha.split('-').map(Number)
      const [hour, minute] = reserva.hora.split(':').map(Number)
      const dateExacta = new Date(year, month - 1, day, hour, minute, 0)
      const fechaHoraISO = dateExacta.toISOString()

      // Prevención de Double-Booking
      const { data: colision } = await supabase
        .from('turnos')
        .select('id')
        .eq('empleado_id', reserva.empleadoId)
        .eq('fecha_hora', fechaHoraISO)
        .eq('estado', 'confirmado')

      if (colision && colision.length > 0) {
        alert("Este horario acaba de ser reservado. Por favor, selecciona otro.")
        setPaso(3)
        const diaActual = diasCalendario.find(d => d.full === reserva.fecha)
        if (diaActual) handleDateSelect(diaActual)
        setGuardando(false)
        return
      }

      // Payload base — NO incluir campos que podrían no existir en la DB de clientes existentes
      const payload = {
        negocio_id: negocio.id,
        servicio_id: reserva.servicioId,
        empleado_id: reserva.empleadoId,
        cliente_nombre: reserva.clienteNombre,
        cliente_telefono: reserva.clienteTelefono,
        cliente_email: reserva.clienteEmail,
        fecha_hora: fechaHoraISO,
        estado: 'confirmado'
      }

      // Solo agregar notas si el campo extra tiene valor (evita errores si la columna no existe)
      if (reserva.campoExtra) {
        payload.notas = `${vocab.campoExtraLabel || 'Extra'}: ${reserva.campoExtra}`
      }

      const { error } = await supabase.from('turnos').insert([payload])
      
      if (error) throw error
      setPaso(5)

    } catch (err) {
      alert("Ocurrió un error al procesar la solicitud. Reintente.")
    } finally {
      setGuardando(false)
    }
  }

  /**
   * Utilidad para inyectar opacidad a colores Hexadecimales (Deep Theming)
   */
  const hexToRgba = (hex, alpha) => {
    if (!hex || !/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(hex)) return `rgba(0,0,0,${alpha})`
    let r, g, b
    if (hex.length === 4) {
      r = parseInt(hex[1] + hex[1], 16); g = parseInt(hex[2] + hex[2], 16); b = parseInt(hex[3] + hex[3], 16)
    } else {
      r = parseInt(hex.substring(1, 3), 16); g = parseInt(hex.substring(3, 5), 16); b = parseInt(hex.substring(5, 7), 16)
    }
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
  }

  // Helper: nombre del servicio seleccionado
  const servicioSeleccionado = servicios.find(s => s.id === reserva.servicioId)
  const empleadoSeleccionado = empleados.find(e => e.id === reserva.empleadoId)

  if (loading) return (
    <div className="min-h-screen bg-[#FDFDFC] flex items-center justify-center">
      <div className="w-5 h-5 border-[3px] border-zinc-200 border-t-zinc-900 rounded-full animate-spin"></div>
    </div>
  )

  // Negocio suspendido — vista pública bloqueada
  if (negocio && negocio.estado_suscripcion === 'suspendido') {
    return (
      <div className="min-h-screen bg-[#FDFDFC] flex items-center justify-center p-6 font-sans">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-zinc-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-zinc-300" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <h2 className="text-xl font-bold tracking-tighter text-zinc-900 mb-2">Servicio no disponible</h2>
          <p className="text-sm text-zinc-500 font-medium">Este negocio no está aceptando reservas en este momento. Intente más tarde.</p>
        </div>
      </div>
    )
  }

  // Variables Dinámicas del Motor de Tematización
  const accent = negocio.color_primario || '#000000'
  const accentUltraSoft = hexToRgba(accent, 0.04) 
  const accentSoft = hexToRgba(accent, 0.12) 
  const accentGlow = hexToRgba(accent, 0.3)
  const accentDark = hexToRgba(accent, 0.85)

  // Vocabulario dinámico según rubro
  const vocab = getVocabulario(negocio.rubro)
  const isRestaurante = esGastronomia(negocio.rubro)

  return (
    <div className="min-h-screen text-[#1D1D1F] font-sans antialiased selection:bg-zinc-900 selection:text-white relative overflow-x-hidden bg-[#FDFDFC]" style={{ paddingBottom: 'calc(80px + env(safe-area-inset-bottom, 0px))' }}>
      
      {/* BAÑO DE COLOR (Sutil resplandor de fondo) */}
      <div className="absolute top-0 inset-x-0 h-[60vh] pointer-events-none z-0" style={{ background: `linear-gradient(to bottom, ${accentUltraSoft}, transparent)` }}></div>

      {/* 1. HERO & BRANDING SECTION — Más compacto en mobile */}
      <header className="relative h-[28vh] md:h-[30vh] w-full overflow-hidden bg-zinc-100 z-10">
         {negocio.portada_url ? (
           <img src={negocio.portada_url} className="w-full h-full object-cover animate-in fade-in duration-1000" alt="Cover" />
         ) : (
           <div className="w-full h-full" style={{ background: `linear-gradient(135deg, ${hexToRgba(accent, 0.15)} 0%, ${hexToRgba(accent, 0.05)} 100%)` }}></div>
         )}
         <div className="absolute top-0 inset-x-0 h-24 bg-gradient-to-b from-black/20 to-transparent"></div>
         <div className="absolute bottom-0 inset-x-0 h-20 bg-gradient-to-t from-[#FDFDFC] to-transparent"></div>
      </header>

      <main className="max-w-md mx-auto relative z-20 -mt-14 md:-mt-16 px-4">
         
         {/* TARJETA DE IDENTIDAD — Optimizada para mobile */}
         <section className="animate-in fade-in slide-in-from-bottom-8 duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]">
            <div className="bg-white/70 backdrop-blur-3xl rounded-[1.8rem] md:rounded-[2rem] shadow-[0_8px_30px_rgba(0,0,0,0.03)] border border-white/80 p-4 md:p-5 flex flex-col items-center text-center">
               
               <div 
                 className="w-[4.5rem] h-[4.5rem] md:w-20 md:h-20 rounded-[1rem] md:rounded-[1.2rem] bg-white p-1 -mt-12 md:-mt-14 mb-2 md:mb-3 border border-white/50 relative z-10 transition-transform duration-500 hover:scale-105"
                 style={{ boxShadow: `0 12px 30px ${accentGlow}` }}
               >
                  {negocio.logo_url ? (
                    <img src={negocio.logo_url} className="w-full h-full object-cover rounded-[0.75rem] md:rounded-[0.9rem]" alt="Logo" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl md:text-3xl font-bold rounded-[0.75rem] md:rounded-[0.9rem]" style={{ backgroundColor: accentSoft, color: accent }}>
                       {negocio.nombre.charAt(0)}
                    </div>
                  )}
               </div>
               
               <span className="text-[8px] md:text-[9px] font-black uppercase tracking-[0.25em] mb-0.5 md:mb-1" style={{ color: accent }}>{negocio.rubro}</span>
               <h1 className="text-xl md:text-2xl font-extrabold tracking-tighter leading-tight text-zinc-900 mb-1">{negocio.nombre}</h1>
               
               {negocio.instagram && (
                 <a 
                   href={`https://instagram.com/${negocio.instagram.replace('@', '')}`} 
                   target="_blank" 
                   rel="noopener noreferrer" 
                   className="mb-2 md:mb-4 flex items-center gap-1.5 px-3 py-1 md:py-1.5 rounded-full transition-all active:scale-95 brand-pill-hover"
                   style={{ backgroundColor: accentUltraSoft, color: accentDark }}
                 >
                    <svg className="w-3 h-3 md:w-3.5 md:h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
                    <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest">{negocio.instagram.replace('@', '')}</span>
                 </a>
               )}
               
               {negocio.descripcion && (
                 <>
                   <div className={`relative overflow-hidden transition-[max-height] duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] w-full px-1 md:px-2 ${bioExpandida ? 'max-h-[500px]' : 'max-h-[40px]'}`}>
                      <p className="text-[12px] md:text-[13px] font-medium text-zinc-500 leading-relaxed text-balance">
                         {negocio.descripcion}
                      </p>
                      {!bioExpandida && (
                        <div className="absolute bottom-0 inset-x-0 h-5 bg-gradient-to-t from-white/95 to-transparent pointer-events-none"></div>
                      )}
                   </div>
                   <button 
                     onClick={() => setBioExpandida(!bioExpandida)} 
                     className="mt-2 md:mt-3 text-[8px] md:text-[9px] font-black px-3 md:px-4 py-1 md:py-1.5 rounded-full uppercase tracking-widest transition-colors active:scale-95"
                     style={{ color: accent, backgroundColor: accentUltraSoft }}
                   >
                      {bioExpandida ? 'Ocultar info' : 'Leer más'}
                   </button>
                 </>
               )}
            </div>
         </section>

         {/* RESUMEN DE SELECCIÓN (Paso 2+) — Mini pills */}
         {paso >= 2 && (
           <div className="mt-3 flex flex-wrap gap-1.5 px-1 animate-in fade-in duration-300">
             {servicioSeleccionado && (
               <button onClick={() => setPaso(1)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-white border border-zinc-100 shadow-sm active:scale-95 transition-all text-zinc-600">
                 <div className="w-4 h-4 rounded-full flex items-center justify-center" style={{ backgroundColor: accentSoft }}>
                   <svg className="w-2.5 h-2.5" style={{ color: accent }} fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round"/></svg>
                 </div>
                 {servicioSeleccionado.nombre}
               </button>
             )}
             {empleadoSeleccionado && paso >= 3 && (
               <button onClick={() => setPaso(2)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-white border border-zinc-100 shadow-sm active:scale-95 transition-all text-zinc-600">
                 <div className="w-4 h-4 rounded-full flex items-center justify-center" style={{ backgroundColor: accentSoft }}>
                   <svg className="w-2.5 h-2.5" style={{ color: accent }} fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round"/></svg>
                 </div>
                 {empleadoSeleccionado.nombre.split(' ')[0]}
               </button>
             )}
             {reserva.fecha && paso >= 4 && (
               <button onClick={() => setPaso(3)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-white border border-zinc-100 shadow-sm active:scale-95 transition-all text-zinc-600">
                 <div className="w-4 h-4 rounded-full flex items-center justify-center" style={{ backgroundColor: accentSoft }}>
                   <svg className="w-2.5 h-2.5" style={{ color: accent }} fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round"/></svg>
                 </div>
                 {reserva.fecha.split('-').reverse().slice(0,2).join('/')} {reserva.hora}
               </button>
             )}
           </div>
         )}

         {/* PROGRESS BAR — Más compacto */}
         {paso < 5 && (
           <nav className="mt-4 mb-3 md:mt-6 md:mb-4 sticky top-2 md:top-4 z-40 bg-white/80 backdrop-blur-2xl py-2 rounded-[1rem] md:rounded-[1.2rem] px-3 shadow-[0_4px_20px_rgba(0,0,0,0.02)] border border-white">
              <div className="flex items-center justify-between mb-1.5 md:mb-2 px-1">
                 <span className="text-[8px] md:text-[9px] font-black uppercase tracking-[0.2em]" style={{ color: accentGlow }}>Progreso de Reserva</span>
                 <span className="text-[9px] md:text-[10px] font-bold text-zinc-900">{paso} / 4</span>
              </div>
              <div className="flex gap-1 md:gap-1.5">
                 {[1,2,3,4].map(p => (
                   <div key={p} className="h-1 md:h-1.5 flex-1 rounded-full overflow-hidden bg-zinc-100 relative">
                      <div className="absolute inset-y-0 left-0 transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]" style={{ 
                        width: paso >= p ? '100%' : '0%', 
                        backgroundColor: paso >= p ? accent : 'transparent' 
                      }}></div>
                   </div>
                 ))}
              </div>
           </nav>
         )}

         {/* CONTENEDOR DE PASOS */}
         <div className="mt-3 md:mt-4 relative">
            
            {/* --- PASO 1: SERVICIOS --- */}
            {paso === 1 && (
              <section className="animate-in slide-in-from-bottom-6 fade-in zoom-in-[0.98] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] space-y-2.5 md:space-y-3">
                <h2 className="text-base md:text-lg font-bold tracking-tight px-1 text-zinc-900">{vocab.paso1Titulo}</h2>
                <div className="bg-white rounded-[1.3rem] md:rounded-[1.5rem] shadow-sm border border-zinc-100/80 overflow-hidden">
                   {servicios.map((s, idx) => (
                     <button 
                        key={s.id} 
                        onClick={() => { setReserva({...reserva, servicioId: s.id}); setPaso(2) }} 
                        className={`w-full text-left p-3.5 md:p-4 flex justify-between items-center transition-all active:scale-[0.99] group brand-item-hover ${idx !== servicios.length - 1 ? 'border-b border-zinc-50' : ''}`}
                     >
                        <div className="flex items-center gap-3">
                           <div className="w-9 h-9 md:w-10 md:h-10 rounded-[0.8rem] md:rounded-[0.9rem] flex items-center justify-center transition-all duration-300 group-hover:scale-105 shrink-0" style={{ backgroundColor: accentSoft, color: accent }}>
                               {vocab.usarIconoCustom ? (
                                 <svg className="w-4 h-4 md:w-5 md:h-5" viewBox="0 0 24 24" fill="currentColor"><path d={vocab.iconoServicio}/></svg>
                               ) : (
                                 <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d={vocab.iconoServicio} strokeLinecap="round" strokeLinejoin="round"/></svg>
                               )}
                           </div>
                           <div className="min-w-0">
                              <p className="font-bold text-zinc-900 text-[14px] md:text-[15px] tracking-tight leading-none transition-colors truncate">{s.nombre}</p>
                              <p className="text-[9px] md:text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em] mt-1">{s.duracion_minutos} min</p>
                           </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                           <span className="font-bold text-base md:text-lg tracking-tighter text-zinc-900">${s.precio}</span>
                           <svg className="w-3 h-3 md:w-3.5 md:h-3.5 text-zinc-300 group-hover:translate-x-1 transition-transform" style={{ color: accentGlow }} fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg>
                        </div>
                     </button>
                   ))}
                </div>
              </section>
            )}

            {/* --- PASO 2: STAFF --- */}
            {paso === 2 && (
              <section className="animate-in slide-in-from-bottom-6 fade-in zoom-in-[0.98] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] space-y-3 md:space-y-4">
                <div className="flex items-center justify-between px-1">
                   <h2 className="text-base md:text-lg font-bold tracking-tight text-zinc-900">{vocab.paso2Titulo}</h2>
                   <button onClick={() => setPaso(1)} className="text-[8px] md:text-[9px] font-black uppercase tracking-widest bg-white px-3 py-1.5 rounded-full shadow-sm active:scale-90 transition-all flex items-center gap-1" style={{ color: accent }}>
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7"/></svg> {vocab.paso2Volver}
                   </button>
                </div>
                <div className="grid grid-cols-2 gap-2.5 md:gap-3">
                   {empleados.map(e => (
                     <button 
                        key={e.id} 
                        onClick={() => { setReserva({...reserva, empleadoId: e.id}); setPaso(3) }} 
                        className="bg-white p-4 md:p-5 rounded-[1.3rem] md:rounded-2xl flex flex-col items-center gap-3 shadow-sm border border-zinc-100/50 active:scale-[0.96] transition-all group brand-border-hover"
                     >
                        <div className="w-14 h-14 md:w-16 md:h-16 rounded-full overflow-hidden shadow-sm border-[3px] border-white group-hover:scale-105 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]" style={{ backgroundColor: accentSoft }}>
                           {e.foto_url ? <img src={e.foto_url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-xl md:text-2xl font-bold" style={{ color: accent }}>{e.nombre.charAt(0)}</div>}
                        </div>
                        <div className="text-center w-full">
                          <span className="font-bold text-xs tracking-tight text-zinc-900 truncate block">{e.nombre}</span>
                          {e.especialidad && <span className="text-[9px] text-zinc-400 font-medium truncate block mt-0.5">{e.especialidad}</span>}
                        </div>
                     </button>
                   ))}
                </div>
              </section>
            )}

            {/* --- PASO 3: CALENDARIO --- */}
            {paso === 3 && (
              <section className="animate-in slide-in-from-bottom-6 fade-in zoom-in-[0.98] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] space-y-3 md:space-y-4">
                <div className="flex items-center justify-between px-1">
                   <h2 className="text-base md:text-lg font-bold tracking-tight text-zinc-900">Fecha y Horario</h2>
                   <button onClick={() => setPaso(2)} className="text-[8px] md:text-[9px] font-black uppercase tracking-widest bg-white px-3 py-1.5 rounded-full shadow-sm active:scale-90 transition-all flex items-center gap-1" style={{ color: accent }}>
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7"/></svg> {vocab.paso3Volver}
                   </button>
                </div>
                
                <div className="bg-white rounded-[1.3rem] md:rounded-[1.5rem] shadow-sm border border-zinc-100/80 p-3 md:p-4 overflow-hidden">
                   
                   {/* SCROLL HORIZONTAL DE FECHAS */}
                   <div className="flex overflow-x-auto gap-1.5 md:gap-2 pb-3 md:pb-4 no-scrollbar snap-x relative -mx-1 px-1">
                      {diasCalendario.map((d, i) => {
                        const isSelected = reserva.fecha === d.full
                        return (
                          <div key={i} className="flex flex-col items-center shrink-0">
                             {d.isNewMonth && <span className="text-[8px] md:text-[9px] font-bold text-zinc-300 uppercase tracking-widest mb-1.5 md:mb-2 self-start pl-0.5">{d.month}</span>}
                             <button 
                               disabled={!d.available}
                               onClick={() => handleDateSelect(d)}
                               className={`snap-center w-[3.3rem] h-[4.2rem] md:w-[3.8rem] md:h-[4.8rem] rounded-[1rem] md:rounded-[1.2rem] flex flex-col items-center justify-center transition-all duration-300 border active:scale-[0.95] brand-date-hover ${
                                 !d.available ? 'opacity-20 grayscale border-transparent cursor-not-allowed bg-zinc-50' : 
                                 isSelected ? 'shadow-md scale-105 border-transparent text-white' : 'bg-[#FDFDFC] border-transparent text-zinc-600'
                               }`}
                               style={{ backgroundColor: isSelected ? accent : '' }}
                             >
                                <span className={`text-[8px] md:text-[9px] font-bold uppercase mb-0.5 md:mb-1 ${isSelected ? 'text-white/90' : 'text-zinc-400'}`}>{d.weekday}</span>
                                <span className="text-lg md:text-xl font-bold tracking-tighter">{d.number}</span>
                                {d.isToday && !isSelected && <div className="w-1 h-1 rounded-full mt-0.5" style={{ backgroundColor: accent }}></div>}
                             </button>
                          </div>
                        )
                      })}
                   </div>

                   {reserva.fecha && (
                     <div className="pt-2.5 md:pt-3 animate-in fade-in duration-500 border-t border-zinc-100/80 mt-1">
                        {buscandoHoras ? (
                          <div className="flex justify-center py-8"><div className="w-5 h-5 border-2 border-zinc-200 border-t-zinc-900 rounded-full animate-spin"></div></div>
                        ) : (
                          <div className="space-y-4 md:space-y-5 mt-2 md:mt-4">
                             {['mañana', 'tarde', 'noche'].map(periodo => (
                               horasDisponibles[periodo].length > 0 && (
                                 <div key={periodo} className="space-y-1.5 md:space-y-2">
                                    <p className="text-[8px] md:text-[9px] font-black uppercase tracking-[0.25em] px-1" style={{ color: accentGlow }}>{periodo}</p>
                                    <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                                       {horasDisponibles[periodo].map(h => (
                                         <button 
                                            key={h} 
                                            onClick={() => setReserva({...reserva, hora: h})} 
                                            className={`py-2.5 rounded-xl text-[13px] font-bold transition-all active:scale-[0.95] shadow-sm brand-date-hover ${reserva.hora === h ? 'text-white border-transparent' : 'bg-[#FDFDFC] text-zinc-800 border border-transparent'}`} 
                                            style={{ backgroundColor: reserva.hora === h ? accent : '' }}
                                         >
                                            {h}
                                         </button>
                                       ))}
                                    </div>
                                 </div>
                               )
                             ))}
                             {horasDisponibles.mañana.length === 0 && horasDisponibles.tarde.length === 0 && horasDisponibles.noche.length === 0 && (
                               <div className="py-8 text-center bg-zinc-50 rounded-xl border border-dashed border-zinc-200"><p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Sin disponibilidad</p></div>
                             )}
                          </div>
                        )}
                     </div>
                   )}
                </div>
              </section>
            )}

            {/* --- PASO 4: FORMULARIO THEMED --- */}
            {paso === 4 && (
              <section className="animate-in slide-in-from-bottom-6 fade-in zoom-in-[0.98] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] space-y-3 md:space-y-4">
                <div className="flex items-center justify-between px-1">
                   <h2 className="text-base md:text-lg font-bold tracking-tight text-zinc-900">{vocab.paso4Titulo}</h2>
                   <button onClick={() => setPaso(3)} className="text-[8px] md:text-[9px] font-black uppercase tracking-widest bg-white px-3 py-1.5 rounded-full shadow-sm active:scale-90 transition-all flex items-center gap-1" style={{ color: accent }}>
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7"/></svg> {vocab.paso4Volver}
                   </button>
                </div>
                
                <form id="reservaForm" onSubmit={submitBooking} className="space-y-3 md:space-y-4">
                   <div className="bg-white rounded-[1.3rem] md:rounded-[1.5rem] shadow-sm border border-zinc-100/80 p-3.5 md:p-4 space-y-3">
                      
                      <div className="space-y-1">
                         <label className="text-[8px] md:text-[9px] font-black uppercase tracking-widest ml-1" style={{ color: accentGlow }}>Nombre Completo</label>
                         <div className="relative flex items-center brand-input-wrapper">
                            <div className="absolute left-3 w-6 h-6 rounded-full flex items-center justify-center brand-input-icon transition-colors" style={{ backgroundColor: accentUltraSoft }}><svg className="w-3.5 h-3.5" style={{ color: accent }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" strokeLinecap="round" strokeLinejoin="round"/></svg></div>
                            <input required className="w-full bg-[#FDFDFC] border border-zinc-100 text-zinc-900 rounded-xl py-3 pl-11 pr-4 font-bold outline-none transition-all text-sm placeholder:text-zinc-300 brand-input" placeholder="Ej. Pablo Pérez" value={reserva.clienteNombre} onChange={(e) => setReserva({...reserva, clienteNombre: e.target.value})} />
                         </div>
                      </div>

                      <div className="space-y-1">
                         <label className="text-[8px] md:text-[9px] font-black uppercase tracking-widest ml-1" style={{ color: accentGlow }}>WhatsApp</label>
                         <div className="relative flex items-center brand-input-wrapper">
                            <div className="absolute left-3 w-6 h-6 rounded-full flex items-center justify-center brand-input-icon transition-colors" style={{ backgroundColor: accentUltraSoft }}><svg className="w-3.5 h-3.5" style={{ color: accent }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" strokeLinecap="round" strokeLinejoin="round"/></svg></div>
                            <input required type="tel" className="w-full bg-[#FDFDFC] border border-zinc-100 text-zinc-900 rounded-xl py-3 pl-11 pr-4 font-bold outline-none transition-all text-sm placeholder:text-zinc-300 brand-input" placeholder="351 000 0000" value={reserva.clienteTelefono} onChange={(e) => setReserva({...reserva, clienteTelefono: e.target.value})} />
                         </div>
                      </div>

                      <div className="space-y-1">
                         <label className="text-[8px] md:text-[9px] font-black uppercase tracking-widest ml-1" style={{ color: accentGlow }}>Correo Electrónico</label>
                         <div className="relative flex items-center brand-input-wrapper">
                            <div className="absolute left-3 w-6 h-6 rounded-full flex items-center justify-center brand-input-icon transition-colors" style={{ backgroundColor: accentUltraSoft }}><svg className="w-3.5 h-3.5" style={{ color: accent }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round"/></svg></div>
                            <input required type="email" className="w-full bg-[#FDFDFC] border border-zinc-100 text-zinc-900 rounded-xl py-3 pl-11 pr-4 font-bold outline-none transition-all text-sm placeholder:text-zinc-300 brand-input" placeholder="correo@ejemplo.com" value={reserva.clienteEmail} onChange={(e) => setReserva({...reserva, clienteEmail: e.target.value})} />
                         </div>
                      </div>
                      
                      {isRestaurante && (
                        <div className="space-y-1">
                          <label className="text-[8px] md:text-[9px] font-black uppercase tracking-widest ml-1" style={{ color: accentGlow }}>Comensales</label>
                          <div className="relative flex items-center brand-input-wrapper">
                             <div className="absolute left-3 w-6 h-6 rounded-full flex items-center justify-center brand-input-icon transition-colors" style={{ backgroundColor: accentUltraSoft }}><svg className="w-3.5 h-3.5" style={{ color: accent }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" strokeLinecap="round" strokeLinejoin="round"/></svg></div>
                             <input type="number" min="1" max="20" required className="w-full bg-[#FDFDFC] border border-zinc-100 text-zinc-900 rounded-xl py-3 pl-11 pr-4 font-bold outline-none transition-all text-sm placeholder:text-zinc-300 brand-input" placeholder="Cantidad de personas" value={reserva.campoExtra} onChange={(e) => setReserva({...reserva, campoExtra: e.target.value})} />
                          </div>
                        </div>
                      )}
                   </div>

                   {/* TICKET VIP DEGRADADO */}
                   <div className="rounded-[1.3rem] md:rounded-[1.5rem] p-5 md:p-6 text-white shadow-xl relative overflow-hidden" style={{ background: `linear-gradient(135deg, #18181B 0%, ${accentDark} 150%)` }}>
                      <div className="relative z-10 flex justify-between items-center">
                         <div className="space-y-0.5">
                            <p className="text-[8px] md:text-[9px] font-bold opacity-60 uppercase tracking-[0.3em] mb-0.5 md:mb-1 text-white">{vocab.ticketTitulo}</p>
                            <p className="text-xl md:text-2xl font-bold tracking-tighter">{reserva.fecha.split('-').reverse().join('/')}</p>
                            <p className="text-sm md:text-base font-medium opacity-90">{reserva.hora} HS</p>
                         </div>
                         <div className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/20 shadow-inner">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round"/></svg>
                         </div>
                      </div>
                      {servicioSeleccionado && (
                        <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between">
                          <span className="text-[9px] font-bold text-white/60 uppercase tracking-widest">{servicioSeleccionado.nombre}</span>
                          <span className="text-sm font-bold text-white">${servicioSeleccionado.precio}</span>
                        </div>
                      )}
                      {reserva.campoExtra && (
                         <div className="mt-2 pt-2 border-t border-white/10 flex items-center justify-between">
                           <span className="text-[9px] font-bold text-white/60 uppercase tracking-widest">{vocab.campoExtraLabel || 'Comensales'}</span>
                           <span className="text-sm font-bold text-white">{reserva.campoExtra}</span>
                         </div>
                      )}
                   </div>
                </form>
              </section>
            )}

            {/* --- PASO 5: ÉXITO --- */}
            {paso === 5 && (
              <section className="text-center py-12 md:py-16 animate-in zoom-in-95 duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] space-y-5 md:space-y-6">
                <div 
                   className="w-20 h-20 md:w-24 md:h-24 text-white rounded-[1.3rem] md:rounded-[1.5rem] flex items-center justify-center mx-auto rotate-3"
                   style={{ backgroundColor: accent, boxShadow: `0 15px 35px ${accentGlow}` }}
                >
                   <svg className="w-8 h-8 md:w-10 md:h-10" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
                <div className="space-y-1.5 px-2">
                   <h3 className="text-2xl md:text-3xl font-extrabold tracking-tighter text-zinc-900">{vocab.exitoTitulo}</h3>
                   <p className="text-xs md:text-sm text-zinc-500 font-medium leading-relaxed max-w-[260px] mx-auto text-balance">
                     {vocab.exitoMensaje} <b className="text-zinc-900">{reserva.fecha.split('-').reverse().join('/')}</b> a las <b className="text-zinc-900">{reserva.hora} hs</b> {vocab.exitoMensaje2}
                   </p>
                </div>

                {/* Resumen final */}
                <div className="bg-white rounded-[1.3rem] border border-zinc-100 shadow-sm p-4 text-left space-y-2.5 mx-auto max-w-[300px]">
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">{vocab.servicio.charAt(0).toUpperCase() + vocab.servicio.slice(1)}</span>
                    <span className="text-xs font-bold text-zinc-900">{servicioSeleccionado?.nombre}</span>
                  </div>
                  <div className="h-px bg-zinc-50"></div>
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">{vocab.empleado.charAt(0).toUpperCase() + vocab.empleado.slice(1)}</span>
                    <span className="text-xs font-bold text-zinc-900">{empleadoSeleccionado?.nombre}</span>
                  </div>
                  <div className="h-px bg-zinc-50"></div>
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Precio</span>
                    <span className="text-xs font-bold text-zinc-900">${servicioSeleccionado?.precio}</span>
                  </div>
                </div>

                <div className="pt-2">
                   <button onClick={() => window.location.reload()} className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] px-6 py-2.5 rounded-full shadow-sm active:scale-95 transition-all" style={{ backgroundColor: accentUltraSoft, color: accent }}>{vocab.nuevaReservaBtn}</button>
                </div>
              </section>
            )}
         </div>

      </main>

      {/* STICKY CTAs — Safe area aware */}
      {paso === 3 && reserva.hora && (
        <div className="fixed bottom-0 inset-x-0 p-4 bg-gradient-to-t from-[#FDFDFC] via-[#FDFDFC]/95 to-transparent z-50 animate-in slide-in-from-bottom-full duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] pointer-events-none" style={{ paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))' }}>
           <button 
              onClick={() => setPaso(4)} 
              className="w-full max-w-sm mx-auto block py-4 rounded-xl text-white font-bold text-[11px] tracking-widest uppercase shadow-xl active:scale-[0.97] transition-all pointer-events-auto" 
              style={{ backgroundColor: accent, boxShadow: `0 10px 25px ${accentGlow}` }}
           >
              {vocab.avanzarBtn}
           </button>
        </div>
      )}
      
      {paso === 4 && (
        <div className="fixed bottom-0 inset-x-0 p-4 bg-gradient-to-t from-[#FDFDFC] via-[#FDFDFC]/95 to-transparent z-50 animate-in slide-in-from-bottom-full duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] pointer-events-none" style={{ paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))' }}>
           <button 
              form="reservaForm" 
              disabled={guardando} 
              type="submit" 
              className="w-full max-w-sm mx-auto flex items-center justify-center gap-2 py-4 rounded-xl text-white font-bold text-[11px] tracking-widest uppercase shadow-xl active:scale-[0.97] transition-all pointer-events-auto" 
              style={{ backgroundColor: accent, boxShadow: `0 10px 25px ${accentGlow}` }}
           >
              {guardando ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : vocab.confirmarBtn}
           </button>
        </div>
      )}

      {paso < 5 && (
        <footer className="mt-8 py-6 md:py-8 flex flex-col items-center gap-2 opacity-30 relative z-10">
           <div className="w-6 h-6 bg-zinc-900 rounded-[0.4rem] flex items-center justify-center shadow-lg rotate-3"><span className="text-white font-black text-[7px] italic">NS</span></div>
           <p className="text-[8px] font-black uppercase tracking-[0.4em] text-zinc-900">Engineered by Non Sistemas</p>
        </footer>
      )}

      {/* CLASES DINÁMICAS INYECTADAS */}
      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        
        /* Efectos Themed Hover */
        .brand-item-hover:hover { background-color: ${accentUltraSoft}; }
        .brand-border-hover:hover { border-color: ${accentSoft}; box-shadow: 0 4px 15px ${accentUltraSoft}; }
        .brand-date-hover:hover:not(:disabled) { background-color: ${accentUltraSoft}; }
        .brand-pill-hover:hover { filter: brightness(0.95); }

        /* Efectos Themed Focus para Inputs */
        .brand-input:focus { border-color: ${accentSoft}; box-shadow: 0 0 0 4px ${accentUltraSoft}; }
        .brand-input-wrapper:focus-within .brand-input-icon { background-color: ${accent}; color: white !important; }
        .brand-input-wrapper:focus-within .brand-input-icon svg { color: white !important; }
      `}</style>
    </div>
  )
}