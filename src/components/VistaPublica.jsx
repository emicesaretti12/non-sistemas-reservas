import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { getVocabulario, esGastronomia } from '../utils/vocabulario'
import { getEstadoSuscripcion } from '../utils/suscripcion'
import { useToast } from './Toast'

export default function VistaPublica() {
  const showToast = useToast()
  const { id } = useParams()
  
  // --- CORE DATA STATE ---
  const [loading, setLoading] = useState(true)
  const [negocio, setNegocio] = useState(null)
  const [servicios, setServicios] = useState([])
  const [empleados, setEmpleados] = useState([])
  
  // --- CATÁLOGO PÚBLICO ---
  const [vistaActiva, setVistaActiva] = useState('reservas') // 'reservas' | 'catalogo'
  const [catalogo, setCatalogo] = useState([])
  const [catFiltro, setCatFiltro] = useState('todos')
  const [catBusqueda, setCatBusqueda] = useState('')
  const [carrito, setCarrito] = useState({}) // { [prodId]: cantidad }
  const [productoDetalle, setProductoDetalle] = useState(null) // producto seleccionado para modal
  const [carritoAbierto, setCarritoAbierto] = useState(false) // drawer del carrito
  const [checkoutActivo, setCheckoutActivo] = useState(false) // paso final de checkout
  const [clienteCheckout, setClienteCheckout] = useState({ nombre: '', telefono: '', notas: '' })
  
  // --- UI & FLOW STATE ---
  const [paso, setPaso] = useState(1)
  const [bioExpandida, setBioExpandida] = useState(false)
  const [reserva, setReserva] = useState({
    servicioId: null, 
    empleadoId: null, 
    fecha: '', 
    hora: '', 
    horaNextDay: false,
    clienteNombre: '', 
    clienteTelefono: '',
    clienteEmail: '',
    campoExtra: ''
  })
  
  // --- CALENDAR & SLOTS STATE ---
  const [horasDisponibles, setHorasDisponibles] = useState({ mañana: [], tarde: [], noche: [], madrugada: [] })
  const [buscandoHoras, setBuscandoHoras] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [diasCalendario, setDiasCalendario] = useState([])
  const [calendarWindowStart, setCalendarWindowStart] = useState(0)

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

      const [resSrvs, resEmps, resCat] = await Promise.all([
        supabase.from('servicios').select('*').eq('negocio_id', id),
        supabase.from('empleados').select('*').eq('negocio_id', id),
        supabase.from('catalogo_productos').select('*').eq('negocio_id', id).eq('activo', true).order('orden').order('nombre')
      ])
      
      setServicios(resSrvs.data || [])
      setEmpleados(resEmps.data || [])
      setCatalogo(resCat.data || [])
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
    setCalendarWindowStart(0)
  }

  const handleDateSelect = async (day) => {
    if (!day.available) return
    setReserva({ ...reserva, fecha: day.full, hora: '', horaNextDay: false })
    setBuscandoHoras(true)
    
    const [year, month, d] = day.full.split('-').map(Number)
    const dateObj = new Date(year, month - 1, d)
    
    const daysName = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']
    const config = negocio.horarios?.[daysName[dateObj.getDay()]]

    if (!config || !config.abierto || !config.inicio || !config.fin) {
      setHorasDisponibles({ mañana: [], tarde: [], noche: [], madrugada: [] })
      setBuscandoHoras(false)
      return
    }

    // --- MOTOR DE SLOTS CON SOPORTE NOCTURNO (ej: 19:00 a 05:00) ---
    const [startH, startM] = config.inicio.split(':').map(Number)
    const [endH, endM] = config.fin.split(':').map(Number)
    let openMins = startH * 60 + startM
    let closeMins = endH * 60 + endM

    // Detectar horario nocturno que cruza medianoche
    const isOvernight = closeMins <= openMins
    if (isOvernight) closeMins += 1440 // extender al día siguiente

    const slots = []
    for (let m = openMins; m < closeMins; m += 30) {
      const nextDay = m >= 1440
      const actualMins = m % 1440
      const hh = String(Math.floor(actualMins / 60)).padStart(2, '0')
      const mm = String(actualMins % 60).padStart(2, '0')
      slots.push({ time: `${hh}:${mm}`, nextDay, totalMins: m })
    }

    try {
      // Para horarios nocturnos, consultar reservas del día actual Y el siguiente
      const selectedDayStart = new Date(year, month - 1, d, 0, 0, 0)
      const inicioDiaISO = selectedDayStart.toISOString()
      const finBusquedaISO = isOvernight
        ? new Date(year, month - 1, d + 1, 23, 59, 59, 999).toISOString()
        : new Date(year, month - 1, d, 23, 59, 59, 999).toISOString()

      const { data: taken } = await supabase
        .from('turnos')
        .select('fecha_hora, servicios(duracion_minutos)')
        .eq('empleado_id', reserva.empleadoId)
        .eq('estado', 'confirmado')
        .gte('fecha_hora', inicioDiaISO)
        .lte('fecha_hora', finBusquedaISO)

      // Convertir reservas existentes a "minutos desde medianoche del día seleccionado"
      const bookedIntervals = taken?.map(t => {
        let rawDate = t.fecha_hora ? t.fecha_hora.replace(' ', 'T') : ''
        if (!rawDate.endsWith('Z') && !rawDate.includes('+') && rawDate.split('-').length <= 3) {
           rawDate += 'Z'
        }
        const bdDate = new Date(rawDate)
        if (isNaN(bdDate.getTime())) return null

        // Minutos absolutos desde medianoche del día seleccionado (soporta día siguiente)
        const diffMs = bdDate.getTime() - selectedDayStart.getTime()
        const startMins = Math.round(diffMs / 60000)
        const duration = t.servicios?.duracion_minutos || 30
        return { startMins, endMins: startMins + duration }
      }).filter(Boolean) || []

      const selectedService = servicios.find(s => s.id === reserva.servicioId)
      const selectedDuration = selectedService?.duracion_minutos || 30

      const tienePausa = config.pausa
      let inicioPausaMins = 0, finPausaMins = 0
      if (tienePausa && config.inicioPausa && config.finPausa) {
          const [ipH, ipM] = config.inicioPausa.split(':').map(Number)
          inicioPausaMins = ipH * 60 + ipM
          const [fpH, fpM] = config.finPausa.split(':').map(Number)
          finPausaMins = fpH * 60 + fpM
          if (isOvernight && finPausaMins <= inicioPausaMins) finPausaMins += 1440
      }

      const avail = slots.filter(s => {
        const slotStart = s.totalMins
        const slotEnd = slotStart + selectedDuration
        
        // No puede exceder el horario de cierre (en minutos extendidos)
        if (slotEnd > closeMins) return false
        
        // No puede chocar con la pausa (corte) del día
        if (tienePausa) {
            if (Math.max(slotStart, inicioPausaMins) < Math.min(slotEnd, finPausaMins)) {
                return false
            }
        }
        
        // Comprobar solapamiento con reservas existentes
        const hasOverlap = bookedIntervals.some(b => {
           return Math.max(slotStart, b.startMins) < Math.min(slotEnd, b.endMins)
        })

        return !hasOverlap
      })

      // Categorización inteligente: horario nocturno agrupa en noche + madrugada
      if (isOvernight) {
        setHorasDisponibles({
          mañana: [],
          tarde: [],
          noche: avail.filter(s => !s.nextDay),
          madrugada: avail.filter(s => s.nextDay)
        })
      } else {
        setHorasDisponibles({
          mañana: avail.filter(s => s.time < "12:00"),
          tarde: avail.filter(s => s.time >= "12:00" && s.time < "18:00"),
          noche: avail.filter(s => s.time >= "18:00"),
          madrugada: []
        })
      }
    } catch {
      console.error("Error en slots")
    } finally {
      setBuscandoHoras(false)
    }
  }

  async function submitBooking(e) {
    e.preventDefault()
    setGuardando(true)
    try {
      // Empaquetado de hora local a UTC exacto (soporta horario nocturno cross-midnight)
      const [year, month, day] = reserva.fecha.split('-').map(Number)
      const [hour, minute] = reserva.hora.split(':').map(Number)
      const bookingDay = reserva.horaNextDay ? day + 1 : day
      const dateExacta = new Date(year, month - 1, bookingDay, hour, minute, 0)
      const fechaHoraISO = dateExacta.toISOString()

      // Prevención de Double-Booking
      const { data: colision } = await supabase
        .from('turnos')
        .select('id')
        .eq('empleado_id', reserva.empleadoId)
        .eq('fecha_hora', fechaHoraISO)
        .eq('estado', 'confirmado')

      if (colision && colision.length > 0) {
        showToast("Este horario acaba de ser reservado. Por favor, selecciona otro.", "error")
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

    } catch {
      showToast("Ocurrió un error al procesar la solicitud. Reintente.", "error")
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
    <div className="min-h-dvh bg-[#FDFDFC] flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #F8F7FF 0%, #EEEBFF 50%, #FDFCFE 100%)' }}>
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg" style={{ background: 'var(--ns-gradient-1, linear-gradient(135deg, #5B3DF5, #7C3AED))', animation: 'pulse 2s ease-in-out infinite' }}>
          <span className="text-white font-black text-xl">N</span>
        </div>
        <div className="flex gap-1.5">
          {[0, 1, 2].map(i => (
            <div key={i} className="w-2 h-2 rounded-full" style={{ background: 'var(--ns-primary)', animation: `bounce 1.2s ease-in-out ${i * 0.15}s infinite` }} />
          ))}
        </div>
      </div>
    </div>
  )

  // Negocio sin acceso (prueba vencida o suspendido) — vista pública bloqueada
  if (negocio && !getEstadoSuscripcion(negocio).acceso) {
    return (
      <div className="min-h-dvh flex items-center justify-center p-6 font-sans" style={{ background: 'linear-gradient(135deg, #F8F7FF 0%, #EEEBFF 50%, #FDFCFE 100%)' }}>
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 mx-auto mb-5 rounded-2xl flex items-center justify-center shadow-xl" style={{ background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.6)' }}>
            <svg className="w-9 h-9" style={{ color: 'var(--ns-primary, #5B3DF5)', opacity: 0.5 }} fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <h2 className="text-xl font-black tracking-tighter mb-2" style={{ color: 'var(--ns-text)' }}>Servicio no disponible</h2>
          <p className="text-sm font-medium" style={{ color: 'var(--ns-text-muted)' }}>Este negocio no está aceptando reservas en este momento. Intente más tarde.</p>
        </div>
      </div>
    )
  }

  // Variables Dinámicas del Motor de Tematización
  const accent = negocio.color_primario || '#000000'
  const accentUltraSoft = hexToRgba(accent, 0.04) 
  const accentGlow = hexToRgba(accent, 0.3)
  const accentDark = hexToRgba(accent, 0.85)

  // Vocabulario dinámico según rubro
  const vocab = getVocabulario(negocio.rubro)
  const isRestaurante = esGastronomia(negocio.rubro)

  // --- CARRITO HELPERS ---
  const addToCart = (prodId) => {
    setCarrito(prev => {
      const current = prev[prodId] || 0
      return { ...prev, [prodId]: current + 1 }
    })
  }
  const removeFromCart = (prodId) => {
    setCarrito(prev => {
      const current = prev[prodId] || 0
      if (current <= 1) { const n = { ...prev }; delete n[prodId]; return n }
      return { ...prev, [prodId]: current - 1 }
    })
  }
  const totalCarrito = Object.entries(carrito).reduce((sum, [pid, qty]) => {
    const p = catalogo.find(x => x.id === pid)
    return sum + (p ? p.precio * qty : 0)
  }, 0)
  const itemsEnCarrito = Object.values(carrito).reduce((a, b) => a + b, 0)

  const enviarPedidoWhatsApp = (e) => {
    if (e) e.preventDefault();
    if (!negocio.telefono || itemsEnCarrito === 0) return
    const num = negocio.telefono.replace(/[^0-9]/g, '')
    let msg = `🛒 *Nuevo Pedido — ${negocio.nombre}*\n\n`
    
    msg += `👤 *Cliente:* ${clienteCheckout.nombre}\n`
    if (clienteCheckout.telefono) msg += `📞 *Tel:* ${clienteCheckout.telefono}\n`
    msg += `\n📦 *Productos:*\n`
    
    Object.entries(carrito).forEach(([pid, qty]) => {
      const p = catalogo.find(x => x.id === pid)
      if (p) msg += `• ${p.nombre} x${qty} — $${(p.precio * qty).toLocaleString()}\n`
    })
    msg += `\n💰 *Total: $${totalCarrito.toLocaleString()}*`
    if (clienteCheckout.notas) msg += `\n\n📝 *Notas:* ${clienteCheckout.notas}`
    
    window.open(`https://wa.me/${num}?text=${encodeURIComponent(msg)}`, '_blank')
    setCheckoutActivo(false)
    setCarritoAbierto(false)
    setCarrito({})
  }

  return (
    <div className="booking-shell min-h-screen text-[#1E1B4B] font-sans antialiased relative overflow-x-hidden" style={{ paddingBottom: 'calc(80px + env(safe-area-inset-bottom, 0px))', colorScheme: 'light', background: 'var(--ns-bg)' }}>
      
      {/* BAÑO DE COLOR (Sutil resplandor de fondo — marca lilac) */}
      <div className="absolute top-0 inset-x-0 h-[60vh] pointer-events-none z-0" style={{ background: 'linear-gradient(to bottom, #E8DEFF, transparent)' }}></div>

      {/* 1. HERO & BRANDING SECTION — Más compacto en mobile con glass overlay */}
      <header className="relative h-[28vh] md:h-[30vh] w-full overflow-hidden z-10" style={{ background: 'linear-gradient(135deg, #1E1B4B 0%, #312E81 50%, #4338CA 100%)' }}>
         {negocio.portada_url ? (
           <>
             <img src={negocio.portada_url} className="w-full h-full object-cover animate-in fade-in duration-1000" alt="Cover" />
             <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/20"></div>
           </>
         ) : (
           <>
             <div className="w-full h-full absolute inset-0" style={{ background: 'linear-gradient(135deg, #E8DEFF 0%, #5B3DF5 100%)' }}></div>
             <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-transparent to-white/15"></div>
           </>
         )}
      </header>

      <main className={`mx-auto relative z-20 -mt-14 md:-mt-16 px-4 transition-all duration-500 ${vistaActiva === 'catalogo' ? 'max-w-md lg:max-w-5xl' : 'max-w-md'}`}>
         
         {/* TARJETA DE IDENTIDAD — Optimizada para mobile */}
         <section className="animate-in fade-in slide-in-from-bottom-8 duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]">
            <div className="ns-public-identity-card">
               
               <div 
                 className="ns-public-logo"
               >
                  {negocio.logo_url ? (
                    <img src={negocio.logo_url} className="w-full h-full object-cover" alt="Logo" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl md:text-3xl font-bold text-white" style={{ background: 'var(--ns-gradient-1)' }}>
                       {negocio.nombre.charAt(0)}
                    </div>
                  )}
               </div>
               
               <span className="text-[8px] md:text-[9px] font-black uppercase tracking-[0.25em] mb-0.5 md:mb-1" style={{ color: 'var(--ns-primary)' }}>{negocio.rubro}</span>
               <h1 className="text-xl md:text-2xl font-black tracking-tighter leading-tight mb-1" style={{ color: 'var(--ns-text)' }}>{negocio.nombre}</h1>
               
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
                      <p className="text-[12px] md:text-[13px] font-medium leading-relaxed text-balance" style={{ color: 'var(--ns-text-muted)' }}>
                         {negocio.descripcion}
                      </p>
                      {!bioExpandida && (
                        <div className="absolute bottom-0 inset-x-0 h-5 bg-gradient-to-t from-white/95 to-transparent pointer-events-none"></div>
                      )}
                   </div>
                   <button 
                     onClick={() => setBioExpandida(!bioExpandida)} 
                     className="mt-2 md:mt-3 text-[8px] md:text-[9px] font-black px-3 md:px-4 py-1 md:py-1.5 rounded-full uppercase tracking-widest transition-colors active:scale-95"
                     style={{ color: 'var(--ns-primary)', backgroundColor: 'var(--ns-primary-bg)' }}
                   >
                      {bioExpandida ? 'Ocultar info' : 'Leer más'}
                   </button>
                 </>
               )}
            </div>

            {/* TOGGLE RESERVAS / CATÁLOGO */}
            {catalogo.length > 0 && paso < 5 && (
              <div className="mt-3 flex rounded-2xl p-1 gap-0.5" style={{ background: 'var(--ns-primary-bg)', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.04), 0 1px 0 rgba(255,255,255,0.6)' }}>
                <button onClick={() => setVistaActiva('reservas')} className={`flex-1 py-2.5 rounded-xl text-[9px] font-extrabold uppercase tracking-widest transition-all ${vistaActiva === 'reservas' ? 'text-white' : 'text-zinc-400'}`} style={vistaActiva === 'reservas' ? { background: 'var(--ns-primary)', boxShadow: '0 3px 0 rgba(0,0,0,0.08), 0 6px 12px rgba(91,61,245,0.2), inset 0 1px 0 rgba(255,255,255,0.3)', textShadow: '0 1px 1px rgba(0,0,0,0.1)' } : {}}>
                  {vocab.paso1Titulo || 'Reservas'}
                </button>
                <button onClick={() => setVistaActiva('catalogo')} className={`flex-1 py-2.5 rounded-xl text-[9px] font-extrabold uppercase tracking-widest transition-all ${vistaActiva === 'catalogo' ? 'text-white' : 'text-zinc-400'}`} style={vistaActiva === 'catalogo' ? { background: 'var(--ns-primary)', boxShadow: '0 3px 0 rgba(0,0,0,0.08), 0 6px 12px rgba(91,61,245,0.2), inset 0 1px 0 rgba(255,255,255,0.3)', textShadow: '0 1px 1px rgba(0,0,0,0.1)' } : {}}>
                  Catálogo
                </button>
              </div>
            )}
         </section>

         {/* ========== VISTA: RESERVAS ========== */}
         {vistaActiva === 'reservas' && (
          <>
         {/* RESUMEN DE SELECCIÓN (Paso 2+) — Mini pills */}
         {paso >= 2 && (
           <div className="mt-3 flex flex-wrap gap-1.5 px-1 animate-in fade-in duration-300">
             {servicioSeleccionado && (
               <button onClick={() => setPaso(1)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider border active:scale-95 transition-all" style={{ background: 'var(--ns-surface)', borderColor: 'var(--ns-border)', color: 'var(--ns-text)', boxShadow: '0 2px 0 rgba(0,0,0,0.03), 0 4px 8px rgba(91,61,245,0.04), inset 0 1px 0 rgba(255,255,255,0.8)' }}>
                 <div className="w-4 h-4 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--ns-primary-bg)' }}>
                   <svg className="w-2.5 h-2.5" style={{ color: 'var(--ns-primary)' }} fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round"/></svg>
                 </div>
                 {servicioSeleccionado.nombre}
               </button>
             )}
             {empleadoSeleccionado && paso >= 3 && (
               <button onClick={() => setPaso(2)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider border active:scale-95 transition-all" style={{ background: 'var(--ns-surface)', borderColor: 'var(--ns-border)', color: 'var(--ns-text)', boxShadow: '0 2px 0 rgba(0,0,0,0.03), 0 4px 8px rgba(91,61,245,0.04), inset 0 1px 0 rgba(255,255,255,0.8)' }}>
                 <div className="w-4 h-4 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--ns-primary-bg)' }}>
                   <svg className="w-2.5 h-2.5" style={{ color: 'var(--ns-primary)' }} fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round"/></svg>
                 </div>
                 {empleadoSeleccionado.nombre.split(' ')[0]}
               </button>
             )}
             {reserva.fecha && paso >= 4 && (
               <button onClick={() => setPaso(3)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider border active:scale-95 transition-all" style={{ background: 'var(--ns-surface)', borderColor: 'var(--ns-border)', color: 'var(--ns-text)', boxShadow: '0 2px 0 rgba(0,0,0,0.03), 0 4px 8px rgba(91,61,245,0.04), inset 0 1px 0 rgba(255,255,255,0.8)' }}>
                 <div className="w-4 h-4 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--ns-primary-bg)' }}>
                   <svg className="w-2.5 h-2.5" style={{ color: 'var(--ns-primary)' }} fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round"/></svg>
                 </div>
                 {reserva.fecha.split('-').reverse().slice(0,2).join('/')} {reserva.hora}
               </button>
             )}
           </div>
         )}

         {/* PROGRESS BAR — Más compacto */}
         {paso < 5 && (
           <nav className="ns-progress-nav">
              <div className="flex items-center justify-between mb-1.5 md:mb-2 px-1">
                 <span className="text-[8px] md:text-[9px] font-black uppercase tracking-[0.2em]" style={{ color: 'var(--ns-primary)' }}>Progreso de Reserva</span>
                 <span className="text-[9px] md:text-[10px] font-bold" style={{ color: 'var(--ns-text)' }}>{paso} / 4</span>
              </div>
              <div className="flex gap-1 md:gap-1.5">
                 {[1,2,3,4].map(p => (
                   <div key={p} className="h-1 md:h-1.5 flex-1 rounded-full overflow-hidden relative" style={{ background: 'var(--ns-border)' }}>
                      <div className="absolute inset-y-0 left-0 transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]" style={{ 
                        width: paso >= p ? '100%' : '0%', 
                        backgroundColor: 'var(--ns-primary)' 
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
                <h2 className="text-base md:text-lg font-black tracking-tight px-1" style={{ color: 'var(--ns-text)' }}>{vocab.paso1Titulo}</h2>
                <div className="nh-card overflow-hidden">
                   {servicios.map((s, idx) => (
                     <button 
                        key={s.id} 
                        onClick={() => { setReserva({...reserva, servicioId: s.id}); setPaso(2) }} 
                        className={`ns-public-service-item ${idx !== servicios.length - 1 ? 'border-b' : ''}`}
                     >
                        <div className="flex items-center gap-3">
                           <div className="ns-public-service-ic">
                               {vocab.usarIconoCustom ? (
                                 <svg className="w-4 h-4 md:w-5 md:h-5" viewBox="0 0 24 24" fill="currentColor"><path d={vocab.iconoServicio}/></svg>
                               ) : (
                                 <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d={vocab.iconoServicio} strokeLinecap="round" strokeLinejoin="round"/></svg>
                               )}
                           </div>
                           <div className="min-w-0">
                              <p className="font-bold text-[14px] md:text-[15px] tracking-tight leading-none truncate" style={{ color: 'var(--ns-text)' }}>{s.nombre}</p>
                              <p className="text-[9px] md:text-[10px] font-bold uppercase tracking-[0.2em] mt-1" style={{ color: 'var(--ns-text-muted)' }}>{s.duracion_minutos} min</p>
                           </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                           <span className="font-black text-base md:text-lg tracking-tighter" style={{ color: 'var(--ns-text)' }}>${s.precio}</span>
                           <svg className="w-3 h-3 md:w-3.5 md:h-3.5 group-hover:translate-x-1 transition-transform" style={{ color: 'var(--ns-primary)' }} fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg>
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
                   <h2 className="text-base md:text-lg font-black tracking-tight" style={{ color: 'var(--ns-text)' }}>{vocab.paso2Titulo}</h2>
                   <button onClick={() => setPaso(1)} className="text-[8px] md:text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full active:scale-90 transition-all flex items-center gap-1" style={{ color: 'var(--ns-primary)', background: 'var(--ns-primary-bg)' }}>
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7"/></svg> {vocab.paso2Volver}
                   </button>
                </div>
                <div className="grid grid-cols-2 gap-2.5 md:gap-3">
                   {empleados.map(e => (
                     <button 
                        key={e.id} 
                        onClick={() => { setReserva({...reserva, empleadoId: e.id}); setPaso(3) }} 
                        className="ns-public-employee-card"
                     >
                        <div className="w-14 h-14 md:w-16 md:h-16 rounded-full overflow-hidden border-[3px] border-white group-hover:scale-105 transition-transform duration-500" style={{ background: 'var(--ns-primary-bg)' }}>
                           {e.foto_url ? <img src={e.foto_url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-xl md:text-2xl font-bold" style={{ color: 'var(--ns-primary)' }}>{e.nombre.charAt(0)}</div>}
                        </div>
                        <div className="text-center w-full">
                          <span className="font-bold text-xs tracking-tight truncate block" style={{ color: 'var(--ns-text)' }}>{e.nombre}</span>
                          {e.especialidad && <span className="text-[9px] font-medium truncate block mt-0.5" style={{ color: 'var(--ns-text-muted)' }}>{e.especialidad}</span>}
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
                   <h2 className="text-base md:text-lg font-black tracking-tight" style={{ color: 'var(--ns-text)' }}>Fecha y Horario</h2>
                   <button onClick={() => setPaso(2)} className="text-[8px] md:text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full active:scale-90 transition-all flex items-center gap-1" style={{ color: 'var(--ns-primary)', background: 'var(--ns-primary-bg)' }}>
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7"/></svg> {vocab.paso3Volver}
                   </button>
                </div>
                
                <div className="nh-card p-3 md:p-4">
                   
                   {/* NAVEGACIÓN DE FECHAS: ventana corta, sin ocultar disponibilidad futura */}
                   <div className="flex items-center justify-between gap-2 mb-3 px-0.5">
                      <button
                        type="button"
                        aria-label="Ver fechas anteriores"
                        disabled={calendarWindowStart === 0}
                        onClick={() => setCalendarWindowStart((start) => Math.max(0, start - 7))}
                        className="w-9 h-9 rounded-xl border flex items-center justify-center disabled:opacity-35 disabled:cursor-not-allowed"
                        style={{ color: accent, borderColor: 'var(--ns-border)', background: 'var(--ns-surface)' }}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="m15 18-6-6 6-6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </button>
                      <p className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.18em] text-center" style={{ color: 'var(--ns-text-muted)' }}>
                        {diasCalendario[calendarWindowStart]?.month || 'Próximas fechas'}
                      </p>
                      <button
                        type="button"
                        aria-label="Ver fechas siguientes"
                        disabled={calendarWindowStart + 7 >= diasCalendario.length}
                        onClick={() => setCalendarWindowStart((start) => Math.min(Math.max(0, diasCalendario.length - 1), start + 7))}
                        className="w-9 h-9 rounded-xl border flex items-center justify-center disabled:opacity-35 disabled:cursor-not-allowed"
                        style={{ color: accent, borderColor: 'var(--ns-border)', background: 'var(--ns-surface)' }}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="m9 18 6-6-6-6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </button>
                   </div>
                   <div className="grid grid-cols-4 sm:grid-cols-7 gap-2" role="group" aria-label="Fechas disponibles">
                      {diasCalendario.slice(calendarWindowStart, calendarWindowStart + 7).map((d) => {
                        const isSelected = reserva.fecha === d.full
                        return (
                          <button
                            key={d.full}
                            type="button"
                            disabled={!d.available}
                            onClick={() => handleDateSelect(d)}
                            aria-pressed={isSelected}
                             className={`relative w-full h-[4.35rem] md:h-[4.8rem] rounded-[1rem] md:rounded-[1.2rem] flex flex-col items-center justify-center transition-all duration-300 border active:scale-[0.95] brand-date-hover ${
                              !d.available ? 'opacity-25 grayscale border-transparent cursor-not-allowed bg-zinc-50' :
                              isSelected ? 'shadow-lg scale-[1.04] border-transparent text-white' : 'bg-[#FDFDFC] border-transparent text-zinc-600 shadow-sm'
                            }`}
                            style={{ backgroundColor: isSelected ? accent : '' }}
                          >
                            {d.isNewMonth && <span className={`absolute top-1.5 right-2 text-[7px] font-black tracking-wider ${isSelected ? 'text-white/70' : 'text-zinc-300'}`}>{d.month.slice(0, 3)}</span>}
                            <span className={`text-[8px] md:text-[9px] font-bold uppercase mb-0.5 md:mb-1 ${isSelected ? 'text-white/90' : 'text-zinc-400'}`}>{d.weekday}</span>
                            <span className="text-lg md:text-xl font-bold tracking-tighter">{d.number}</span>
                            {d.isToday && !isSelected && <div className="w-1 h-1 rounded-full mt-0.5" style={{ backgroundColor: accent }}></div>}
                          </button>
                        )
                      })}
                   </div>

                   {reserva.fecha && (
                     <div className="pt-2.5 md:pt-3 animate-in fade-in duration-500 border-t border-zinc-100/80 mt-1">
                        {buscandoHoras ? (
                          <div className="flex justify-center py-8"><div className="w-5 h-5 border-2 border-zinc-200 border-t-zinc-900 rounded-full animate-spin"></div></div>
                        ) : (
                          <div className="space-y-4 md:space-y-5 mt-2 md:mt-4">
                             {['mañana', 'tarde', 'noche', 'madrugada'].map(periodo => (
                               horasDisponibles[periodo].length > 0 && (
                                 <div key={periodo} className="space-y-1.5 md:space-y-2">
                                    <p className="text-[8px] md:text-[9px] font-black uppercase tracking-[0.25em] px-1" style={{ color: accentGlow }}>{periodo}</p>
                                    <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                                       {horasDisponibles[periodo].map(h => {
                                         const slotTime = typeof h === 'string' ? h : h.time;
                                         const slotNextDay = typeof h === 'string' ? false : h.nextDay;
                                         const isSelected = reserva.hora === slotTime && reserva.horaNextDay === slotNextDay;
                                         return (
                                         <button 
                                            key={slotTime + (slotNextDay ? '-nd' : '')} 
                                            onClick={() => setReserva({...reserva, hora: slotTime, horaNextDay: slotNextDay})} 
                                            className={`py-2.5 rounded-xl text-[13px] font-bold transition-all active:scale-[0.95] shadow-sm brand-date-hover ${isSelected ? 'text-white border-transparent shadow-md' : 'bg-[#FDFDFC] text-zinc-800 border border-transparent hover:shadow-md'}`} 
                                            style={{ backgroundColor: isSelected ? accent : '', boxShadow: isSelected ? `0 4px 0 rgba(0,0,0,0.1), 0 8px 16px ${accentGlow}, inset 0 2px 0 rgba(255,255,255,0.25)` : undefined }}
                                         >
                                            {slotTime}
                                         </button>
                                         );
                                       })}
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
                   <h2 className="text-base md:text-lg font-black tracking-tight" style={{ color: 'var(--ns-text)' }}>{vocab.paso4Titulo}</h2>
                   <button onClick={() => setPaso(3)} className="text-[8px] md:text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full active:scale-90 transition-all flex items-center gap-1" style={{ color: 'var(--ns-primary)', background: 'var(--ns-primary-bg)' }}>
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7"/></svg> {vocab.paso4Volver}
                   </button>
                </div>
                
                <form id="reservaForm" onSubmit={submitBooking} className="space-y-3 md:space-y-4">
                   <div className="ns-public-form-card">
                      
                      <div className="space-y-1">
                         <label className="text-[8px] md:text-[9px] font-black uppercase tracking-widest ml-1" style={{ color: 'var(--ns-primary)' }}>Nombre Completo</label>
                         <div className="ns-input-wrapper">
                            <div className="ns-input-icon"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" strokeLinecap="round" strokeLinejoin="round"/></svg></div>
                            <input required className="ns-input" placeholder="Ej. Pablo Pérez" value={reserva.clienteNombre} onChange={(e) => setReserva({...reserva, clienteNombre: e.target.value})} />
                         </div>
                      </div>

                      <div className="space-y-1">
                         <label className="text-[8px] md:text-[9px] font-black uppercase tracking-widest ml-1" style={{ color: 'var(--ns-primary)' }}>WhatsApp</label>
                         <div className="ns-input-wrapper">
                            <div className="ns-input-icon"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" strokeLinecap="round" strokeLinejoin="round"/></svg></div>
                            <input required type="tel" className="ns-input" placeholder="351 000 0000" value={reserva.clienteTelefono} onChange={(e) => setReserva({...reserva, clienteTelefono: e.target.value})} />
                         </div>
                      </div>

                      <div className="space-y-1">
                         <label className="text-[8px] md:text-[9px] font-black uppercase tracking-widest ml-1" style={{ color: 'var(--ns-primary)' }}>Correo Electrónico</label>
                         <div className="ns-input-wrapper">
                            <div className="ns-input-icon"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round"/></svg></div>
                            <input required type="email" className="ns-input" placeholder="correo@ejemplo.com" value={reserva.clienteEmail} onChange={(e) => setReserva({...reserva, clienteEmail: e.target.value})} />
                         </div>
                      </div>
                      
                      {isRestaurante && (
                        <div className="space-y-1">
                          <label className="text-[8px] md:text-[9px] font-black uppercase tracking-widest ml-1" style={{ color: 'var(--ns-primary)' }}>Comensales</label>
                          <div className="ns-input-wrapper">
                             <div className="ns-input-icon"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" strokeLinecap="round" strokeLinejoin="round"/></svg></div>
                             <input type="number" min="1" max="20" required className="ns-input" placeholder="Cantidad de personas" value={reserva.campoExtra} onChange={(e) => setReserva({...reserva, campoExtra: e.target.value})} />
                          </div>
                        </div>
                      )}
                   </div>

                   {/* TICKET VIP DEGRADADO */}
                   <div className="ns-public-ticket">
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
                   style={{ background: 'var(--ns-gradient-1)', boxShadow: '0 8px 0 rgba(0,0,0,0.1), 0 20px 40px rgba(91, 61, 245, 0.35), inset 0 2px 0 rgba(255,255,255,0.25)' }}
                >
                   <svg className="w-8 h-8 md:w-10 md:h-10" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
                 <div className="space-y-1.5 px-2">
                   <h3 className="text-2xl md:text-3xl font-black tracking-tighter" style={{ color: 'var(--ns-text)' }}>{vocab.exitoTitulo}</h3>
                   <p className="text-xs md:text-sm font-medium leading-relaxed max-w-[260px] mx-auto text-balance" style={{ color: 'var(--ns-text-muted)' }}>
                     {vocab.exitoMensaje} <b style={{ color: 'var(--ns-text)' }}>{reserva.fecha.split('-').reverse().join('/')}</b> a las <b style={{ color: 'var(--ns-text)' }}>{reserva.hora} hs</b> {vocab.exitoMensaje2}
                   </p>
                </div>

                {/* Resumen final */}
                <div className="ns-public-summary-card">
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: 'var(--ns-text-muted)' }}>{vocab.servicio.charAt(0).toUpperCase() + vocab.servicio.slice(1)}</span>
                    <span className="text-xs font-bold" style={{ color: 'var(--ns-text)' }}>{servicioSeleccionado?.nombre}</span>
                  </div>
                  <div className="h-px" style={{ background: 'var(--ns-border)' }}></div>
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: 'var(--ns-text-muted)' }}>{vocab.empleado.charAt(0).toUpperCase() + vocab.empleado.slice(1)}</span>
                    <span className="text-xs font-bold" style={{ color: 'var(--ns-text)' }}>{empleadoSeleccionado?.nombre}</span>
                  </div>
                  <div className="h-px" style={{ background: 'var(--ns-border)' }}></div>
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: 'var(--ns-text-muted)' }}>Precio</span>
                    <span className="text-xs font-bold" style={{ color: 'var(--ns-text)' }}>${servicioSeleccionado?.precio}</span>
                  </div>
                </div>

                {/* ACTION BUTTONS — Add to Calendar + WhatsApp */}
                <div className="flex flex-col gap-2.5 px-4 max-w-[300px] mx-auto w-full">
                  {/* Add to Google Calendar */}
                  <button 
                    onClick={() => {
                      const [yr, mo, dy] = reserva.fecha.split('-').map(Number)
                      const [hr, mn] = reserva.hora.split(':').map(Number)
                      const bookDay = reserva.horaNextDay ? dy + 1 : dy
                      const start = new Date(yr, mo - 1, bookDay, hr, mn, 0)
                      const dur = servicioSeleccionado?.duracion_minutos || 30
                      const end = new Date(start.getTime() + dur * 60000)
                      const fmt = (d) => d.toISOString().replace(/-|:|\.\d\d\d/g, "")
                      const titulo = encodeURIComponent(`${servicioSeleccionado?.nombre} — ${negocio.nombre}`)
                      const detalles = encodeURIComponent(`Reserva confirmada en ${negocio.nombre}\n${servicioSeleccionado?.nombre}\nCon: ${empleadoSeleccionado?.nombre}\n\nPrecio: $${servicioSeleccionado?.precio}`)
                      window.open(`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${titulo}&dates=${fmt(start)}/${fmt(end)}&details=${detalles}&sf=true&output=xml`, '_blank')
                    }}
                    className="ns-cta-primary"
                    style={{}}
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zM9 14H7v-2h2v2zm4 0h-2v-2h2v2zm4 0h-2v-2h2v2zm-8 4H7v-2h2v2zm4 0h-2v-2h2v2zm4 0h-2v-2h2v2z"/></svg>
                    Agregar al Calendario
                  </button>
                  
                  {/* WhatsApp Confirmation to Negocio */}
                  {negocio.telefono && (
                    <button 
                      onClick={() => {
                        const num = negocio.telefono.replace(/[^0-9]/g, '')
                        const msg = encodeURIComponent(`Hola ${negocio.nombre}, acabo de reservar:\n\n📋 ${servicioSeleccionado?.nombre}\n📅 ${reserva.fecha.split('-').reverse().join('/')} a las ${reserva.hora} hs\n👤 ${reserva.clienteNombre}\n📞 ${reserva.clienteTelefono}\n\n¡Gracias!`)
                        window.open(`https://wa.me/${num}?text=${msg}`, '_blank')
                      }}
                      className="ns-cta-wa"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.888-.788-1.489-1.761-1.663-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 00-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                      Confirmar por WhatsApp
                    </button>
                  )}
                </div>

                <div className="pt-2">
                   <button onClick={() => window.location.reload()} className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] px-6 py-2.5 rounded-full active:scale-95 transition-all" style={{ backgroundColor: 'var(--ns-primary-bg)', color: 'var(--ns-primary)', boxShadow: '0 2px 0 rgba(0,0,0,0.04), 0 4px 12px rgba(91,61,245,0.1), inset 0 1px 0 rgba(255,255,255,0.7)' }}>{vocab.nuevaReservaBtn}</button>
                </div>
              </section>
            )}
         </div>
         </>
         )}

         {/* ========== VISTA: CATÁLOGO TIENDA ========== */}
           {vistaActiva === 'catalogo' && (
           <section className="mt-4 md:mt-8 space-y-4 md:space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]">
             
             {/* HEADER CATÁLOGO: Búsqueda y Filtros */}
             <div className="flex flex-col md:flex-row gap-3 md:items-center justify-between nh-card">
               <div className="relative flex-1 md:max-w-xs">
                 <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--ns-text-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeLinecap="round" strokeLinejoin="round"/></svg>
                 <input type="text" placeholder="Buscar producto..." className="w-full ns-input" style={{ paddingLeft: '2.5rem' }} value={catBusqueda} onChange={e => setCatBusqueda(e.target.value)} />
               </div>
               
               {(() => {
                 const cats = [...new Set(catalogo.map(p => p.categoria))]
                 return cats.length > 1 ? (
                   <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1 md:pb-0">
                     <button onClick={() => setCatFiltro('todos')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border shrink-0 transition-all active:scale-95 ${catFiltro === 'todos' ? 'text-white border-transparent shadow-md' : 'bg-zinc-50 border-transparent text-zinc-500 hover:bg-zinc-100'}`} style={catFiltro === 'todos' ? { backgroundColor: 'var(--ns-primary)' } : {}}>Todos</button>
                     {cats.map(c => (
                       <button key={c} onClick={() => setCatFiltro(c)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border shrink-0 transition-all active:scale-95 ${catFiltro === c ? 'text-white border-transparent shadow-md' : 'bg-zinc-50 border-transparent text-zinc-500 hover:bg-zinc-100'}`} style={catFiltro === c ? { backgroundColor: 'var(--ns-primary)' } : {}}>{c}</button>
                     ))}
                   </div>
                 ) : null
               })()}
             </div>

             {/* GRILLA DE PRODUCTOS */}
             {(() => {
               const filtered = catalogo
                 .filter(p => catFiltro === 'todos' || p.categoria === catFiltro)
                 .filter(p => !catBusqueda || p.nombre.toLowerCase().includes(catBusqueda.toLowerCase()))
               
                   if (filtered.length === 0) return (
                 <div className="bg-white/80 backdrop-blur-xl rounded-[2rem] border border-white/40 shadow-sm p-12 text-center">
                   <div className="w-16 h-16 rounded-2xl bg-zinc-50 flex items-center justify-center mx-auto mb-4">
                     <svg className="w-8 h-8 text-zinc-300" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>
                   </div>
                   <h3 className="text-lg font-bold text-zinc-900 mb-1">Sin resultados</h3>
                   <p className="text-sm font-medium text-zinc-500">No encontramos productos con esos filtros.</p>
                 </div>
               )

               return (
                 <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-5">
                   {filtered.map(prod => {
                     const qty = carrito[prod.id] || 0
                     return (
                       <div key={prod.id} className="bg-white rounded-[1.5rem] md:rounded-[2rem] border border-zinc-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] overflow-hidden transition-all duration-300 hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] hover:-translate-y-1 flex flex-col group cursor-pointer" onClick={() => setProductoDetalle(prod)}>
                         {/* IMAGEN DEL PRODUCTO */}
                         <div className="aspect-[4/4] w-full bg-zinc-50 relative overflow-hidden shrink-0">
                           {prod.imagen_url ? (
                             <img src={prod.imagen_url} alt={prod.nombre} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                           ) : (
                             <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: 'var(--ns-primary-bg)' }}>
                               <svg className="w-10 h-10 md:w-12 md:h-12" style={{ color: 'var(--ns-primary)', opacity: 0.3 }} fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round"/></svg>
                             </div>
                           )}
                           {/* Badge Categoría */}
                           <div className="absolute top-3 left-3 px-2 py-1 bg-white/90 backdrop-blur-md rounded-lg shadow-sm border border-white/20">
                             <span className="text-[8px] md:text-[9px] font-black uppercase tracking-widest" style={{ color: 'var(--ns-primary)' }}>{prod.categoria}</span>
                           </div>
                         </div>
                         
                         {/* INFO DEL PRODUCTO */}
                         <div className="p-4 md:p-5 flex flex-col flex-1">
                           <h4 className="text-[14px] md:text-[16px] font-black leading-tight mb-1 line-clamp-2" style={{ color: 'var(--ns-text)' }}>{prod.nombre}</h4>
                           {prod.descripcion && <p className="text-[11px] md:text-[12px] font-medium line-clamp-2 mb-3" style={{ color: 'var(--ns-text-muted)' }}>{prod.descripcion}</p>}
                           
                           <div className="mt-auto flex items-end justify-between gap-2 pt-2">
                             <div>
                               {prod.precio > 0 ? (
                                 <p className="text-lg md:text-xl font-black tracking-tighter" style={{ color: 'var(--ns-text)' }}>${prod.precio.toLocaleString()}</p>
                               ) : (
                                 <p className="text-sm font-bold" style={{ color: 'var(--ns-text-muted)' }}>Consultar</p>
                               )}
                             </div>
                             
                             {/* CONTROLES CLICK PREVENIDO PARA NO ABRIR MODAL */}
                             <div onClick={e => e.stopPropagation()}>
                               {qty > 0 ? (
                                 <div className="flex items-center gap-0 rounded-xl overflow-hidden shadow-sm h-8 md:h-10" style={{ backgroundColor: 'var(--ns-primary)', color: 'white' }}>
                                   <button onClick={() => removeFromCart(prod.id)} className="w-8 md:w-9 h-full flex items-center justify-center hover:bg-black/10 active:bg-black/20 transition-all font-bold text-lg">−</button>
                                   <span className="w-6 md:w-8 text-center text-[12px] md:text-[14px] font-black">{qty}</span>
                                   <button onClick={() => addToCart(prod.id)} className="w-8 md:w-9 h-full flex items-center justify-center hover:bg-black/10 active:bg-black/20 transition-all font-bold text-lg">+</button>
                                 </div>
                               ) : (
                                 <button onClick={() => addToCart(prod.id)} className="w-8 h-8 md:w-10 md:h-10 rounded-xl flex items-center justify-center text-white active:scale-90 transition-all shadow-md hover:shadow-lg" style={{ backgroundColor: 'var(--ns-primary)', boxShadow: '0 3px 0 rgba(0,0,0,0.1), 0 6px 16px rgba(91,61,245,0.3), inset 0 1px 0 rgba(255,255,255,0.3)' }}>
                                   <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                 </button>
                               )}
                             </div>
                           </div>
                         </div>
                       </div>
                     )
                   })}
                 </div>
               )
             })()}
           </section>
         )}

         {/* BOTÓN FLOTANTE CARRITO */}
         {vistaActiva === 'catalogo' && itemsEnCarrito > 0 && !carritoAbierto && !productoDetalle && (
           <div className="fixed bottom-0 inset-x-0 z-40 p-4 animate-in slide-in-from-bottom-full duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] flex justify-center pointer-events-none" style={{ paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))' }}>
             <button onClick={() => setCarritoAbierto(true)} className="w-full max-w-sm flex items-center justify-between py-4 px-5 rounded-2xl text-white font-extrabold active:scale-[0.97] transition-all pointer-events-auto" style={{ backgroundColor: accent, boxShadow: `0 6px 0 rgba(0,0,0,0.12), 0 12px 36px ${accentDark}, inset 0 2px 0 rgba(255,255,255,0.25)`, textShadow: '0 1px 2px rgba(0,0,0,0.15)' }}>
               <div className="flex items-center gap-3">
                 <div className="relative">
                   <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" strokeLinecap="round" strokeLinejoin="round"/></svg>
                   <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-white text-[10px] font-black flex items-center justify-center" style={{ color: accent }}>{itemsEnCarrito}</div>
                 </div>
                 <span className="text-[11px] font-black uppercase tracking-widest ml-1">Ver Carrito</span>
               </div>
               <span className="text-base font-black">${totalCarrito.toLocaleString()}</span>
             </button>
           </div>
         )}
         
         {/* OVERLAYS GLOBALES (MODAL PRODUCTO & CARRITO) */}
         {/* MODAL DETALLE PRODUCTO */}
         {productoDetalle && (
           <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-0 md:p-4 animate-in fade-in duration-300">
             <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setProductoDetalle(null)}></div>
             <div className="relative w-full max-w-md bg-white rounded-t-[2rem] md:rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in slide-in-from-bottom-12 md:slide-in-from-bottom-8 duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]">
               
               {/* Btn Cerrar */}
               <button onClick={() => setProductoDetalle(null)} className="absolute top-4 right-4 z-10 w-8 h-8 bg-black/10 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-black/20 transition-colors">
                 <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round"/></svg>
               </button>

               {/* Imagen grande */}
               <div className="w-full aspect-[4/3] bg-zinc-100 relative shrink-0">
                 {productoDetalle.imagen_url ? (
                   <img src={productoDetalle.imagen_url} className="w-full h-full object-cover" alt={productoDetalle.nombre} />
                 ) : (
                   <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: accentUltraSoft }}>
                     <svg className="w-16 h-16" style={{ color: accent, opacity: 0.3 }} fill="none" stroke="currentColor" strokeWidth="1" viewBox="0 0 24 24"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round"/></svg>
                   </div>
                 )}
                 <div className="absolute bottom-0 inset-x-0 h-16 bg-gradient-to-t from-white to-transparent"></div>
               </div>

               {/* Contenido Modal */}
               <div className="p-6 overflow-y-auto no-scrollbar pb-[100px]">
                 <div className="mb-2">
                   <span className="text-[10px] font-black uppercase tracking-[0.2em] px-2.5 py-1 rounded-md" style={{ backgroundColor: accentUltraSoft, color: accent }}>{productoDetalle.categoria}</span>
                 </div>
                 <h2 className="text-2xl font-extrabold text-zinc-900 tracking-tight leading-tight mb-3">{productoDetalle.nombre}</h2>
                 {productoDetalle.precio > 0 && <p className="text-2xl font-black text-zinc-900 mb-4">${productoDetalle.precio.toLocaleString()}</p>}
                 
                 <div className="space-y-4">
                   {productoDetalle.descripcion ? (
                     <div>
                       <h4 className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1.5">Acerca de</h4>
                       <p className="text-sm font-medium text-zinc-600 leading-relaxed whitespace-pre-wrap">{productoDetalle.descripcion}</p>
                     </div>
                   ) : (
                     <p className="text-sm font-medium text-zinc-400 italic">Sin descripción detallada.</p>
                   )}
                 </div>
               </div>

               {/* Acciones Sticky Modal */}
               <div className="absolute bottom-0 inset-x-0 p-4 bg-white border-t border-zinc-100 flex items-center justify-between gap-4" style={{ paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))' }}>
                 {(() => {
                   const qty = carrito[productoDetalle.id] || 0
                   return qty > 0 ? (
                     <div className="flex items-center justify-between w-full p-1 rounded-2xl border-2" style={{ borderColor: accent }}>
                       <button onClick={() => removeFromCart(productoDetalle.id)} className="w-12 h-12 flex items-center justify-center hover:bg-zinc-50 rounded-xl transition-all font-bold text-2xl text-zinc-600">−</button>
                       <span className="text-lg font-black text-zinc-900 px-4">{qty} en carrito</span>
                       <button onClick={() => addToCart(productoDetalle.id)} className="w-12 h-12 flex items-center justify-center rounded-xl transition-all font-bold text-2xl text-white shadow-md" style={{ backgroundColor: accent }}>+</button>
                     </div>
                   ) : (
                         <button onClick={() => { addToCart(productoDetalle.id); setProductoDetalle(null); }} className="w-full py-4 rounded-2xl text-white font-extrabold uppercase tracking-widest text-xs active:scale-[0.98] transition-all flex items-center justify-center gap-2" style={{ backgroundColor: accent, boxShadow: `0 6px 0 rgba(0,0,0,0.1), 0 10px 28px ${accentGlow}, inset 0 2px 0 rgba(255,255,255,0.25)`, textShadow: '0 1px 2px rgba(0,0,0,0.15)' }}>
                       <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                       Agregar al pedido
                     </button>
                   )
                 })()}
               </div>
             </div>
           </div>
         )}

         {/* DRAWER DEL CARRITO & CHECKOUT */}
         {carritoAbierto && (
           <div className="fixed inset-0 z-[110] flex items-end md:items-center justify-end md:justify-center p-0 md:p-4 animate-in fade-in duration-300">
             <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setCarritoAbierto(false)}></div>
             <div className="relative w-full h-[85vh] md:h-auto md:max-h-[85vh] md:max-w-md bg-white rounded-t-[2rem] md:rounded-[2rem] shadow-2xl flex flex-col animate-in slide-in-from-bottom-full md:slide-in-from-bottom-12 duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]">
               
               {/* Header Carrito */}
               <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between shrink-0">
                 <div className="flex items-center gap-3">
                   {checkoutActivo ? (
                     <button onClick={() => setCheckoutActivo(false)} className="w-8 h-8 flex items-center justify-center text-zinc-400 hover:text-zinc-900 bg-zinc-50 rounded-full transition-colors"><svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
                   ) : (
                     <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: accentUltraSoft, color: accent }}><svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" strokeLinecap="round" strokeLinejoin="round"/></svg></div>
                   )}
                   <h3 className="text-lg font-extrabold text-zinc-900">{checkoutActivo ? 'Tus Datos' : 'Tu Pedido'}</h3>
                 </div>
                 <button onClick={() => setCarritoAbierto(false)} className="w-8 h-8 flex items-center justify-center text-zinc-400 hover:text-zinc-900 bg-zinc-50 rounded-full transition-colors">
                   <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round"/></svg>
                 </button>
               </div>

               {/* Contenido Carrito / Formulario */}
               <div className="flex-1 overflow-y-auto no-scrollbar p-5">
                 {!checkoutActivo ? (
                   <div className="space-y-4">
                     {Object.entries(carrito).map(([pid, qty]) => {
                       const p = catalogo.find(x => x.id === pid)
                       if (!p) return null
                       return (
                         <div key={pid} className="flex gap-3 items-center">
                           <div className="w-16 h-16 rounded-xl bg-zinc-50 shrink-0 overflow-hidden border border-zinc-100">
                             {p.imagen_url ? <img src={p.imagen_url} className="w-full h-full object-cover" /> : <div className="w-full h-full" style={{ backgroundColor: accentUltraSoft }}></div>}
                           </div>
                           <div className="flex-1 min-w-0">
                             <h5 className="text-[13px] font-bold text-zinc-900 truncate">{p.nombre}</h5>
                             <p className="text-[11px] font-medium text-zinc-400">${p.precio.toLocaleString()} c/u</p>
                             <div className="mt-1 flex items-center justify-between">
                               <div className="flex items-center gap-2 border border-zinc-200 rounded-lg overflow-hidden h-7">
                                 <button onClick={() => removeFromCart(pid)} className="w-7 h-full flex items-center justify-center text-zinc-500 hover:bg-zinc-50 font-bold">−</button>
                                 <span className="w-6 text-center text-[11px] font-black">{qty}</span>
                                 <button onClick={() => addToCart(pid)} className="w-7 h-full flex items-center justify-center text-white font-bold" style={{ backgroundColor: accent }}>+</button>
                               </div>
                               <span className="text-sm font-black text-zinc-900">${(p.precio * qty).toLocaleString()}</span>
                             </div>
                           </div>
                         </div>
                       )
                     })}
                   </div>
                 ) : (
                   <form id="checkoutForm" onSubmit={enviarPedidoWhatsApp} className="space-y-4">
                     <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-widest ml-1" style={{ color: accentGlow }}>Nombre Completo *</label>
                        <input required className="w-full bg-zinc-50 border border-zinc-200 text-zinc-900 rounded-xl py-3 px-4 font-bold outline-none focus:border-zinc-400 focus:bg-white transition-all text-sm placeholder:text-zinc-400" placeholder="¿Cómo te llamas?" value={clienteCheckout.nombre} onChange={(e) => setClienteCheckout({...clienteCheckout, nombre: e.target.value})} />
                     </div>
                     <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-widest ml-1" style={{ color: accentGlow }}>Teléfono (Opcional)</label>
                        <input type="tel" className="w-full bg-zinc-50 border border-zinc-200 text-zinc-900 rounded-xl py-3 px-4 font-bold outline-none focus:border-zinc-400 focus:bg-white transition-all text-sm placeholder:text-zinc-400" placeholder="Para contactarte si es necesario" value={clienteCheckout.telefono} onChange={(e) => setClienteCheckout({...clienteCheckout, telefono: e.target.value})} />
                     </div>
                     <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-widest ml-1" style={{ color: accentGlow }}>Notas del pedido (Opcional)</label>
                        <textarea rows="3" className="w-full bg-zinc-50 border border-zinc-200 text-zinc-900 rounded-xl py-3 px-4 font-bold outline-none focus:border-zinc-400 focus:bg-white transition-all text-sm placeholder:text-zinc-400 resize-none" placeholder="Aclaraciones sobre tu pedido..." value={clienteCheckout.notas} onChange={(e) => setClienteCheckout({...clienteCheckout, notas: e.target.value})}></textarea>
                     </div>
                   </form>
                 )}
               </div>

               {/* Footer Carrito */}
               <div className="p-5 border-t border-zinc-100 bg-zinc-50/50 shrink-0" style={{ paddingBottom: 'calc(20px + env(safe-area-inset-bottom, 0px))' }}>
                 <div className="flex items-center justify-between mb-4">
                   <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">Total del pedido</span>
                   <span className="text-2xl font-black text-zinc-900">${totalCarrito.toLocaleString()}</span>
                 </div>
                 
                 {!checkoutActivo ? (
                   <button onClick={() => setCheckoutActivo(true)} className="w-full py-4 rounded-2xl text-white font-extrabold uppercase tracking-widest text-[11px] active:scale-[0.98] transition-all flex items-center justify-center gap-2" style={{ backgroundColor: accent, boxShadow: `0 6px 0 rgba(0,0,0,0.1), 0 10px 28px ${accentGlow}, inset 0 2px 0 rgba(255,255,255,0.25)`, textShadow: '0 1px 2px rgba(0,0,0,0.15)' }}>
                     Completar Datos
                     <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/></svg>
                   </button>
                 ) : (
                   <button type="submit" form="checkoutForm" className="w-full py-4 rounded-2xl text-white font-extrabold uppercase tracking-widest text-[11px] active:scale-[0.98] transition-all flex items-center justify-center gap-2" style={{ backgroundColor: '#25D366', boxShadow: '0 6px 0 rgba(0,0,0,0.08), 0 10px 24px rgba(37, 211, 102, 0.3), inset 0 2px 0 rgba(255,255,255,0.25)', textShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>
                     <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.888-.788-1.489-1.761-1.663-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 00-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                     Enviar Pedido
                   </button>
                 )}
               </div>
             </div>
           </div>
         )}

      </main>

      {/* STICKY CTAs — Safe area aware */}
      {vistaActiva === 'reservas' && paso === 3 && reserva.hora && (
        <div className="ns-sticky-cta-wrap">
           <button 
              onClick={() => setPaso(4)} 
              className="ns-sticky-cta-btn"
           >
              {vocab.avanzarBtn}
           </button>
        </div>
      )}
      
      {vistaActiva === 'reservas' && paso === 4 && (
        <div className="ns-sticky-cta-wrap">
           <button 
              form="reservaForm" 
              disabled={guardando} 
              type="submit" 
              className="ns-sticky-cta-btn"
           >
              {guardando ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : vocab.confirmarBtn}
           </button>
        </div>
      )}

      {/* SECCIÓN: UBICACIÓN / MAPA */}
      {(negocio.mapa_url || negocio.direccion) && paso < 5 && (
        <section className="mt-6 md:mt-8 animate-in fade-in slide-in-from-bottom-4 duration-700 relative z-10 px-4">
          <div className="max-w-md mx-auto">
            <div className="nh-card overflow-hidden" style={{ background: 'rgba(255,255,255,0.75)', backdropFilter: 'blur(16px) saturate(150%)', border: '1px solid rgba(255,255,255,0.5)', boxShadow: '0 4px 20px rgba(91,61,245,0.04), inset 0 1px 0 rgba(255,255,255,0.7)' }}>
              {/* Map Header */}
              <div className="p-4 md:p-5 flex items-center gap-3">
                <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--ns-primary-bg)' }}>
                  <svg className="w-4 h-4 md:w-5 md:h-5" style={{ color: 'var(--ns-primary)' }} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" strokeLinecap="round" strokeLinejoin="round"/><path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[8px] md:text-[9px] font-black uppercase tracking-[0.25em]" style={{ color: 'var(--ns-primary)' }}>Ubicación</p>
                  {negocio.direccion && (
                    <p className="text-[12px] md:text-sm font-bold truncate" style={{ color: 'var(--ns-text)' }}>{negocio.direccion}</p>
                  )}
                </div>
                {negocio.mapa_url && (
                  <a
                    href={negocio.mapa_url.includes('google.com/maps') ? negocio.mapa_url : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(negocio.direccion || negocio.mapa_url)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-full text-[8px] md:text-[9px] font-black uppercase tracking-widest transition-all active:scale-95"
                    style={{ backgroundColor: 'var(--ns-primary-bg)', color: 'var(--ns-primary)', boxShadow: '0 2px 0 rgba(0,0,0,0.04), 0 4px 8px rgba(91,61,245,0.08), inset 0 1px 0 rgba(255,255,255,0.6)' }}
                  >
                    Abrir Mapa
                  </a>
                )}
              </div>
              {/* Map Embed */}
              {negocio.mapa_url && (
                <div className="h-[180px] md:h-[220px] w-full border-t" style={{ borderColor: 'var(--ns-border)' }}>
                  <iframe
                    src={negocio.mapa_url.includes('<iframe') ? negocio.mapa_url.match(/src="([^"]+)"/)?.[1] || '' : `https://www.google.com/maps?q=${encodeURIComponent(negocio.mapa_url.includes('google.com/maps') ? negocio.mapa_url : negocio.direccion || negocio.mapa_url)}&output=embed`}
                    width="100%" height="100%" style={{border: 0}} allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade"
                    title="Ubicación del negocio"
                  ></iframe>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {paso < 5 && (
        <footer className="mt-8 py-6 md:py-8 flex flex-col items-center gap-2 opacity-35 relative z-10">
           <div className="w-6 h-6 rounded-[0.5rem] flex items-center justify-center rotate-3 shadow-lg" style={{ background: 'var(--ns-gradient-1)', boxShadow: '0 3px 0 rgba(0,0,0,0.1), 0 6px 12px rgba(91,61,245,0.2)' }}><span className="text-white font-black text-[6px] italic">NS</span></div>
           <p className="text-[7px] font-black uppercase tracking-[0.4em]" style={{ color: 'var(--ns-text)' }}>Engineered by Non Sistemas</p>
        </footer>
      )}

      {/* CLASES DINÁMICAS INYECTADAS — Colores de marca */}
      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        
        /* --- PUBLIC PAGE SPECIFIC --- */
        .ns-public-identity-card {
          background: rgba(255,255,255,0.75);
          backdrop-filter: blur(24px) saturate(180%);
          -webkit-backdrop-filter: blur(24px) saturate(180%);
          border: 1px solid rgba(255,255,255,0.5);
          border-radius: 1.8rem;
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          box-shadow: 0 8px 32px rgba(91, 61, 245, 0.08), inset 0 1px 0 rgba(255,255,255,0.8);
        }
        .ns-public-logo {
          width: 4.5rem;
          height: 4.5rem;
          border-radius: 1rem;
          background: rgba(255,255,255,0.9);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          padding: 4px;
          margin-top: -3rem;
          margin-bottom: 0.75rem;
          border: 1.5px solid rgba(255,255,255,0.7);
          position: relative;
          z-index: 10;
          transition: transform 0.5s cubic-bezier(0.32,0.72,0,1);
          box-shadow: 0 16px 40px rgba(91, 61, 245, 0.2), 0 2px 8px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.9);
        }
        .ns-public-logo:hover { transform: scale(1.08); }
        .ns-public-logo img, .ns-public-logo div {
          border-radius: 0.75rem;
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        
        .ns-public-service-item {
          width: 100%;
          text-align: left;
          padding: 0.875rem 1rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          transition: all 0.2s cubic-bezier(0.32,0.72,0,1);
          cursor: pointer;
          border-radius: 0.5rem;
        }
        .ns-public-service-item:hover { background: rgba(91,61,245,0.06); }
        .ns-public-service-item:active { transform: scale(0.97); background: rgba(91,61,245,0.1); }
        .ns-public-service-ic {
          width: 2.5rem;
          height: 2.5rem;
          border-radius: 0.7rem;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s cubic-bezier(0.32,0.72,0,1);
          background: var(--ns-primary-bg);
          color: var(--ns-primary);
          flex-shrink: 0;
          box-shadow: 0 3px 0 rgba(0,0,0,0.06), 0 6px 12px rgba(91,61,245,0.12), inset 0 1px 0 rgba(255,255,255,0.5);
        }
        .ns-public-service-ic:hover { transform: scale(1.08); box-shadow: 0 4px 0 rgba(0,0,0,0.06), 0 8px 16px rgba(91,61,245,0.15), inset 0 1px 0 rgba(255,255,255,0.6); }
        
        .ns-public-employee-card {
          background: rgba(255,255,255,0.8);
          backdrop-filter: blur(12px) saturate(150%);
          -webkit-backdrop-filter: blur(12px) saturate(150%);
          padding: 1.25rem;
          border-radius: 1.2rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.75rem;
          border: 1px solid rgba(255,255,255,0.6);
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.32,0.72,0,1);
          box-shadow: 0 4px 16px rgba(91,61,245,0.04), inset 0 1px 0 rgba(255,255,255,0.8);
        }
        .ns-public-employee-card:active { transform: scale(0.94); }
        .ns-public-employee-card:hover { border-color: rgba(255,255,255,0.8); box-shadow: 0 8px 24px rgba(91,61,245,0.1), inset 0 1px 0 rgba(255,255,255,0.9); }
        
        .ns-public-form-card {
          background: rgba(255,255,255,0.7);
          backdrop-filter: blur(16px) saturate(150%);
          -webkit-backdrop-filter: blur(16px) saturate(150%);
          border: 1px solid rgba(255,255,255,0.5);
          border-radius: 1.3rem;
          padding: 1rem;
          box-shadow: 0 4px 20px rgba(91,61,245,0.04), inset 0 1px 0 rgba(255,255,255,0.7);
        }
        .ns-input-wrapper {
          display: flex;
          align-items: center;
          position: relative;
        }
        .ns-input-icon {
          position: absolute;
          left: 0.75rem;
          width: 1.5rem;
          height: 1.5rem;
          border-radius: 9999px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--ns-primary-bg);
          color: var(--ns-primary);
          transition: all 0.2s;
        }
        .ns-input-icon svg {
          width: 0.875rem;
          height: 0.875rem;
        }
        .ns-input {
          width: 100%;
          background: var(--ns-bg);
          border: 1px solid var(--ns-border);
          color: var(--ns-text);
          border-radius: 0.75rem;
          padding: 0.75rem 1rem 0.75rem 2.75rem;
          font-weight: 700;
          outline: none;
          transition: all 0.2s;
          font-size: 0.875rem;
        }
        .ns-input::placeholder {
          color: var(--ns-text-muted);
          opacity: 0.5;
        }
        .ns-input:focus {
          border-color: var(--ns-primary);
          box-shadow: 0 0 0 4px var(--ns-primary-bg);
        }
        .ns-input-wrapper:focus-within .ns-input-icon {
          background: var(--ns-primary);
          color: white;
        }
        .ns-input-wrapper:focus-within .ns-input-icon svg {
          color: white;
        }
        
        .ns-public-ticket {
          border-radius: 1.5rem;
          padding: 1.5rem;
          color: white;
          box-shadow: 0 24px 48px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.1);
          position: relative;
          overflow: hidden;
          background: linear-gradient(135deg, #1E1B4B 0%, #312E81 50%, #4338CA 100%);
        }
        .ns-public-ticket::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
        }
        
        .ns-public-summary-card {
          background: rgba(255,255,255,0.8);
          backdrop-filter: blur(16px) saturate(150%);
          -webkit-backdrop-filter: blur(16px) saturate(150%);
          border-radius: 1.2rem;
          border: 1px solid rgba(255,255,255,0.6);
          padding: 1rem;
          max-width: 300px;
          margin: 0 auto;
          box-shadow: 0 4px 20px rgba(91,61,245,0.05), inset 0 1px 0 rgba(255,255,255,0.8);
        }
        
        .ns-cta-primary {
          width: 100%;
          padding: 0.875rem;
          border-radius: 1rem;
          background: var(--ns-primary);
          color: white;
          font-weight: 800;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          box-shadow: 0 6px 0 rgba(0,0,0,0.1), 0 12px 28px rgba(91,61,245,0.35), inset 0 2px 0 rgba(255,255,255,0.2);
          transition: all 0.15s cubic-bezier(0.32,0.72,0,1);
          text-shadow: 0 1px 2px rgba(0,0,0,0.15);
        }
        .ns-cta-primary:active { transform: translateY(3px) scale(0.97); box-shadow: 0 3px 0 rgba(0,0,0,0.1), 0 6px 12px rgba(91,61,245,0.25), inset 0 1px 0 rgba(255,255,255,0.15); }
        
        .ns-cta-wa {
          width: 100%;
          padding: 0.875rem;
          border-radius: 1rem;
          background: #25D366;
          color: white;
          font-weight: 800;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          box-shadow: 0 6px 0 rgba(0,0,0,0.08), 0 10px 22px rgba(37, 211, 102, 0.3), inset 0 2px 0 rgba(255,255,255,0.25);
          transition: all 0.15s cubic-bezier(0.32,0.72,0,1);
          text-shadow: 0 1px 2px rgba(0,0,0,0.1);
        }
        .ns-cta-wa:active { transform: translateY(3px) scale(0.97); box-shadow: 0 3px 0 rgba(0,0,0,0.08), 0 5px 10px rgba(37, 211, 102, 0.2), inset 0 1px 0 rgba(255,255,255,0.15); }
        
        .ns-sticky-cta-wrap {
          position: fixed;
          bottom: 0;
          inset-inline: 0;
          padding: 1rem;
          background: linear-gradient(to top, var(--ns-bg) 0%, rgba(250,247,255,0.95) 95%, transparent 100%);
          z-index: 50;
          pointer-events: none;
          padding-bottom: calc(16px + env(safe-area-inset-bottom, 0px));
        }
        .ns-sticky-cta-btn {
          width: 100%;
          max-width: 24rem;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 1rem;
          border-radius: 1.25rem;
          background: var(--ns-primary);
          color: white;
          font-weight: 800;
          font-size: 12px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          box-shadow: 0 8px 0 rgba(0,0,0,0.12), 0 14px 30px rgba(91,61,245,0.35), inset 0 2px 0 rgba(255,255,255,0.25);
          transition: all 0.15s cubic-bezier(0.32,0.72,0,1);
          pointer-events: auto;
          text-shadow: 0 1px 2px rgba(0,0,0,0.15);
        }
        .ns-sticky-cta-btn:active { transform: translateY(4px) scale(0.97); box-shadow: 0 4px 0 rgba(0,0,0,0.12), 0 8px 15px rgba(91,61,245,0.25), inset 0 2px 0 rgba(255,255,255,0.15); }
        .ns-sticky-cta-btn:disabled { opacity: 0.7; transform: none; }
        
        .ns-progress-nav {
          margin-top: 1rem;
          margin-bottom: 0.75rem;
          position: sticky;
          top: 0.5rem;
          z-index: 40;
          background: rgba(250, 247, 255, 0.85);
          backdrop-filter: blur(24px) saturate(180%);
          -webkit-backdrop-filter: blur(24px) saturate(180%);
          padding: 0.6rem 0.85rem;
          border-radius: 1.1rem;
          box-shadow: 0 4px 24px rgba(91,61,245,0.06), inset 0 1px 0 rgba(255,255,255,0.7);
          border: 1px solid rgba(255,255,255,0.5);
        }
        
        .ns-public-product-card {
          background: rgba(255,255,255,0.85);
          backdrop-filter: blur(16px) saturate(150%);
          -webkit-backdrop-filter: blur(16px) saturate(150%);
          border-radius: 1.3rem;
          border: 1px solid rgba(255,255,255,0.6);
          box-shadow: 0 4px 24px rgba(91,61,245,0.05), inset 0 1px 0 rgba(255,255,255,0.8);
          overflow: hidden;
          transition: all 0.3s cubic-bezier(0.32,0.72,0,1);
          display: flex;
          flex-direction: column;
          cursor: pointer;
        }
        .ns-public-product-card:hover {
          box-shadow: 0 12px 36px rgba(91,61,245,0.1), inset 0 1px 0 rgba(255,255,255,0.9);
          transform: translateY(-3px);
        }
        .ns-public-product-card:active {
          transform: scale(0.98);
        }
        .ns-public-product-card img {
          transition: transform 0.7s cubic-bezier(0.32,0.72,0,1);
        }
        .ns-public-product-card:hover img {
          transform: scale(1.06);
        }
      `}</style>
    </div>
  )
}