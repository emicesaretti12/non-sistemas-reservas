import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useParams } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { getVocabulario } from '../utils/vocabulario'
import { getEstadoSuscripcion } from '../utils/suscripcion'
import { ocupaHorario, duracionTurno, parseFecha, seSolapan, verificarDisponibilidad, mapaEmbedUrl } from '../utils/reservas'
import { useToast } from './Toast'
import { usePersistentState } from '../hooks/usePersistentState'
import { leerCliente, recordarCliente, recordarTurno, proximoTurnoEn, cuandoEs } from '../utils/misTurnos'

const TRES_DIAS = 3 * 24 * 60 * 60 * 1000
const esCarrito = (c) => Boolean(c) && typeof c === 'object' && !Array.isArray(c)

/** Abre Google Calendar con el turno ya cargado. */
function abrirEnCalendario({ inicio, duracion = 30, servicio, profesional, negocio, extra = '' }) {
  const desde = new Date(inicio)
  const hasta = new Date(desde.getTime() + duracion * 60000)
  const fmt = (d) => d.toISOString().replace(/-|:|\.\d\d\d/g, '')
  const titulo = encodeURIComponent(`${servicio || 'Turno'} — ${negocio}`)
  const detalles = encodeURIComponent(`Reserva confirmada en ${negocio}\n${servicio || ''}${profesional ? `\nCon: ${profesional}` : ''}${extra ? `\n\n${extra}` : ''}`)
  window.open(`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${titulo}&dates=${fmt(desde)}/${fmt(hasta)}&details=${detalles}&sf=true&output=xml`, '_blank')
}

