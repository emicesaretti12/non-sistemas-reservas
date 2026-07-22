import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { getVocabulario, esGastronomia } from '../utils/vocabulario'
import { getEstadoSuscripcion } from '../utils/suscripcion'
import { useToast } from './Toast'

// UUID regex — solo strings de 36 caracteres con guiones
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default function VistaPublica() {
  const showToast = useToast()
  const { slug, id } = useParams()
  
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
  }, [slug, id])

  async function bootBrandedApp() {
    try {
      setLoading(true)

      let biz = null
      let bizId = null

      if (slug && id) {
        // Ruta /app/:slug/:id — slug es el nombre, id es el UUID
        bizId = id
        const { data, error } = await supabase
          .from('negocios')
          .select('*')
          .eq('id', id)
          .maybeSingle()

        if (error) throw error
        biz = data

        // Si no encuentra por UUID, intentar buscar por slug como fallback
        if (!biz) {
          const bizSlug = id // el "id" podría ser un slug
          const { data: bizBySlug, error: slugErr } = await supabase
            .from('negocios')
            .select('*')
            .eq('nombre', bizSlug)
            .maybeSingle()
          if (!slugErr && bizBySlug) {
            biz = bizBySlug
            bizId = bizBySlug.id
          }
        }
      } else if (id) {
        // Ruta /app/:id — puede ser UUID o slug
        if (UUID_REGEX.test(id)) {
          // Es un UUID válido
          const { data, error } = await supabase
            .from('negocios')
            .select('*')
            .eq('id', id)
            .maybeSingle()

          if (error) throw error
          biz = data
          bizId = id
        } else {
          // Es un slug — buscar por nombre
          const { data, error } = await supabase
            .from('negocios')
            .select('*')
            .ilike('nombre', id)
            .maybeSingle()

          if (error) throw error
          if (data) {
            biz = data
            bizId = data.id
          } else {
            // Intentar con el slug exacto
            const { data: biz2, error: err2 } = await supabase
              .from('negocios')
              .select('*')
              .eq('nombre', id)
              .maybeSingle()
            if (!err2 && biz2) {
              biz = biz2
              bizId = biz2.id
            }
          }
        }
      }

      if (!biz) {
        setLoading(false)
        return
      }

      setNegocio(biz)

      const [resSrvs, resEmps, resCat] = await Promise.all([
        supabase.from('servicios').select('*').eq('negocio_id', bizId),
        supabase.from('empleados').select('*').eq('negocio_id', bizId),
        supabase.from('catalogo_productos').select('*').eq('negocio_id', bizId).eq('activo', true).order('orden').order('nombre')
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
        open: isOpen,
      })
    }
    
    setDiasCalendario(calendar)
  }

  // --- HELPERS ---
  const hexToRgba = (hex, alpha) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    if (!result) return `rgba(0,0,0,${alpha})`
    const r = parseInt(result[1], 16)
    const g = parseInt(result[2], 16)
    const b = parseInt(result[3], 16)
    return `rgba(${r},${g},${b},${alpha})`
  }

  const formatearFecha = (fechaStr) => {
    if (!fechaStr) return ''
    const [y, m, d] = fechaStr.split('-').map(Number)
    return new Date(y, m - 1, d).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })
  }

  // --- RESERVA HANDLERS ---
  const buscarHoras = useCallback(async (fecha, servicioId, empleadoId) => {
    if (!fecha || !servicioId || !negocio?.horarios) return

    setBuscandoHoras(true)
    try {
      const slots = { mañana: [], tarde: [], noche: [], madrugada: [] }
      
      // Obtener horario del día seleccionado
      const fechaObj = new Date(fecha + 'T00:00:00')
      const dayOfWeek = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'][fechaObj.getDay()]
      const horario = negocio.horarios[dayOfWeek]
      
      if (!horario || !horario.abierto) {
        setHorasDisponibles(slots)
        return
      }

      // Obtener duracion del servicio
      const servicio = servicios.find(s => s.id === servicioId)
      const duracionMin = servicio?.duracion_minutos || 30

      // Generar slots cada 30 min dentro del horario
      const [hInicio, mInicio] = horario.inicio.split(':').map(Number)
      const [hFin, mFin] = horario.fin.split(':').map(Number)
      
      let mins = hInicio * 60 + mInicio
      const finMins = hFin * 60 + mFin

      // Filtrar por empleado si hay uno seleccionado
      const turnosExistentes = [] // Simplificado — en producción consultarías supabase

      while (mins + duracionMin <= finMins) {
        const h = Math.floor(mins / 60)
        const m = mins % 60
        const horaStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
        const label = `${h > 12 ? h - 12 : h || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
        
        const period = h < 6 ? 'madrugada' : h < 12 ? 'mañana' : h < 18 ? 'tarde' : 'noche'
        slots[period].push({ value: horaStr, label })
        
        mins += 30
      }

      setHorasDisponibles(slots)
    } catch (e) {
      console.warn('Error buscando horas:', e.message)
    } finally {
      setBuscandoHoras(false)
    }
  }, [negocio, servicios])

  const crearReserva = async () => {
    if (!negocio || !reserva.servicioId || !reserva.fecha || !reserva.hora) {
      showToast('Completa todos los campos para reservar', 'error')
      return
    }

    setGuardando(true)
    try {
      const servicio = servicios.find(s => s.id === reserva.servicioId)
      const empleado = empleados.find(e => e.id === reserva.empleadoId)

      const { data, error } = await supabase
        .from('turnos')
        .insert({
          negocio_id: negocio.id,
          servicio_id: reserva.servicioId,
          empleado_id: reserva.empleadoId || null,
          fecha_hora: `${reserva.fecha} ${reserva.hora}`,
          cliente_nombre: reserva.clienteNombre || 'Cliente Web',
          cliente_telefono: reserva.clienteTelefono || null,
          cliente_email: reserva.clienteEmail || null,
          estado: 'pendiente',
          notas: reserva.campoExtra || null,
          origen: 'web_publica',
          duracion_minutos: servicio?.duracion_minutos || 30,
        })
        .select()
        .single()

      if (error) throw error

      showToast(`¡Reserva confirmada! Te esperamos el ${formatearFecha(reserva.fecha)} a las ${reserva.hora}`, 'success')
      setReserva({ servicioId: null, empleadoId: null, fecha: '', hora: '', horaNextDay: false, clienteNombre: '', clienteTelefono: '', clienteEmail: '', campoExtra: '' })
      setPaso(1)
    } catch (e) {
      console.error('Error creando reserva:', e.message)
      showToast('Hubo un error al crear la reserva. Intentá de nuevo.', 'error')
    } finally {
      setGuardando(false)
    }
  }

  // --- SUSCRIPCIÓN CHECK ---
  const estadoSub = negocio ? getEstadoSuscripcion(negocio) : null
  const subActiva = estadoSub && (estadoSub.estado === 'activo' || estadoSub.estado === 'trial' || estadoSub.estado === 'admin')

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center" style={{ background: 'var(--ns-bg)' }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center animate-pulse" style={{ background: 'var(--ns-gradient-1)' }}>
            <span className="text-white font-black text-xl">N</span>
          </div>
          <div className="w-32 h-1 rounded-full overflow-hidden" style={{ background: 'var(--ns-border)' }}>
            <div className="h-full rounded-full" style={{ background: 'var(--ns-gradient-1)', width: '40%', animation: 'loadingBar 1.2s ease-in-out infinite' }} />
          </div>
        </div>
      </div>
    )
  }

  if (!negocio) {
    return (
      <div className="min-h-dvh flex items-center justify-center px-4" style={{ background: 'var(--ns-bg)' }}>
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'var(--ns-accent-bg)' }}>
            <svg className="w-8 h-8" style={{ color: 'var(--ns-text-muted)' }} fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h2 className="text-lg font-black" style={{ color: 'var(--ns-text)' }}>Negocio no encontrado</h2>
          <p className="text-xs font-medium mt-2" style={{ color: 'var(--ns-text-muted)' }}>
            Este link puede estar desactualizado o el negocio no está activo.
          </p>
        </div>
      </div>
    )
  }

  if (!subActiva) {
    return (
      <div className="min-h-dvh flex items-center justify-center px-4" style={{ background: 'var(--ns-bg)' }}>
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'var(--ns-accent-bg)' }}>
            <svg className="w-8 h-8" style={{ color: 'var(--ns-text-muted)' }} fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h2 className="text-lg font-black" style={{ color: 'var(--ns-text)' }}>Servicio no disponible</h2>
          <p className="text-sm text-zinc-500 font-medium mt-2">Este negocio no está aceptando reservas en este momento. Intente más tarde.</p>
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
      const next = { ...prev }
      if (next[prodId] > 1) {
        next[prodId] = current => current - 1
      } else {
        delete next[prodId]
      }
      return next
    })
  }

  const cartTotal = Object.entries(carrito).reduce((sum, [prodId, qty]) => {
    const prod = catalogo.find(p => p.id === prodId)
    return sum + (prod?.precio || 0) * qty
  }, 0)

  const cartItems = Object.values(carrito).reduce((sum, qty) => sum + qty, 0)

  return (
    <div className="min-h-dvh" style={{ background: 'var(--ns-bg)', color: 'var(--ns-text)' }}>
      {/* Header Branded */}
      <header className="sticky top-0 z-50" style={{ background: 'rgba(248,247,255,0.92)', backdropFilter: 'blur(20px)', borderBottom: '0.5px solid rgba(52,48,91,0.06)' }}>
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {negocio.logo_url ? (
              <img src={negocio.logo_url} alt={negocio.nombre} className="w-10 h-10 rounded-xl object-cover" />
            ) : (
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${accent}, ${accentDark})` }}>
                <span className="text-white font-black text-sm">{negocio.nombre?.charAt(0)}</span>
              </div>
            )}
            <div>
              <h1 className="text-sm font-black tracking-tight" style={{ color: 'var(--ns-text)' }}>{negocio.nombre}</h1>
              <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: 'var(--ns-text-muted)' }}>{negocio.rubro}</p>
            </div>
          </div>
          {catalogo.length > 0 && (
            <button onClick={() => setVistaActiva(v => v === 'catalogo' ? 'reservas' : 'catalogo')} className="px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all" style={{ background: 'var(--ns-primary-bg)', color: 'var(--ns-primary)' }}>
              {vistaActiva === 'catalogo' ? '← Reservas' : 'Catálogo'}
            </button>
          )}
        </div>
      </header>

      {/* Bio */}
      {negocio.descripcion && (
        <div className="max-w-2xl mx-auto px-4 pt-4">
          <div className="p-4 rounded-2xl" style={{ background: 'var(--ns-accent-bg)', border: '1px solid var(--ns-border)' }}>
            <p className={`text-xs font-medium leading-relaxed ${bioExpandida ? '' : 'line-clamp-2'}`} style={{ color: 'var(--ns-text-secondary)' }}>
              {negocio.descripcion}
            </p>
            {negocio.descripcion.length > 120 && (
              <button onClick={() => setBioExpandida(!bioExpandida)} className="text-[10px] font-bold mt-1 transition-colors" style={{ color: 'var(--ns-primary)' }}>
                {bioExpandida ? 'Ver menos' : 'Leer más'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Contact Bar */}
      <div className="max-w-2xl mx-auto px-4 pt-3">
        <div className="flex gap-2">
          {negocio.telefono && (
            <a href={`https://wa.me/${negocio.telefono.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener" className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-bold" style={{ background: 'rgba(37,211,102,0.08)', color: '#25D366', border: '1px solid rgba(37,211,102,0.15)' }}>
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.888-.788-1.489-1.761-1.663-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 00-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" /></svg>
              WhatsApp
            </a>
          )}
          {negocio.instagram && (
            <a href={`https://instagram.com/${negocio.instagram}`} target="_blank" rel="noopener" className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-bold" style={{ background: 'var(--ns-accent-bg)', color: 'var(--ns-text-secondary)', border: '1px solid var(--ns-border)' }}>
              Instagram
            </a>
          )}
          {negocio.mapa_url && (
            <a href={negocio.mapa_url} target="_blank" rel="noopener" className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-bold" style={{ background: 'var(--ns-accent-bg)', color: 'var(--ns-text-secondary)', border: '1px solid var(--ns-border)' }}>
              Mapa
            </a>
          )}
        </div>
      </div>

      <main className="max-w-2xl mx-auto px-4 pb-8 pt-4">
        {vistaActiva === 'reservas' ? (
          <>
            {/* Reserva Flow */}
            <div className="space-y-4">
              {/* Paso indicador */}
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4].map(p => (
                  <div key={p} className="flex-1 h-1 rounded-full transition-all" style={{ background: p <= paso ? 'var(--ns-gradient-1)' : 'var(--ns-border)' }} />
                ))}
              </div>

              {/* PASO 1: Elegir servicio */}
              {paso === 1 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-black uppercase tracking-widest" style={{ color: 'var(--ns-text)' }}>Elegí tu {vocab.servicio}</h3>
                  {servicios.length === 0 ? (
                    <div className="p-6 rounded-2xl text-center" style={{ background: 'var(--ns-accent-bg)', border: '2px dashed var(--ns-border)' }}>
                      <p className="text-xs font-medium" style={{ color: 'var(--ns-text-muted)' }}>Aún no hay {vocab.servicios?.toLowerCase() || 'servicios'} disponibles.</p>
                    </div>
                  ) : (
                    servicios.map(s => (
                      <button
                        key={s.id}
                        onClick={() => {
                          setReserva(r => ({ ...r, servicioId: s.id, hora: '', empleadoId: null }))
                          setPaso(2)
                        }}
                        className="w-full text-left p-4 rounded-2xl transition-all active:scale-[0.98]"
                        style={{ background: 'var(--ns-surface)', border: '1px solid var(--ns-border)', boxShadow: 'var(--ns-shadow-sm)' }}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-sm font-bold" style={{ color: 'var(--ns-text)' }}>{s.nombre}</p>
                            {s.descripcion && <p className="text-[10px] font-medium mt-1 line-clamp-2" style={{ color: 'var(--ns-text-muted)' }}>{s.descripcion}</p>}
                          </div>
                          <div className="text-right shrink-0 ml-3">
                            <p className="text-sm font-black" style={{ color: 'var(--ns-primary)' }}>${(s.precio || 0).toLocaleString()}</p>
                            <p className="text-[9px] font-bold mt-0.5" style={{ color: 'var(--ns-text-muted)' }}>{s.duracion_minutos || 30} min</p>
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}

              {/* PASO 2: Elegir profesional */}
              {paso === 2 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-black uppercase tracking-widest" style={{ color: 'var(--ns-text)' }}>Profesional</h3>
                    <button onClick={() => setPaso(1)} className="text-[10px] font-bold" style={{ color: 'var(--ns-primary)' }}>← Volver</button>
                  </div>
                  {empleados.length === 0 ? (
                    <button onClick={() => setPaso(3)} className="w-full text-center p-4 rounded-2xl" style={{ background: 'var(--ns-accent-bg)', border: '1px solid var(--ns-border)' }}>
                      <p className="text-xs font-medium" style={{ color: 'var(--ns-text-muted)' }}>Sin profesional disponible. Continuá →</p>
                    </button>
                  ) : (
                    <>
                      <button onClick={() => setPaso(3)} className="w-full p-4 rounded-2xl text-left transition-all active:scale-[0.98]" style={{ background: 'var(--ns-surface)', border: '1px solid var(--ns-border)' }}>
                        <p className="text-xs font-bold" style={{ color: 'var(--ns-text-muted)' }}>Cualquier profesional</p>
                      </button>
                      {empleados.filter(e => e.estado === 'activo').map(e => (
                        <button
                          key={e.id}
                          onClick={() => {
                            setReserva(r => ({ ...r, empleadoId: e.id }))
                            setPaso(3)
                          }}
                          className="w-full p-4 rounded-2xl text-left flex items-center gap-3 transition-all active:scale-[0.98]"
                          style={{ background: 'var(--ns-surface)', border: '1px solid var(--ns-border)' }}
                        >
                          {e.foto_url ? (
                            <img src={e.foto_url} className="w-10 h-10 rounded-xl object-cover" />
                          ) : (
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--ns-primary-bg)' }}>
                              <span className="text-xs font-black" style={{ color: 'var(--ns-primary)' }}>{e.nombre?.charAt(0)}</span>
                            </div>
                          )}
                          <div>
                            <p className="text-sm font-bold" style={{ color: 'var(--ns-text)' }}>{e.nombre}</p>
                            {e.especialidad && <p className="text-[10px] font-medium" style={{ color: 'var(--ns-text-muted)' }}>{e.especialidad}</p>}
                          </div>
                        </button>
                      ))}
                    </>
                  )}
                </div>
              )}

              {/* PASO 3: Fecha y hora */}
              {paso === 3 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-black uppercase tracking-widest" style={{ color: 'var(--ns-text)' }}>Fecha y hora</h3>
                    <button onClick={() => setPaso(2)} className="text-[10px] font-bold" style={{ color: 'var(--ns-primary)' }}>← Volver</button>
                  </div>

                  {/* Mini calendario */}
                  <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
                    {diasCalendario.slice(0, 14).map((day, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          if (!day.open) return
                          setReserva(r => ({ ...r, fecha: day.full, hora: '' }))
                          buscarHoras(day.full, reserva.servicioId, reserva.empleadoId)
                        }}
                        className={`shrink-0 w-16 py-3 rounded-xl flex flex-col items-center gap-1 transition-all ${!day.open ? 'opacity-30' : ''}`}
                        style={{ background: reserva.fecha === day.full ? 'var(--ns-gradient-1)' : 'var(--ns-surface)', color: reserva.fecha === day.full ? 'white' : 'var(--ns-text)', border: reserva.fecha === day.full ? 'none' : '1px solid var(--ns-border)' }}
                      >
                        <span className="text-[8px] font-bold uppercase tracking-wider">{day.weekday}</span>
                        <span className="text-lg font-black leading-none">{day.number}</span>
                        <span className="text-[7px] font-bold uppercase">{day.month}</span>
                      </button>
                    ))}
                  </div>

                  {/* Horas disponibles */}
                  {reserva.fecha && (
                    <div className="space-y-3">
                      {['mañana', 'tarde', 'noche', 'madrugada'].map(periodo => {
                        const horas = horasDisponibles[periodo] || []
                        if (horas.length === 0) return null
                        return (
                          <div key={periodo}>
                            <p className="text-[9px] font-black uppercase tracking-widest mb-2" style={{ color: 'var(--ns-text-muted)' }}>{periodo}</p>
                            <div className="flex flex-wrap gap-2">
                              {horas.map(h => (
                                <button
                                  key={h.value}
                                  onClick={() => { setReserva(r => ({ ...r, hora: h.value })); setPaso(4) }}
                                  className="px-4 py-2 rounded-xl text-xs font-bold transition-all active:scale-95"
                                  style={{ background: 'var(--ns-accent-bg)', color: 'var(--ns-text)', border: '1px solid var(--ns-border)' }}
                                >
                                  {h.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        )
                      })}
                      {buscandoHoras && (
                        <div className="flex justify-center py-4">
                          <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--ns-border)', borderTopColor: 'var(--ns-primary)' }} />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* PASO 4: Datos del cliente */}
              {paso === 4 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-black uppercase tracking-widest" style={{ color: 'var(--ns-text)' }}>Tus datos</h3>
                    <button onClick={() => setPaso(3)} className="text-[10px] font-bold" style={{ color: 'var(--ns-primary)' }}>← Volver</button>
                  </div>

                  {/* Resumen */}
                  <div className="p-4 rounded-2xl" style={{ background: 'var(--ns-accent-bg)', border: '1px solid var(--ns-border)' }}>
                    <p className="text-xs font-bold" style={{ color: 'var(--ns-text)' }}>
                      {servicios.find(s => s.id === reserva.servicioId)?.nombre}
                    </p>
                    <p className="text-[10px] font-medium mt-1" style={{ color: 'var(--ns-text-muted)' }}>
                      {formatearFecha(reserva.fecha)} a las {reserva.hora}
                    </p>
                    {empleados.find(e => e.id === reserva.empleadoId) && (
                      <p className="text-[10px] font-medium mt-0.5" style={{ color: 'var(--ns-primary)' }}>
                        Con {empleados.find(e => e.id === reserva.empleadoId)?.nombre}
                      </p>
                    )}
                  </div>

                  <input
                    type="text"
                    placeholder="Tu nombre"
                    value={reserva.clienteNombre}
                    onChange={e => setReserva(r => ({ ...r, clienteNombre: e.target.value }))}
                    className="w-full p-3.5 rounded-xl text-sm outline-none"
                    style={{ background: 'var(--ns-surface)', border: '1px solid var(--ns-border)', color: 'var(--ns-text)' }}
                  />
                  <input
                    type="tel"
                    placeholder="Teléfono (opcional)"
                    value={reserva.clienteTelefono}
                    onChange={e => setReserva(r => ({ ...r, clienteTelefono: e.target.value }))}
                    className="w-full p-3.5 rounded-xl text-sm outline-none"
                    style={{ background: 'var(--ns-surface)', border: '1px solid var(--ns-border)', color: 'var(--ns-text)' }}
                  />
                  <input
                    type="email"
                    placeholder="Email (opcional)"
                    value={reserva.clienteEmail}
                    onChange={e => setReserva(r => ({ ...r, clienteEmail: e.target.value }))}
                    className="w-full p-3.5 rounded-xl text-sm outline-none"
                    style={{ background: 'var(--ns-surface)', border: '1px solid var(--ns-border)', color: 'var(--ns-text)' }}
                  />
                  <textarea
                    placeholder="Notas adicionales (opcional)"
                    value={reserva.campoExtra}
                    onChange={e => setReserva(r => ({ ...r, campoExtra: e.target.value }))}
                    className="w-full p-3.5 rounded-xl text-sm outline-none resize-none h-20"
                    style={{ background: 'var(--ns-surface)', border: '1px solid var(--ns-border)', color: 'var(--ns-text)' }}
                  />

                  <button
                    onClick={crearReserva}
                    disabled={guardando || !reserva.clienteNombre.trim()}
                    className="w-full py-4 rounded-2xl text-sm font-black uppercase tracking-widest transition-all disabled:opacity-40 active:scale-[0.98]"
                    style={{ background: 'var(--ns-gradient-1)', color: 'white', boxShadow: 'var(--ns-plastilina-btn)' }}
                  >
                    {guardando ? 'Confirmando...' : 'Confirmar Reserva'}
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          /* === CATÁLOGO === */
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black uppercase tracking-widest" style={{ color: 'var(--ns-text)' }}>Catálogo</h3>
              <div className="flex items-center gap-2">
                <select value={catFiltro} onChange={e => setCatFiltro(e.target.value)} className="px-3 py-1.5 rounded-xl text-[10px] font-bold outline-none" style={{ background: 'var(--ns-accent-bg)', border: '1px solid var(--ns-border)', color: 'var(--ns-text-muted)' }}>
                  <option value="todos">Todos</option>
                  <option value="destacados">Destacados</option>
                  <option value="ofertas">Ofertas</option>
                </select>
              </div>
            </div>

            <input
              type="text"
              placeholder="Buscar productos..."
              value={catBusqueda}
              onChange={e => setCatBusqueda(e.target.value)}
              className="w-full p-3 rounded-xl text-xs outline-none"
              style={{ background: 'var(--ns-surface)', border: '1px solid var(--ns-border)', color: 'var(--ns-text)' }}
            />

            {/* Carrito floating */}
            {cartItems > 0 && (
              <button
                onClick={() => setCarritoAbierto(true)}
                className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{ background: 'var(--ns-gradient-1)', color: 'white', boxShadow: 'var(--ns-plastilina-btn)' }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" strokeLinecap="round" strokeLinejoin="round" /></svg>
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full text-[9px] font-black flex items-center justify-center" style={{ background: '#EF4444', color: 'white' }}>{cartItems}</span>
              </button>
            )}

            {catalogo.filter(p => !catBusqueda || p.nombre.toLowerCase().includes(catBusqueda.toLowerCase())).map(prod => (
              <div key={prod.id} className="p-4 rounded-2xl flex gap-3" style={{ background: 'var(--ns-surface)', border: '1px solid var(--ns-border)' }}>
                {prod.imagen_url ? (
                  <img src={prod.imagen_url} className="w-20 h-20 rounded-xl object-cover shrink-0" />
                ) : (
                  <div className="w-20 h-20 rounded-xl shrink-0 flex items-center justify-center" style={{ background: 'var(--ns-accent-bg)' }}>
                    <span className="text-2xl">{prod.emoji || '📦'}</span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate" style={{ color: 'var(--ns-text)' }}>{prod.nombre}</p>
                  {prod.descripcion && <p className="text-[10px] font-medium mt-0.5 line-clamp-2" style={{ color: 'var(--ns-text-muted)' }}>{prod.descripcion}</p>}
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-sm font-black" style={{ color: 'var(--ns-primary)' }}>${(prod.precio || 0).toLocaleString()}</p>
                    <div className="flex items-center gap-2">
                      <button onClick={() => removeFromCart(prod.id)} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--ns-accent-bg)', color: 'var(--ns-text-muted)' }}>−</button>
                      <span className="text-xs font-black w-4 text-center" style={{ color: 'var(--ns-text)' }}>{carrito[prod.id] || 0}</span>
                      <button onClick={() => addToCart(prod.id)} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--ns-primary)', color: 'white' }}>+</button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Powered by */}
      <footer className="text-center pb-6 pt-4">
        <p className="text-[8px] font-bold uppercase tracking-widest" style={{ color: 'var(--ns-text-muted)', opacity: 0.4 }}>
          Powered by Noni
        </p>
      </footer>
    </div>
  )
}