export default function VistaPublica() {
  const showToast = useToast()
  const { id } = useParams()
  
  // --- CORE DATA STATE ---
  const [loading, setLoading] = useState(true)
  const [errorCarga, setErrorCarga] = useState(null)
  const [negocio, setNegocio] = useState(null)
  const [servicios, setServicios] = useState([])
  const [empleados, setEmpleados] = useState([])
  
  // --- CATÁLOGO PÚBLICO ---
  const [vistaActiva, setVistaActiva] = useState('reservas') // 'reservas' | 'catalogo'
  const [catalogo, setCatalogo] = useState([])
  const [catFiltro, setCatFiltro] = useState('todos')
  const [catBusqueda, setCatBusqueda] = useState('')
  // El carrito sobrevive a cerrar la pestaña (3 días): nadie quiere volver a
  // armar un pedido porque el navegador recargó la página.
  const [carrito, setCarrito] = usePersistentState(`publico:carrito:${id}`, {}, { ttl: TRES_DIAS, validar: esCarrito }) // { [prodId]: cantidad }
  const [productoDetalle, setProductoDetalle] = useState(null) // producto seleccionado para modal
  const [carritoAbierto, setCarritoAbierto] = useState(false) // drawer del carrito
  const [checkoutActivo, setCheckoutActivo] = useState(false) // paso final de checkout
  const [clienteCheckout, setClienteCheckout] = useState(() => {
    const c = leerCliente()
    return { nombre: c.nombre, telefono: c.telefono, notas: '' }
  })
  // "Tu próximo turno": se lee del teléfono del cliente al cargar el negocio.
  const [proximo, setProximo] = useState(null)
  
  // --- UI & FLOW STATE ---
  const [paso, setPaso] = useState(1)
  const [bioExpandida, setBioExpandida] = useState(false)
  // Los datos de contacto vienen precargados si ya reservó desde este
  // teléfono: nombre, WhatsApp y correo no se vuelven a tipear.
  const [reserva, setReserva] = useState(() => {
    const c = leerCliente()
    return {
      servicioId: null,
      empleadoId: null,
      fecha: '',
      hora: '',
      horaNextDay: false,
      clienteNombre: c.nombre,
      clienteTelefono: c.telefono,
      clienteEmail: c.email,
      campoExtra: ''
    }
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
      setErrorCarga(null)

      // `maybeSingle` en vez de `single`: un ID inexistente ya no tira error,
      // devuelve null y podemos mostrar una pantalla decente.
      const { data: biz, error } = await supabase
        .from('negocios')
        .select('*')
        .eq('id', id)
        .maybeSingle()

      if (error) throw error
      if (!biz) {
        setErrorCarga('no-encontrado')
        return
      }
      setNegocio(biz)
      setProximo(proximoTurnoEn(biz.id))

      const [resSrvs, resEmps, resCat] = await Promise.all([
        supabase.from('servicios').select('*').eq('negocio_id', id),
        supabase.from('empleados').select('*').eq('negocio_id', id),
        supabase.from('catalogo_productos').select('*').eq('negocio_id', id).eq('activo', true).order('orden').order('nombre')
      ])
      
      setServicios(resSrvs.data || [])
      // Sólo el personal activo recibe reservas. El panel promete que alguien
      // dado de baja "ya no recibe reservas nuevas", y antes igual aparecía
      // acá para elegir. Los registros viejos sin `estado` cuentan como activos.
      setEmpleados((resEmps.data || []).filter(e => (e.estado ?? 'activo') === 'activo'))
      setCatalogo(resCat.data || [])
      generarCalendarioPro(biz.horarios)
    } catch (e) {
      console.error('Error cargando la app de reservas:', e.message)
      setErrorCarga('conexion')
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
      // Miramos desde 8h antes del inicio del día: un turno largo de la noche
      // anterior también ocupa franjas de este día.
      const inicioDiaISO = new Date(selectedDayStart.getTime() - 8 * 3600000).toISOString()
      const finBusquedaISO = isOvernight
        ? new Date(year, month - 1, d + 1, 23, 59, 59, 999).toISOString()
        : new Date(year, month - 1, d, 23, 59, 59, 999).toISOString()

      let queryTurnos = supabase
        .from('turnos')
        .select('fecha_hora, estado, servicios(duracion_minutos)')
        .eq('negocio_id', negocio.id)
        .gte('fecha_hora', inicioDiaISO)
        .lte('fecha_hora', finBusquedaISO)

      // `.eq(col, null)` no filtra NULL en PostgREST. Sin este `.is`, un negocio
      // sin staff cargado nunca detectaba turnos ocupados y sobrevendía horarios.
      queryTurnos = reserva.empleadoId
        ? queryTurnos.eq('empleado_id', reserva.empleadoId)
        : queryTurnos.is('empleado_id', null)

      const { data: taken } = await queryTurnos

      // Convertir reservas existentes a "minutos desde medianoche del día seleccionado"
      const bookedIntervals = (taken || []).map(t => {
        // Los turnos cancelados o marcados como ausencia liberan el horario;
        // los atendidos ('completado') lo siguen ocupando.
        if (!ocupaHorario(t)) return null
        const bdDate = parseFecha(t.fecha_hora)
        if (!bdDate) return null

        // Minutos absolutos desde medianoche del día seleccionado (soporta día siguiente)
        const diffMs = bdDate.getTime() - selectedDayStart.getTime()
        const startMins = Math.round(diffMs / 60000)
        return { startMins, endMins: startMins + duracionTurno(t) }
      }).filter(Boolean)

      // No ofrecer horarios que ya pasaron (o que arrancan en menos de 15').
      const ahora = new Date()
      const esHoy = ahora.toDateString() === new Date(year, month - 1, d).toDateString()
      const minutosMinimos = esHoy
        ? Math.round((ahora.getTime() - selectedDayStart.getTime()) / 60000) + 15
        : -Infinity

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

        // Horario que ya pasó (o demasiado sobre la hora) en el día de hoy
        if (slotStart < minutosMinimos) return false

        // No puede exceder el horario de cierre (en minutos extendidos)
        if (slotEnd > closeMins) return false

        // No puede chocar con la pausa (corte) del día
        if (tienePausa && seSolapan(slotStart, slotEnd, inicioPausaMins, finPausaMins)) return false

        // Comprobar solapamiento con reservas existentes
        const hasOverlap = bookedIntervals.some(b => seSolapan(slotStart, slotEnd, b.startMins, b.endMins))

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
    } catch (e) {
      console.error('Error calculando horarios disponibles:', e?.message || e)
      setHorasDisponibles({ mañana: [], tarde: [], noche: [], madrugada: [] })
      showToast('No pudimos cargar los horarios. Revisá tu conexión.', 'error')
    } finally {
      setBuscandoHoras(false)
    }
  }

  async function submitBooking(e) {
    e.preventDefault()

    // ── Validación previa (antes se confiaba sólo en el `required` del HTML) ──
    const nombre = reserva.clienteNombre.trim()
    const telefono = reserva.clienteTelefono.trim()
    const email = reserva.clienteEmail.trim()
    const soloDigitos = telefono.replace(/[^0-9]/g, '')

    if (nombre.length < 2) return showToast('Escribí tu nombre completo.', 'error')
    if (soloDigitos.length < 6) return showToast('Revisá el número de WhatsApp: parece incompleto.', 'error')
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return showToast('El correo no tiene un formato válido.', 'error')
    }
    if (!reserva.servicioId || !reserva.fecha || !reserva.hora) {
      setPaso(1)
      return showToast('Volvé a elegir servicio, fecha y horario.', 'error')
    }

    setGuardando(true)
    try {
      // Empaquetado de hora local a UTC exacto (soporta horario nocturno cross-midnight)
      const [year, month, day] = reserva.fecha.split('-').map(Number)
      const [hour, minute] = reserva.hora.split(':').map(Number)
      const bookingDay = reserva.horaNextDay ? day + 1 : day
      const dateExacta = new Date(year, month - 1, bookingDay, hour, minute, 0)

      if (dateExacta.getTime() < Date.now() - 60000) {
        setPaso(3)
        showToast('Ese horario ya pasó. Elegí otro, por favor.', 'error')
        setGuardando(false)
        return
      }

      const fechaHoraISO = dateExacta.toISOString()

      // Prevención de double-booking considerando la DURACIÓN del servicio.
      // (El chequeo anterior comparaba sólo la hora exacta, así que un turno de
      // 60' a las 10:00 no impedía reservar otro a las 10:30.)
      const { ok, motivo } = await verificarDisponibilidad(supabase, {
        negocioId: negocio.id,
        empleadoId: reserva.empleadoId,
        inicio: dateExacta,
        duracionMin: servicios.find(x => x.id === reserva.servicioId)?.duracion_minutos || 30,
      })

      if (!ok) {
        showToast(motivo, 'error')
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
        cliente_nombre: nombre,
        cliente_telefono: telefono,
        cliente_email: email,
        fecha_hora: fechaHoraISO,
        estado: 'confirmado'
      }

      // Solo agregar notas si el campo extra tiene valor (evita errores si la columna no existe)
      if (reserva.campoExtra) {
        payload.notas = `${vocab.campoExtraLabel || 'Extra'}: ${reserva.campoExtra}`
      }

      const { error } = await supabase.from('turnos').insert([payload])

      if (error) {
        // 23505 = choque con el índice único que impide dos turnos en la misma
        // franja (ver sql/2026-09-20_seguridad_y_reservas.sql).
        if (error.code === '23505') {
          showToast('Ese horario acaba de ocuparse. Elegí otro, por favor.', 'error')
          setPaso(3)
          const diaActual = diasCalendario.find(d => d.full === reserva.fecha)
          if (diaActual) handleDateSelect(diaActual)
          return
        }
        throw error
      }

      // Quedan en el teléfono del cliente: la próxima vez no tipea sus datos
      // y al volver al link ve su turno arriba de todo.
      recordarCliente({ nombre, telefono, email })
      const servicioElegido = servicios.find(x => x.id === reserva.servicioId)
      const turnoGuardado = {
        negocioId: negocio.id,
        negocio: negocio.nombre,
        servicio: servicioElegido?.nombre || '',
        profesional: empleados.find(x => x.id === reserva.empleadoId)?.nombre || '',
        inicio: fechaHoraISO,
        duracion: servicioElegido?.duracion_minutos || 30,
      }
      recordarTurno(turnoGuardado)
      setProximo(proximoTurnoEn(negocio.id))
      setPaso(5)

    } catch (err) {
      console.error('Error al reservar:', err?.message || err)
      showToast('No pudimos confirmar la reserva. Revisá tu conexión y reintentá.', 'error')
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

  // Si el negocio no cargó staff, el paso 2 no tiene nada que mostrar: antes
  // el cliente quedaba en una pantalla vacía sin poder avanzar.
  const requiereStaff = empleados.length > 0
  const pasoTrasServicio = requiereStaff ? 2 : 3

  // Helper: nombre del servicio seleccionado
  const servicioSeleccionado = servicios.find(s => s.id === reserva.servicioId)
  const empleadoSeleccionado = empleados.find(e => e.id === reserva.empleadoId)

  if (loading) return (
    <div className="min-h-dvh bg-[#FEFDFD] flex items-center justify-center" style={{ background: 'var(--ns-gradient-soft)' }}>
      <div className="flex flex-col items-center gap-4">
        <span className="ui-pod ui-pod--brand ui-pod--lg ns-breathe">
          <span className="font-display text-2xl font-bold">N</span>
        </span>
        <div className="flex gap-1.5">
          {[0, 1, 2].map(i => (
            <span key={i} className="ns-typing-dot" style={{ animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
      </div>
    </div>
  )

  // Link inválido o error de red: antes esto dejaba la pantalla en blanco
  // porque más abajo se leía `negocio.color_primario` sobre un null.
  if (!negocio) {
    const esNoEncontrado = errorCarga === 'no-encontrado'
    return (
      <div className="min-h-dvh flex items-center justify-center p-6 font-sans" style={{ background: 'var(--ns-gradient-soft)' }} data-testid="public-error">
        <div className="text-center max-w-sm">
          <span className="ui-pod ui-pod--lg mx-auto mb-5" style={{ width: 76, height: 76 }}>
            <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
              <path d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <h2 className="ui-head__title text-xl mb-2 justify-center" style={{ color: 'var(--ns-text)' }}>
            {esNoEncontrado ? 'No encontramos este negocio' : 'No pudimos cargar la página'}
          </h2>
          <p className="text-sm font-medium mb-6 leading-relaxed" style={{ color: 'var(--ns-text-secondary)' }}>
            {esNoEncontrado
              ? 'El link puede estar mal escrito o el negocio ya no está disponible. Pedile el link actualizado al negocio.'
              : 'Parece un problema de conexión. Probá de nuevo en unos segundos.'}
          </p>
          {!esNoEncontrado && (
            <button onClick={() => bootBrandedApp()} className="ui-btn ui-btn--primary">Reintentar</button>
          )}
        </div>
      </div>
    )
  }

  // Negocio sin acceso (prueba vencida o suspendido) — vista pública bloqueada
  if (negocio && !getEstadoSuscripcion(negocio).acceso) {
    return (
      <div className="min-h-dvh flex items-center justify-center p-6 font-sans" style={{ background: 'var(--ns-gradient-soft)' }}>
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 mx-auto mb-5 rounded-2xl flex items-center justify-center shadow-xl" style={{ background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.6)' }}>
            <svg className="w-9 h-9" style={{ color: 'var(--ns-primary, #4A9CFF)', opacity: 0.5 }} fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <h2 className="text-xl font-bold tracking-tight mb-2" style={{ color: 'var(--ns-text)' }}>Servicio no disponible</h2>
          <p className="text-sm font-medium" style={{ color: 'var(--ns-text-muted)' }}>Este negocio no está aceptando reservas en este momento. Intente más tarde.</p>
        </div>
      </div>
    )
  }

  // Variables Dinámicas del Motor de Tematización
  const accent = negocio.color_primario || '#007AFF'
  const accentUltraSoft = hexToRgba(accent, 0.04) 
  const accentGlow = hexToRgba(accent, 0.3)
  const accentDark = hexToRgba(accent, 0.85)

  // Los precios del catálogo ya usaban toLocaleString pero los de los
  // servicios salían crudos ("$8000" en vez de "$8.000") en la misma pantalla.
  const precio = (valor) => `$${Number(valor || 0).toLocaleString('es-AR')}`

  // Sólo embebemos mapas de Google (el campo lo escribe el dueño del negocio).
  const mapaUrlSegura = mapaEmbedUrl(negocio.mapa_url, negocio.direccion)

  // Vocabulario dinámico según rubro
  const vocab = getVocabulario(negocio.rubro)
  // Cada rubro define su propio dato extra (comensales, modelo del auto, idea
  // del tatuaje). Antes sólo se mostraba para gastronomía y el resto de los
  // rubros perdía ese dato aunque lo tuvieran configurado.
  const pideCampoExtra = Boolean(vocab.campoExtra)

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
    <div className="booking-shell min-h-screen text-[#1D212A] font-sans antialiased relative overflow-x-hidden" style={{ paddingBottom: 'calc(80px + env(safe-area-inset-bottom, 0px))', colorScheme: 'light', background: 'transparent' }}>
      
      {/* BAÑO DE COLOR (Sutil resplandor de fondo — marca lilac) */}
      {/* Luz del acento del negocio: tiñe el campo ambiental arriba, así el
          vidrio de la ficha toma el color de la marca. */}
      <div className="absolute top-0 inset-x-0 h-[70vh] pointer-events-none z-0" style={{ background: `radial-gradient(70% 60% at 50% 0%, ${hexToRgba(accent, 0.28)}, transparent 70%)` }}></div>

      {/* 1. HERO & BRANDING SECTION — Más compacto en mobile con glass overlay */}
      <header
        className={`relative w-full overflow-hidden z-10 ${negocio.portada_url ? 'h-[28vh] md:h-[30vh]' : 'h-[132px] md:h-[164px]'}`}
        style={{ background: 'var(--ns-gradient-1)' }}
      >
         {negocio.portada_url ? (
           <>
             <img src={negocio.portada_url} className="w-full h-full object-cover animate-in fade-in duration-1000" alt="Cover" />
             <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/20"></div>
           </>
         ) : (
           <>
             <div className="w-full h-full absolute inset-0" style={{ background: 'var(--ns-gradient-1)' }}></div>
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
               
               <span className="text-[8px] md:text-[9px] font-bold uppercase tracking-[0.08em] mb-0.5 md:mb-1" style={{ color: 'var(--ns-primary)' }}>{negocio.rubro}</span>
               <h1 className="text-xl md:text-2xl font-bold tracking-tight leading-tight mb-1" style={{ color: 'var(--ns-text)' }}>{negocio.nombre}</h1>
               
               {negocio.instagram && (
                 <a 
                   href={`https://instagram.com/${negocio.instagram.replace('@', '')}`} 
                   target="_blank" 
                   rel="noopener noreferrer" 
                   className="mb-2 md:mb-4 flex items-center gap-1.5 px-3 py-1 md:py-1.5 rounded-full transition-all active:scale-95 brand-pill-hover"
                   style={{ backgroundColor: accentUltraSoft, color: accentDark }}
                 >
                    <svg className="w-3 h-3 md:w-3.5 md:h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
                    <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-[0.06em]">{negocio.instagram.replace('@', '')}</span>
                 </a>
               )}
               
               {negocio.descripcion && (
                 <>
                   <div
                     className={`relative overflow-hidden transition-[max-height] duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] w-full px-1 md:px-2 ${bioExpandida ? 'max-h-[500px]' : 'max-h-[40px]'}`}
                     style={bioExpandida ? undefined : { WebkitMaskImage: 'linear-gradient(to bottom, #000 45%, transparent)', maskImage: 'linear-gradient(to bottom, #000 45%, transparent)' }}
                   >
                      <p className="text-[12px] md:text-[13px] font-medium leading-relaxed text-balance" style={{ color: 'var(--ns-text-muted)' }}>
                         {negocio.descripcion}
                      </p>
                   </div>
                   <button 
                     onClick={() => setBioExpandida(!bioExpandida)} 
                     className="mt-2 md:mt-3 text-[8px] md:text-[9px] font-bold px-3 md:px-4 py-1 md:py-1.5 rounded-full uppercase tracking-[0.06em] transition-colors active:scale-95"
                     style={{ color: 'var(--ns-primary)', backgroundColor: 'var(--ns-primary-bg)' }}
                   >
                      {bioExpandida ? 'Ocultar info' : 'Leer más'}
                   </button>
                 </>
               )}
            </div>

            {/* TOGGLE RESERVAS / CATÁLOGO */}
            {catalogo.length > 0 && paso < 5 && (
              <div className="mt-3 flex rounded-2xl p-1 gap-0.5" style={{ background: 'var(--ns-primary-bg)', boxShadow: 'inset 0 2px 4px rgba(16,24,40,0.04), 0 1px 0 rgba(255,255,255,0.6)' }}>
                <button onClick={() => setVistaActiva('reservas')} className={`flex-1 py-2.5 rounded-xl text-[9px] font-bold uppercase tracking-[0.06em] transition-all ${vistaActiva === 'reservas' ? 'text-white' : ''}`} style={vistaActiva === 'reservas' ? { background: 'var(--ns-primary)', boxShadow: '0 3px 0 rgba(16,24,40,0.08), 0 6px 12px rgba(0,122,255,0.2), inset 0 1px 0 rgba(255,255,255,0.3)', textShadow: '0 1px 1px rgba(16,24,40,0.1)' } : {}}>
                  {vocab.paso1Titulo || 'Reservas'}
                </button>
                <button onClick={() => setVistaActiva('catalogo')} className={`flex-1 py-2.5 rounded-xl text-[9px] font-bold uppercase tracking-[0.06em] transition-all ${vistaActiva === 'catalogo' ? 'text-white' : ''}`} style={vistaActiva === 'catalogo' ? { background: 'var(--ns-primary)', boxShadow: '0 3px 0 rgba(16,24,40,0.08), 0 6px 12px rgba(0,122,255,0.2), inset 0 1px 0 rgba(255,255,255,0.3)', textShadow: '0 1px 1px rgba(16,24,40,0.1)' } : {}}>
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
               <button onClick={() => setPaso(1)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-wider border active:scale-95 transition-all" style={{ background: 'var(--ns-surface)', borderColor: 'var(--ns-border)', color: 'var(--ns-text)', boxShadow: '0 2px 0 rgba(16,24,40,0.03), 0 4px 8px rgba(0,122,255,0.04), inset 0 1px 0 rgba(255,255,255,0.8)' }}>
                 <div className="w-4 h-4 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--ns-primary-bg)' }}>
                   <svg className="w-2.5 h-2.5" style={{ color: 'var(--ns-primary)' }} fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round"/></svg>
                 </div>
                 {servicioSeleccionado.nombre}
               </button>
             )}
             {empleadoSeleccionado && paso >= 3 && (
               <button onClick={() => setPaso(2)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-wider border active:scale-95 transition-all" style={{ background: 'var(--ns-surface)', borderColor: 'var(--ns-border)', color: 'var(--ns-text)', boxShadow: '0 2px 0 rgba(16,24,40,0.03), 0 4px 8px rgba(0,122,255,0.04), inset 0 1px 0 rgba(255,255,255,0.8)' }}>
                 <div className="w-4 h-4 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--ns-primary-bg)' }}>
                   <svg className="w-2.5 h-2.5" style={{ color: 'var(--ns-primary)' }} fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round"/></svg>
                 </div>
                 {empleadoSeleccionado.nombre.split(' ')[0]}
               </button>
             )}
             {reserva.fecha && paso >= 4 && (
               <button onClick={() => setPaso(3)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-wider border active:scale-95 transition-all" style={{ background: 'var(--ns-surface)', borderColor: 'var(--ns-border)', color: 'var(--ns-text)', boxShadow: '0 2px 0 rgba(16,24,40,0.03), 0 4px 8px rgba(0,122,255,0.04), inset 0 1px 0 rgba(255,255,255,0.8)' }}>
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
                 <span className="text-[8px] md:text-[9px] font-bold uppercase tracking-[0.08em]" style={{ color: 'var(--ns-primary)' }}>Progreso de reserva</span>
                 <span className="text-[9px] md:text-[10px] font-bold" style={{ color: 'var(--ns-text)' }}>{requiereStaff ? paso : paso - 1} / {requiereStaff ? 4 : 3}</span>
              </div>
              <div className="flex gap-1 md:gap-1.5">
                 {(requiereStaff ? [1,2,3,4] : [1,3,4]).map(p => (
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
                {proximo && (
                  <motion.div
                    className="ns-glass-card ns-proximo"
                    initial={{ opacity: 0, y: 12, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                    data-testid="public-proximo-turno"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="ns-proximo__fecha" aria-hidden="true">
                        <span>{new Date(proximo.inicio).toLocaleDateString('es-AR', { month: 'short' }).replace('.', '')}</span>
                        <b>{new Date(proximo.inicio).getDate()}</b>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.06em]" style={{ color: 'var(--ns-primary)' }}>Tu próximo turno</p>
                        <p className="text-[17px] font-bold tracking-tight leading-snug" style={{ color: 'var(--ns-text)' }}>
                          {cuandoEs(proximo.inicio)} · {new Date(proximo.inicio).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })} hs
                        </p>
                        <p className="text-[13px] font-medium truncate" style={{ color: 'var(--ns-text-muted)' }}>
                          {[proximo.servicio, proximo.profesional && `con ${proximo.profesional}`].filter(Boolean).join(' ')}
                        </p>
                      </div>
                    </div>
                    <div className={`grid gap-2 mt-3.5 ${negocio.telefono ? 'grid-cols-2' : 'grid-cols-1'}`}>
                      <button
                        type="button"
                        className="ui-btn ui-btn--quiet min-w-0 px-3"
                        onClick={() => abrirEnCalendario({ ...proximo, negocio: negocio.nombre })}
                      >
                        Al calendario
                      </button>
                      {negocio.telefono && (
                        <a
                          className="ui-btn ui-btn--quiet min-w-0 px-3"
                          href={`https://wa.me/${negocio.telefono.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hola ${negocio.nombre}, tengo un turno el ${new Date(proximo.inicio).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })} a las ${new Date(proximo.inicio).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })} y necesito hacer un cambio.`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Pedir cambio
                        </a>
                      )}
                    </div>
                  </motion.div>
                )}
                <h2 className="text-base md:text-lg font-bold tracking-tight px-1" style={{ color: 'var(--ns-text)' }}>{vocab.paso1Titulo}</h2>
                {servicios.length === 0 ? (
                  <div className="nh-card" data-testid="public-sin-servicios">
                     <div className="ui-empty">
                       <span className="ui-pod ui-pod--sunken ui-pod--lg">
                         <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round"/></svg>
                       </span>
                       <p className="ui-empty__title">Todavía no hay {vocab.servicios} para reservar</p>
                       <p className="ui-empty__text">
                         {negocio.nombre} está terminando de configurar su agenda online.
                         {negocio.telefono ? ' Mientras tanto podés escribirles directo.' : ' Probá de nuevo más tarde.'}
                       </p>
                       {negocio.telefono && (
                         <a
                           href={`https://wa.me/${negocio.telefono.replace(/[^0-9]/g, '')}`}
                           target="_blank" rel="noopener noreferrer"
                           className="ui-btn ui-btn--primary mt-1"
                         >
                           Escribir por WhatsApp
                         </a>
                       )}
                     </div>
                  </div>
                ) : (
                <div className="nh-card overflow-hidden">
                   {servicios.map((s) => (
                     <button 
                        key={s.id} 
                        onClick={() => { setReserva(prev => ({ ...prev, servicioId: s.id, hora: '', horaNextDay: false })); setPaso(pasoTrasServicio) }} 
                        className="ns-public-service-item"
                     >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                           <div className="ns-public-service-ic">
                               {vocab.usarIconoCustom ? (
                                 <svg className="w-4 h-4 md:w-5 md:h-5" viewBox="0 0 24 24" fill="currentColor"><path d={vocab.iconoServicio}/></svg>
                               ) : (
                                 <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d={vocab.iconoServicio} strokeLinecap="round" strokeLinejoin="round"/></svg>
                               )}
                           </div>
                           <div className="min-w-0">
                              <p className="font-bold text-[14px] md:text-[15px] tracking-tight leading-none truncate" style={{ color: 'var(--ns-text)' }}>{s.nombre}</p>
                              <p className="text-[9px] md:text-[10px] font-bold uppercase tracking-[0.08em] mt-1" style={{ color: 'var(--ns-text-muted)' }}>{s.duracion_minutos} min</p>
                           </div>
                        </div>
                        <div className="flex items-center gap-2.5 shrink-0 ml-3">
                           <span className="font-semibold text-base md:text-lg tracking-tight tabular-nums" style={{ color: 'var(--ns-text)' }}>{precio(s.precio)}</span>
                           <svg className="w-3 h-3 md:w-3.5 md:h-3.5 group-hover:translate-x-1 transition-transform" style={{ color: 'var(--ns-primary)' }} fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg>
                        </div>
                     </button>
                   ))}
                </div>
                )}
              </section>
            )}

            {/* --- PASO 2: STAFF --- */}
            {paso === 2 && (
              <section className="animate-in slide-in-from-bottom-6 fade-in zoom-in-[0.98] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] space-y-3 md:space-y-4">
                <div className="flex items-center justify-between px-1">
                   <h2 className="text-base md:text-lg font-bold tracking-tight" style={{ color: 'var(--ns-text)' }}>{vocab.paso2Titulo}</h2>
                   <button onClick={() => setPaso(1)} className="ui-btn ui-btn--quiet">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7"/></svg> {vocab.paso2Volver}
                   </button>
                </div>
                <div className="grid grid-cols-2 gap-2.5 md:gap-3">
                   {empleados.map(e => (
                     <button 
                        key={e.id} 
                        onClick={() => { setReserva(prev => ({ ...prev, empleadoId: e.id, hora: '', horaNextDay: false })); setPaso(3) }} 
                        className="ns-public-employee-card"
                     >
                        <span className="ui-pod ui-pod--lg rounded-full overflow-hidden p-0 w-16 h-16">
                           {e.foto_url
                             ? <img src={e.foto_url} alt="" className="w-full h-full object-cover" />
                             : <span className="font-display text-2xl font-bold">{e.nombre.charAt(0)}</span>}
                        </span>
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
                   <h2 className="text-base md:text-lg font-bold tracking-tight" style={{ color: 'var(--ns-text)' }}>Fecha y horario</h2>
                   <button onClick={() => setPaso(requiereStaff ? 2 : 1)} className="ui-btn ui-btn--quiet">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7"/></svg> {requiereStaff ? vocab.paso3Volver : vocab.paso2Volver}
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
                        className="ui-icon-btn w-10 h-10 disabled:opacity-35 disabled:cursor-not-allowed"
                        style={{ color: accent, borderColor: 'var(--ns-border)', background: 'var(--ns-surface)' }}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="m15 18-6-6 6-6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </button>
                      <p className="text-[9px] md:text-[10px] font-bold uppercase tracking-[0.07em] text-center" style={{ color: 'var(--ns-text-muted)' }}>
                        {diasCalendario[calendarWindowStart]?.month || 'Próximas fechas'}
                      </p>
                      <button
                        type="button"
                        aria-label="Ver fechas siguientes"
                        disabled={calendarWindowStart + 7 >= diasCalendario.length}
                        onClick={() => setCalendarWindowStart((start) => Math.min(Math.max(0, diasCalendario.length - 1), start + 7))}
                        className="ui-icon-btn w-10 h-10 disabled:opacity-35 disabled:cursor-not-allowed"
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
                            className="relative w-full h-[4.35rem] md:h-[4.8rem] rounded-[20px] flex flex-col items-center justify-center transition-all duration-300 disabled:cursor-not-allowed"
                            style={!d.available
                              ? { background: 'var(--ns-sunken)', boxShadow: 'var(--ui-field-sm)', color: 'var(--ns-text-faint)', opacity: 0.55 }
                              : isSelected
                              ? { background: accent, color: 'var(--ns-paper)', boxShadow: 'var(--ui-brand)', transform: 'translateY(-2px)' }
                              : { background: 'var(--ns-surface)', color: 'var(--ns-text)', boxShadow: d.isToday ? 'var(--ui-shadow-sm), inset 0 0 0 2px ' + accent : 'var(--ui-shadow-sm)' }}
                          >
                            {d.isNewMonth && <span className="absolute top-1.5 right-2 text-[7px] font-bold tracking-wider" style={{ opacity: 0.55 }}>{d.month.slice(0, 3)}</span>}
                            <span className="text-[8px] md:text-[9px] font-bold uppercase mb-0.5 md:mb-1" style={{ opacity: 0.7 }}>{d.weekday}</span>
                            <span className="font-display text-lg md:text-xl font-bold tracking-tight">{d.number}</span>
                          </button>
                        )
                      })}
                   </div>

                   {reserva.fecha && (
                     <div className="pt-4 mt-3 ns-fade-up" style={{ boxShadow: 'inset 0 1px 0 var(--ns-line)' }}>
                        {buscandoHoras ? (
                          <div className="flex justify-center py-8"><span className="ui-spinner ui-spinner--sm" role="status" aria-label="Buscando horarios" /></div>
                        ) : (
                          <div className="space-y-4 md:space-y-5 mt-2 md:mt-4">
                             {['mañana', 'tarde', 'noche', 'madrugada'].map(periodo => (
                               horasDisponibles[periodo].length > 0 && (
                                 <div key={periodo} className="space-y-1.5 md:space-y-2">
                                    <p className="text-[8px] md:text-[9px] font-bold uppercase tracking-[0.08em] px-1" style={{ color: accentGlow }}>{periodo}</p>
                                    <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                                       {horasDisponibles[periodo].map(h => {
                                         const slotTime = typeof h === 'string' ? h : h.time;
                                         const slotNextDay = typeof h === 'string' ? false : h.nextDay;
                                         const isSelected = reserva.hora === slotTime && reserva.horaNextDay === slotNextDay;
                                         return (
                                         <button 
                                            key={slotTime + (slotNextDay ? '-nd' : '')} 
                                            onClick={() => setReserva(prev => ({ ...prev, hora: slotTime, horaNextDay: slotNextDay }))} 
                                            className="py-3 rounded-[16px] text-[13px] font-bold tabular-nums transition-all duration-200"
                                            style={isSelected
                                              ? { background: accent, color: 'var(--ns-paper)', boxShadow: 'var(--ui-brand)', transform: 'translateY(-2px)' }
                                              : { background: 'var(--ns-surface)', color: 'var(--ns-text)', boxShadow: 'var(--ui-shadow-sm)' }}
                                         >
                                            {slotTime}
                                         </button>
                                         );
                                       })}
                                    </div>
                                 </div>
                               )
                             ))}
                             {horasDisponibles.mañana.length === 0 && horasDisponibles.tarde.length === 0 && horasDisponibles.noche.length === 0 && horasDisponibles.madrugada.length === 0 && (
                               <div className="ui-well text-center py-7">
                                 <p className="ui-empty__title">No quedan horarios este día</p>
                                 <p className="ui-empty__text mx-auto mt-1">Probá con otra fecha del calendario de arriba.</p>
                               </div>
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
                   <h2 className="text-base md:text-lg font-bold tracking-tight" style={{ color: 'var(--ns-text)' }}>{vocab.paso4Titulo}</h2>
                   <button onClick={() => setPaso(3)} className="ui-btn ui-btn--quiet">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7"/></svg> {vocab.paso4Volver}
                   </button>
                </div>
                
                <form id="reservaForm" onSubmit={submitBooking} className="space-y-3 md:space-y-4">
                   <div className="ns-public-form-card">
                      
                      <div className="space-y-1">
                         <label className="text-[8px] md:text-[9px] font-bold uppercase tracking-[0.06em] ml-1" style={{ color: 'var(--ns-primary)' }}>Nombre completo</label>
                         <div className="ns-input-wrapper">
                            <div className="ns-input-icon"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" strokeLinecap="round" strokeLinejoin="round"/></svg></div>
                            <input required autoComplete="name" className="ns-input" placeholder="Ej. Pablo Pérez" value={reserva.clienteNombre} onChange={(e) => setReserva(prev => ({ ...prev, clienteNombre: e.target.value }))} />
                         </div>
                      </div>

                      <div className="space-y-1">
                         <label className="text-[8px] md:text-[9px] font-bold uppercase tracking-[0.06em] ml-1" style={{ color: 'var(--ns-primary)' }}>WhatsApp</label>
                         <div className="ns-input-wrapper">
                            <div className="ns-input-icon"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" strokeLinecap="round" strokeLinejoin="round"/></svg></div>
                            <input required type="tel" inputMode="tel" autoComplete="tel" className="ns-input" placeholder="351 000 0000" value={reserva.clienteTelefono} onChange={(e) => setReserva(prev => ({ ...prev, clienteTelefono: e.target.value }))} />
                         </div>
                      </div>

                      <div className="space-y-1">
                         <label className="text-[8px] md:text-[9px] font-bold uppercase tracking-[0.06em] ml-1" style={{ color: 'var(--ns-primary)' }}>Correo electrónico <span style={{ color: 'var(--ns-text-muted)' }}>· opcional</span></label>
                         <div className="ns-input-wrapper">
                            <div className="ns-input-icon"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round"/></svg></div>
                            <input type="email" autoComplete="email" className="ns-input" placeholder="correo@ejemplo.com" value={reserva.clienteEmail} onChange={(e) => setReserva(prev => ({ ...prev, clienteEmail: e.target.value }))} />
                         </div>
                      </div>
                      
                      {pideCampoExtra && (
                        <div className="space-y-1">
                          <label className="text-[8px] md:text-[9px] font-bold uppercase tracking-[0.06em] ml-1" style={{ color: 'var(--ns-primary)' }}>{vocab.campoExtraLabel || 'Dato adicional'}</label>
                          <div className="ns-input-wrapper">
                             <div className="ns-input-icon"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" strokeLinecap="round" strokeLinejoin="round"/></svg></div>
                             <input
                               type={vocab.campoExtraTipo === 'number' ? 'number' : 'text'}
                               min={vocab.campoExtraTipo === 'number' ? 1 : undefined}
                               max={vocab.campoExtraTipo === 'number' ? 50 : undefined}
                               inputMode={vocab.campoExtraTipo === 'number' ? 'numeric' : 'text'}
                               required
                               className="ns-input"
                               placeholder={vocab.campoExtraPlaceholder || ''}
                               value={reserva.campoExtra}
                               onChange={(e) => setReserva(prev => ({ ...prev, campoExtra: e.target.value }))}
                             />
                          </div>
                        </div>
                      )}
                   </div>

                   {/* TICKET VIP DEGRADADO */}
                   <div className="ns-public-ticket">
                      <div className="relative z-10 flex justify-between items-center">
                         <div className="space-y-0.5">
                            <p className="text-[8px] md:text-[9px] font-bold opacity-60 uppercase tracking-[0.09em] mb-0.5 md:mb-1 text-white">{vocab.ticketTitulo}</p>
                            <p className="text-xl md:text-2xl font-bold tracking-tight">{reserva.fecha.split('-').reverse().join('/')}</p>
                            <p className="text-sm md:text-base font-medium opacity-90">{reserva.hora} HS</p>
                         </div>
                         <div className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/20 shadow-inner">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round"/></svg>
                         </div>
                      </div>
                      {servicioSeleccionado && (
                        <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between">
                          <span className="text-[9px] font-bold text-white/60 uppercase tracking-[0.06em]">{servicioSeleccionado.nombre}</span>
                          <span className="text-sm font-bold text-white">{precio(servicioSeleccionado.precio)}</span>
                        </div>
                      )}
                      {reserva.campoExtra && (
                         <div className="mt-2 pt-2 border-t border-white/10 flex items-center justify-between">
                           <span className="text-[9px] font-bold text-white/60 uppercase tracking-[0.06em]">{vocab.campoExtraLabel || 'Dato adicional'}</span>
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
                {/* La gota de confirmación cae con un resorte, suelta dos ondas
                    y el tilde se dibuja adentro: la reserva "aterriza". */}
                <motion.div
                   className="ns-exito"
                   initial={{ scale: 0.3, opacity: 0, y: -24 }}
                   animate={{ scale: 1, opacity: 1, y: 0 }}
                   transition={{ type: 'spring', stiffness: 360, damping: 17, mass: 0.9 }}
                >
                   <span className="ns-exito__onda" aria-hidden="true" />
                   <span className="ns-exito__onda ns-exito__onda--2" aria-hidden="true" />
                   <svg className="w-9 h-9 md:w-11 md:h-11" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24" aria-hidden="true">
                     <motion.path
                       d="M5 13l4 4L19 7"
                       strokeLinecap="round"
                       strokeLinejoin="round"
                       initial={{ pathLength: 0 }}
                       animate={{ pathLength: 1 }}
                       transition={{ delay: 0.28, duration: 0.42, ease: [0.32, 0.72, 0, 1] }}
                     />
                   </svg>
                </motion.div>
                 <div className="space-y-1.5 px-2">
                   <h3 className="text-2xl md:text-3xl font-bold tracking-tight" style={{ color: 'var(--ns-text)' }}>{vocab.exitoTitulo}</h3>
                   <p className="text-xs md:text-sm font-medium leading-relaxed max-w-[260px] mx-auto text-balance" style={{ color: 'var(--ns-text-muted)' }}>
                     {vocab.exitoMensaje} <b style={{ color: 'var(--ns-text)' }}>{reserva.fecha.split('-').reverse().join('/')}</b> a las <b style={{ color: 'var(--ns-text)' }}>{reserva.hora} hs</b> {vocab.exitoMensaje2}
                   </p>
                </div>

                {/* Resumen final */}
                <div className="ns-public-summary-card">
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] font-bold uppercase tracking-[0.06em]" style={{ color: 'var(--ns-text-muted)' }}>{vocab.servicio.charAt(0).toUpperCase() + vocab.servicio.slice(1)}</span>
                    <span className="text-xs font-bold" style={{ color: 'var(--ns-text)' }}>{servicioSeleccionado?.nombre}</span>
                  </div>
                  <div className="h-px" style={{ background: 'var(--ns-border)' }}></div>
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] font-bold uppercase tracking-[0.06em]" style={{ color: 'var(--ns-text-muted)' }}>{vocab.empleado.charAt(0).toUpperCase() + vocab.empleado.slice(1)}</span>
                    <span className="text-xs font-bold" style={{ color: 'var(--ns-text)' }}>{empleadoSeleccionado?.nombre}</span>
                  </div>
                  <div className="h-px" style={{ background: 'var(--ns-border)' }}></div>
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] font-bold uppercase tracking-[0.06em]" style={{ color: 'var(--ns-text-muted)' }}>Precio</span>
                    <span className="text-xs font-bold" style={{ color: 'var(--ns-text)' }}>{precio(servicioSeleccionado?.precio)}</span>
                  </div>
                </div>

                {/* ACTION BUTTONS — Add to Calendar + WhatsApp */}
                <div className="flex flex-col gap-2.5 px-4 max-w-[300px] mx-auto w-full">
                  {/* Add to Google Calendar */}
                  <button 
                    onClick={() => {
                      const [yr, mo, dy] = reserva.fecha.split('-').map(Number)
                      const [hr, mn] = reserva.hora.split(':').map(Number)
                      abrirEnCalendario({
                        inicio: new Date(yr, mo - 1, reserva.horaNextDay ? dy + 1 : dy, hr, mn, 0),
                        duracion: servicioSeleccionado?.duracion_minutos || 30,
                        servicio: servicioSeleccionado?.nombre,
                        profesional: empleadoSeleccionado?.nombre,
                        negocio: negocio.nombre,
                        extra: `Precio: ${precio(servicioSeleccionado?.precio)}`,
                      })
                    }}
                    className="ns-cta-primary"
                    style={{}}
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zM9 14H7v-2h2v2zm4 0h-2v-2h2v2zm4 0h-2v-2h2v2zm-8 4H7v-2h2v2zm4 0h-2v-2h2v2zm4 0h-2v-2h2v2z"/></svg>
                    Agregar al calendario
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
                   <button onClick={() => window.location.reload()} className="text-[9px] md:text-[10px] font-bold uppercase tracking-[0.08em] px-6 py-2.5 rounded-full active:scale-95 transition-all" style={{ backgroundColor: 'var(--ns-primary-bg)', color: 'var(--ns-primary)', boxShadow: '0 2px 0 rgba(16,24,40,0.04), 0 4px 12px rgba(0,122,255,0.1), inset 0 1px 0 rgba(255,255,255,0.7)' }}>{vocab.nuevaReservaBtn}</button>
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
                     <button onClick={() => setCatFiltro('todos')} className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-[0.06em] border shrink-0 transition-all active:scale-95 ${catFiltro === 'todos' ? 'text-white border-transparent shadow-md' : ' border-transparent  hover:'}`} style={catFiltro === 'todos' ? { backgroundColor: 'var(--ns-primary)' } : {}}>Todos</button>
                     {cats.map(c => (
                       <button key={c} onClick={() => setCatFiltro(c)} className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-[0.06em] border shrink-0 transition-all active:scale-95 ${catFiltro === c ? 'text-white border-transparent shadow-md' : ' border-transparent  hover:'}`} style={catFiltro === c ? { backgroundColor: 'var(--ns-primary)' } : {}}>{c}</button>
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
                 <div className="ns-glass-card rounded-[2rem] p-12 text-center">
                   <div className="ui-pod ui-pod--sunken ui-pod--lg mx-auto mb-4">
                     <svg className="w-8 h-8" style={{ color: 'var(--ns-text-faint)' }} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>
                   </div>
                   <h3 className="font-display text-lg font-bold mb-1" style={{ color: 'var(--ns-text)' }}>Sin resultados</h3>
                   <p className="text-sm font-medium" style={{ color: 'var(--ns-text-muted)' }}>No encontramos productos con esos filtros.</p>
                 </div>
               )

               return (
                 <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-5">
                   {filtered.map(prod => {
                     const qty = carrito[prod.id] || 0
                     return (
                       <div key={prod.id} className="ns-glass-card rounded-[1.5rem] md:rounded-[2rem] overflow-hidden transition-all duration-300 hover:shadow-[0_8px_30px_rgba(16,24,40,0.08)] hover:-translate-y-1 flex flex-col group cursor-pointer" onClick={() => setProductoDetalle(prod)}>
                         {/* IMAGEN DEL PRODUCTO */}
                         <div className="aspect-[4/4] w-full  relative overflow-hidden shrink-0">
                           {prod.imagen_url ? (
                             <img src={prod.imagen_url} alt={prod.nombre} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                           ) : (
                             <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: 'var(--ns-primary-bg)' }}>
                               <svg className="w-10 h-10 md:w-12 md:h-12" style={{ color: 'var(--ns-primary)', opacity: 0.3 }} fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round"/></svg>
                             </div>
                           )}
                           {/* Badge Categoría */}
                           <div className="absolute top-3 left-3 px-2 py-1 bg-white/90 backdrop-blur-md rounded-lg shadow-sm border border-white/20">
                             <span className="text-[8px] md:text-[9px] font-bold uppercase tracking-[0.06em]" style={{ color: 'var(--ns-primary)' }}>{prod.categoria}</span>
                           </div>
                         </div>
                         
                         {/* INFO DEL PRODUCTO */}
                         <div className="p-4 md:p-5 flex flex-col flex-1">
                           <h4 className="text-[14px] md:text-[16px] font-bold leading-tight mb-1 line-clamp-2" style={{ color: 'var(--ns-text)' }}>{prod.nombre}</h4>
                           {prod.descripcion && <p className="text-[11px] md:text-[12px] font-medium line-clamp-2 mb-3" style={{ color: 'var(--ns-text-muted)' }}>{prod.descripcion}</p>}
                           
                           <div className="mt-auto flex items-end justify-between gap-2 pt-2">
                             <div>
                               {prod.precio > 0 ? (
                                 <p className="text-lg md:text-xl font-bold tracking-tight" style={{ color: 'var(--ns-text)' }}>{precio(prod.precio)}</p>
                               ) : (
                                 <p className="text-sm font-bold" style={{ color: 'var(--ns-text-muted)' }}>Consultar</p>
                               )}
                             </div>
                             
                             {/* CONTROLES CLICK PREVENIDO PARA NO ABRIR MODAL */}
                             <div onClick={e => e.stopPropagation()}>
                               {qty > 0 ? (
                                 <div className="flex items-center gap-0 rounded-xl overflow-hidden shadow-sm h-8 md:h-10" style={{ backgroundColor: 'var(--ns-primary)', color: 'white' }}>
                                   <button onClick={() => removeFromCart(prod.id)} className="w-8 md:w-9 h-full flex items-center justify-center hover:bg-black/10 active:bg-black/20 transition-all font-bold text-lg">−</button>
                                   <span className="w-6 md:w-8 text-center text-[12px] md:text-[14px] font-bold">{qty}</span>
                                   <button onClick={() => addToCart(prod.id)} className="w-8 md:w-9 h-full flex items-center justify-center hover:bg-black/10 active:bg-black/20 transition-all font-bold text-lg">+</button>
                                 </div>
                               ) : (
                                 <button onClick={() => addToCart(prod.id)} className="w-8 h-8 md:w-10 md:h-10 rounded-xl flex items-center justify-center text-white active:scale-90 transition-all shadow-md hover:shadow-lg" style={{ backgroundColor: 'var(--ns-primary)', boxShadow: '0 3px 0 rgba(16,24,40,0.1), 0 6px 16px rgba(0,122,255,0.3), inset 0 1px 0 rgba(255,255,255,0.3)' }}>
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
             <button onClick={() => setCarritoAbierto(true)} className="w-full max-w-sm flex items-center justify-between py-4 px-5 rounded-2xl text-white font-bold active:scale-[0.97] transition-all pointer-events-auto" style={{ backgroundColor: accent, boxShadow: `0 6px 0 rgba(16,24,40,0.12), 0 12px 36px ${accentDark}, inset 0 2px 0 rgba(255,255,255,0.25)`, textShadow: '0 1px 2px rgba(16,24,40,0.15)' }}>
               <div className="flex items-center gap-3">
                 <div className="relative">
                   <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" strokeLinecap="round" strokeLinejoin="round"/></svg>
                   <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-white text-[10px] font-bold flex items-center justify-center" style={{ color: accent }}>{itemsEnCarrito}</div>
                 </div>
                 <span className="text-[11px] font-bold uppercase tracking-[0.06em] ml-1">Ver carrito</span>
               </div>
               <span className="text-base font-bold">{precio(totalCarrito)}</span>
             </button>
           </div>
         )}
         
         {/* OVERLAYS GLOBALES (MODAL PRODUCTO & CARRITO) */}
         {/* MODAL DETALLE PRODUCTO */}
         {productoDetalle && (
           <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-0 md:p-4 animate-in fade-in duration-300">
             <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setProductoDetalle(null)}></div>
             <div className="ns-glass-sheet relative w-full max-w-md rounded-t-[2rem] md:rounded-[2rem] overflow-hidden flex flex-col max-h-[90vh] animate-in slide-in-from-bottom-12 md:slide-in-from-bottom-8 duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]">
               
               {/* Btn Cerrar */}
               <button onClick={() => setProductoDetalle(null)} className="absolute top-4 right-4 z-10 w-8 h-8 bg-black/10 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-black/20 transition-colors">
                 <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round"/></svg>
               </button>

               {/* Imagen grande */}
               <div className="w-full aspect-[4/3] relative shrink-0" style={{ background: 'var(--ns-sunken)' }}>
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
                   <span className="text-[10px] font-bold uppercase tracking-[0.08em] px-2.5 py-1 rounded-md" style={{ backgroundColor: accentUltraSoft, color: accent }}>{productoDetalle.categoria}</span>
                 </div>
                 <h2 className="text-2xl font-bold  tracking-tight leading-tight mb-3">{productoDetalle.nombre}</h2>
                 {productoDetalle.precio > 0 && <p className="text-2xl font-bold  mb-4">{precio(productoDetalle.precio)}</p>}
                 
                 <div className="space-y-4">
                   {productoDetalle.descripcion ? (
                     <div>
                       <h4 className="text-[10px] font-bold uppercase tracking-[0.06em]  mb-1.5">Acerca de</h4>
                       <p className="text-sm font-medium leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--ns-text-secondary)' }}>{productoDetalle.descripcion}</p>
                     </div>
                   ) : (
                     <p className="text-sm font-medium italic" style={{ color: 'var(--ns-text-faint)' }}>Sin descripción detallada.</p>
                   )}
                 </div>
               </div>

               {/* Acciones Sticky Modal */}
               <div className="ns-glass-bar absolute bottom-0 inset-x-0 p-4 flex items-center justify-between gap-4" style={{ paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))' }}>
                 {(() => {
                   const qty = carrito[productoDetalle.id] || 0
                   return qty > 0 ? (
                     <div className="flex items-center justify-between w-full p-1 rounded-2xl border-2" style={{ borderColor: accent }}>
                       <button onClick={() => removeFromCart(productoDetalle.id)} className="ui-icon-btn w-11 h-11 text-xl">−</button>
                       <span className="text-lg font-bold  px-4">{qty} en carrito</span>
                       <button onClick={() => addToCart(productoDetalle.id)} className="w-12 h-12 flex items-center justify-center rounded-xl transition-all font-bold text-2xl text-white shadow-md" style={{ backgroundColor: accent }}>+</button>
                     </div>
                   ) : (
                         <button onClick={() => { addToCart(productoDetalle.id); setProductoDetalle(null); }} className="w-full py-4 rounded-2xl text-white font-bold uppercase tracking-[0.06em] text-xs active:scale-[0.98] transition-all flex items-center justify-center gap-2" style={{ backgroundColor: accent, boxShadow: `0 6px 0 rgba(16,24,40,0.1), 0 10px 28px ${accentGlow}, inset 0 2px 0 rgba(255,255,255,0.25)`, textShadow: '0 1px 2px rgba(16,24,40,0.15)' }}>
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
             <div className="ns-glass-sheet relative w-full h-[85vh] md:h-auto md:max-h-[85vh] md:max-w-md rounded-t-[2rem] md:rounded-[2rem] flex flex-col animate-in slide-in-from-bottom-full md:slide-in-from-bottom-12 duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]">
               
               {/* Header Carrito */}
               <div className="px-5 py-4 border-b border-[var(--ns-line)] flex items-center justify-between shrink-0">
                 <div className="flex items-center gap-3">
                   {checkoutActivo ? (
                     <button onClick={() => setCheckoutActivo(false)} className="ui-icon-btn w-9 h-9"><svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
                   ) : (
                     <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: accentUltraSoft, color: accent }}><svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" strokeLinecap="round" strokeLinejoin="round"/></svg></div>
                   )}
                   <h3 className="font-display text-lg font-bold" style={{ color: 'var(--ns-text)' }}>{checkoutActivo ? 'Tus Datos' : 'Tu Pedido'}</h3>
                 </div>
                 <button onClick={() => setCarritoAbierto(false)} className="ui-icon-btn w-9 h-9">
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
                           <div className="w-16 h-16 rounded-[18px] shrink-0 overflow-hidden" style={{ background: 'var(--ns-sunken)', boxShadow: 'var(--ui-field-sm)' }}>
                             {p.imagen_url ? <img src={p.imagen_url} className="w-full h-full object-cover" /> : <div className="w-full h-full" style={{ backgroundColor: accentUltraSoft }}></div>}
                           </div>
                           <div className="flex-1 min-w-0">
                             <h5 className="text-[13px] font-bold  truncate">{p.nombre}</h5>
                             <p className="text-[11px] font-medium ">{precio(p.precio)} c/u</p>
                             <div className="mt-1 flex items-center justify-between">
                               <div className="flex items-center gap-2 border  rounded-lg overflow-hidden h-7">
                                 <button onClick={() => removeFromCart(pid)} className="w-8 h-full flex items-center justify-center font-bold" style={{ color: 'var(--ns-text-muted)' }}>−</button>
                                 <span className="w-6 text-center text-[11px] font-bold">{qty}</span>
                                 <button onClick={() => addToCart(pid)} className="w-7 h-full flex items-center justify-center text-white font-bold" style={{ backgroundColor: accent }}>+</button>
                               </div>
                               <span className="text-sm font-bold" style={{ color: 'var(--ns-text)' }}>${(p.precio * qty).toLocaleString()}</span>
                             </div>
                           </div>
                         </div>
                       )
                     })}
                   </div>
                 ) : (
                   <form id="checkoutForm" onSubmit={enviarPedidoWhatsApp} className="space-y-4">
                     <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-[0.06em] ml-1" style={{ color: accentGlow }}>Nombre completo *</label>
                        <input required className="ui-field" placeholder="¿Cómo te llamas?" value={clienteCheckout.nombre} onChange={(e) => setClienteCheckout({...clienteCheckout, nombre: e.target.value})} />
                     </div>
                     <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-[0.06em] ml-1" style={{ color: accentGlow }}>Teléfono (Opcional)</label>
                        <input type="tel" className="ui-field" placeholder="Para contactarte si es necesario" value={clienteCheckout.telefono} onChange={(e) => setClienteCheckout({...clienteCheckout, telefono: e.target.value})} />
                     </div>
                     <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-[0.06em] ml-1" style={{ color: accentGlow }}>Notas del pedido (Opcional)</label>
                        <textarea rows="3" className="ui-field resize-none" placeholder="Aclaraciones sobre tu pedido..." value={clienteCheckout.notas} onChange={(e) => setClienteCheckout({...clienteCheckout, notas: e.target.value})}></textarea>
                     </div>
                   </form>
                 )}
               </div>

               {/* Footer Carrito */}
               <div className="p-5 border-t border-[var(--ns-line)] shrink-0" style={{ paddingBottom: 'calc(20px + env(safe-area-inset-bottom, 0px))' }}>
                 <div className="flex items-center justify-between mb-4">
                   <span className="text-[11px] font-bold  uppercase tracking-[0.06em]">Total del pedido</span>
                   <span className="text-2xl font-bold ">{precio(totalCarrito)}</span>
                 </div>
                 
                 {!checkoutActivo ? (
                   <button onClick={() => setCheckoutActivo(true)} className="w-full py-4 rounded-2xl text-white font-bold uppercase tracking-[0.06em] text-[11px] active:scale-[0.98] transition-all flex items-center justify-center gap-2" style={{ backgroundColor: accent, boxShadow: `0 6px 0 rgba(16,24,40,0.1), 0 10px 28px ${accentGlow}, inset 0 2px 0 rgba(255,255,255,0.25)`, textShadow: '0 1px 2px rgba(16,24,40,0.15)' }}>
                     Completar Datos
                     <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/></svg>
                   </button>
                 ) : (
                   <button type="submit" form="checkoutForm" className="w-full py-4 rounded-2xl text-white font-bold uppercase tracking-[0.06em] text-[11px] active:scale-[0.98] transition-all flex items-center justify-center gap-2" style={{ backgroundColor: '#DBEAFE', boxShadow: '0 6px 0 rgba(16,24,40,0.08), 0 10px 24px rgba(0,122,255,0.3), inset 0 2px 0 rgba(255,255,255,0.25)', textShadow: '0 1px 2px rgba(16,24,40,0.1)' }}>
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
            <div className="nh-card overflow-hidden" style={{ background: 'rgba(255,255,255,0.75)', backdropFilter: 'blur(16px) saturate(150%)', border: '1px solid rgba(255,255,255,0.5)', boxShadow: '0 4px 20px rgba(16,24,40,0.04), inset 0 1px 0 rgba(255,255,255,0.7)' }}>
              {/* Map Header */}
              <div className="p-4 md:p-5 flex items-center gap-3">
                <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--ns-primary-bg)' }}>
                  <svg className="w-4 h-4 md:w-5 md:h-5" style={{ color: 'var(--ns-primary)' }} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" strokeLinecap="round" strokeLinejoin="round"/><path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[8px] md:text-[9px] font-bold uppercase tracking-[0.08em]" style={{ color: 'var(--ns-primary)' }}>Ubicación</p>
                  {negocio.direccion && (
                    <p className="text-[12px] md:text-sm font-bold truncate" style={{ color: 'var(--ns-text)' }}>{negocio.direccion}</p>
                  )}
                </div>
                {mapaUrlSegura && (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(negocio.direccion || negocio.nombre)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-full text-[8px] md:text-[9px] font-bold uppercase tracking-[0.06em] transition-all active:scale-95"
                    style={{ backgroundColor: 'var(--ns-primary-bg)', color: 'var(--ns-primary)', boxShadow: '0 2px 0 rgba(16,24,40,0.04), 0 4px 8px rgba(0,122,255,0.08), inset 0 1px 0 rgba(255,255,255,0.6)' }}
                  >
                    Abrir Mapa
                  </a>
                )}
              </div>
              {/* Map Embed */}
              {mapaUrlSegura && (
                <div className="h-[180px] md:h-[220px] w-full border-t" style={{ borderColor: 'var(--ns-border)' }}>
                  <iframe
                    src={mapaUrlSegura}
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
           <div className="w-6 h-6 rounded-[0.5rem] flex items-center justify-center rotate-3 shadow-lg" style={{ background: 'var(--ns-gradient-1)', boxShadow: '0 3px 0 rgba(16,24,40,0.1), 0 6px 12px rgba(0,122,255,0.2)' }}><span className="text-white font-bold text-[6px] italic">NS</span></div>
           <p className="text-[11px] font-medium" style={{ color: 'var(--ns-text-muted)' }}>Reservas con Noni</p>
        </footer>
      )}

      {/* Los estilos de esta vista viven en src/styles/views.css: antes estaban
          inyectados acá y pisaban el sistema de diseño con valores viejos. */}
    </div>
  )
}