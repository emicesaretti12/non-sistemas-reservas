import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { useNavigate } from 'react-router-dom'

// Inyección de componentes modulares
import Turnos from './Turnos'
import Servicios from './Servicios'
import Empleados from './Empleados'
import ConfiguracionHorarios from './ConfiguracionHorarios'
import Reportes from './Reportes'

// Sistema de Vocabulario Multi-Negocio
import { getVocabulario, RUBROS_DISPONIBLES } from '../utils/vocabulario'

export default function Dashboard({ session }) {
  // --- ESTADOS DE CARGA Y AUTENTICACIÓN ---
  const [loading, setLoading] = useState(true)
  const [negocio, setNegocio] = useState(null)
  
  // --- ESTADOS EXCLUSIVOS: NUCLEUS CONTROL (SUPER ADMIN) ---
  const [todosLosNegocios, setTodosLosNegocios] = useState([])
  const [filtroBusqueda, setFiltroBusqueda] = useState('')
  const [statsGlobales, setStatsGlobales] = useState({ total: 0, activos: 0, suspendidos: 0, rubros: {} })
  
  // --- ESTADOS: GESTIÓN DE NEGOCIO (OWNER) ---
  const [tab, setTab] = useState('inicio')
  const [stats, setStats] = useState({ hoy: 0, ingresos: 0, popular: '-', semana: 0, mesIngresos: 0, tasaOcupacion: 0 })
  
  // Lógica Granular de Carga
  const [guardandoPerfil, setGuardandoPerfil] = useState(false)
  const [subiendoLogo, setSubiendoLogo] = useState(false)
  const [subiendoPortada, setSubiendoPortada] = useState(false)

  // --- ESTADOS: ONBOARDING ---
  const [nombreNegocio, setNombreNegocio] = useState('')
  const [rubroSeleccionado, setRubroSeleccionado] = useState(RUBROS_DISPONIBLES[0])
  const [creando, setCreando] = useState(false)

  // --- ESTADOS: BRANDING & UI ---
  const [colorPrimario, setColorPrimario] = useState('#0f172a')
  const [descripcion, setDescripcion] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [portadaUrl, setPortadaUrl] = useState('')
  const [instagram, setInstagram] = useState('')

  // --- ESTADOS: CONTACTO NEGOCIO ---
  const [telefonoNegocio, setTelefonoNegocio] = useState('')
  const [direccionNegocio, setDireccionNegocio] = useState('')
  const [mensajeBienvenida, setMensajeBienvenida] = useState('')

  // --- ESTADOS: CLIENTES (NUEVO) ---
  const [clientes, setClientes] = useState([])
  const [cargandoClientes, setCargandoClientes] = useState(false)
  const [busquedaCliente, setBusquedaCliente] = useState('')
  const [ordenClientes, setOrdenClientes] = useState('visitas') // visitas | nombre | reciente

  // --- ESTADOS: ACTIVIDAD RECIENTE ---
  const [actividadReciente, setActividadReciente] = useState([])

  // --- ESTADOS: PRÓXIMA CITA ---
  const [proximaCita, setProximaCita] = useState(null)

  // --- ESTADOS: DISTRIBUCIÓN SEMANAL ---
  const [distribucionSemanal, setDistribucionSemanal] = useState([0,0,0,0,0,0,0])

  const navigate = useNavigate()

  useEffect(() => {
    if (session) {
      inicializarPanel()
    }
  }, [session])

  /**
   * ORQUESTADOR INICIAL
   */
  async function inicializarPanel() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('negocios')
        .select('*')
        .eq('owner_id', session.user.id)
        .order('creado_en', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error && error.code !== 'PGRST116') throw error

      if (data) {
        setNegocio(data)
        setColorPrimario(data.color_primario || '#0f172a')
        setDescripcion(data.descripcion || '')
        setLogoUrl(data.logo_url || '')
        setPortadaUrl(data.portada_url || '')
        setInstagram(data.instagram || '')
        setTelefonoNegocio(data.telefono || '')
        setDireccionNegocio(data.direccion || '')
        setMensajeBienvenida(data.mensaje_bienvenida || '')

        // --- SISTEMA DE AUTO-APROVISIONAMIENTO DE SUPER ADMIN ---
        let isAdmin = data.es_admin_plataforma
        const superAdminEmail = import.meta.env.VITE_SUPERADMIN_EMAIL
        
        if (superAdminEmail && session.user.email === superAdminEmail && !isAdmin) {
          const { error: adminErr } = await supabase
            .from('negocios')
            .update({ es_admin_plataforma: true })
            .eq('id', data.id)
          
          if (!adminErr) {
             isAdmin = true
             console.log("Nucleus Security: Permisos de Super Admin concedidos dinámicamente al Owner Master.")
          }
        }
        
        if (isAdmin) {
          await cargarConsolaMaestra()
        } else {
          await Promise.all([
            cargarMetricasNegocio(data.id),
            cargarActividadReciente(data.id),
            cargarClientes(data.id)
          ])
        }
      }
    } catch (e) {
      console.error('Nucleus System Error:', e.message)
      if (e.message?.includes('JWT') || e.code === '401') {
        await supabase.auth.signOut()
        window.location.href = '/login'
      }
    } finally {
      setLoading(false)
    }
  }

  /**
   * LÓGICA SUPER ADMIN: BI GLOBAL
   */
  async function cargarConsolaMaestra() {
    const { data } = await supabase
      .from('negocios')
      .select('*')
      .order('creado_en', { ascending: false })

    if (data) {
      setTodosLosNegocios(data)
      const activos = data.filter(n => n.estado_suscripcion === 'activo').length
      const rubrosCount = data.reduce((acc, n) => {
        acc[n.rubro] = (acc[n.rubro] || 0) + 1
        return acc
      }, {})

      setStatsGlobales({
        total: data.length,
        activos,
        suspendidos: data.length - activos,
        rubros: rubrosCount
      })
    }
  }

  async function gestionarSuscripcion(id, estadoActual) {
    const nuevoEstado = estadoActual === 'activo' ? 'suspendido' : 'activo'
    const negocioTarget = todosLosNegocios.find(n => n.id === id)
    const accion = nuevoEstado === 'suspendido' ? 'SUSPENDER' : 'ACTIVAR'
    
    if (!confirm(`¿Confirma que desea ${accion} a "${negocioTarget?.nombre || id}"?`)) return

    const { data, error, count } = await supabase
      .from('negocios')
      .update({ estado_suscripcion: nuevoEstado })
      .eq('id', id)
      .select()
    
    if (error) {
      console.error('Error de RLS/Supabase:', error)
      alert(`Error al ${accion.toLowerCase()}: ${error.message}\n\nAsegurate de haber ejecutado el script SQL de permisos de admin (sql_admin_fix.sql) en tu panel de Supabase.`)
      return
    }

    if (!data || data.length === 0) {
      alert(`No se pudo ${accion.toLowerCase()} el negocio. Las políticas de seguridad (RLS) de Supabase están bloqueando la acción.\n\nSolución: Ejecutá el archivo sql_admin_fix.sql en Supabase SQL Editor.`)
      return
    }

    cargarConsolaMaestra()
  }

  /**
   * LÓGICA NEGOCIO: BUSINESS INTELLIGENCE COMPLETA (Timezone Safe)
   */
  async function cargarMetricasNegocio(negocioId) {
    const ahora = new Date()
    const hoyInicio = new Date(ahora)
    hoyInicio.setHours(0, 0, 0, 0)
    
    // Inicio de la semana (lunes)
    const inicioSemana = new Date(ahora)
    const diaSemana = ahora.getDay()
    const diff = diaSemana === 0 ? 6 : diaSemana - 1
    inicioSemana.setDate(ahora.getDate() - diff)
    inicioSemana.setHours(0, 0, 0, 0)
    
    // Inicio del mes
    const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1)

    // Traemos todos los turnos desde inicio de mes para calcular todo
    const { data: turnos, error } = await supabase
      .from('turnos')
      .select('*, servicios(nombre, precio, duracion_minutos), empleados(nombre)')
      .eq('negocio_id', negocioId)
      .eq('estado', 'confirmado')
      .gte('fecha_hora', inicioMes.toISOString())
      .order('fecha_hora', { ascending: true })

    if (error) {
      console.error('Error obteniendo métricas:', error.message)
      return
    }

    if (turnos) {
      // Turnos futuros desde hoy
      const turnosFuturos = turnos.filter(t => new Date(t.fecha_hora) >= hoyInicio)
      const ingresosFuturos = turnosFuturos.reduce((acc, t) => acc + (t.servicios?.precio || 0), 0)
      
      // Turnos esta semana
      const turnosSemana = turnos.filter(t => {
        const f = new Date(t.fecha_hora)
        return f >= inicioSemana
      })
      
      // Ingresos del mes completo
      const ingresosMes = turnos.reduce((acc, t) => acc + (t.servicios?.precio || 0), 0)
      
      // Servicio más popular
      const servicioCount = {}
      turnos.forEach(t => {
        const nombre = t.servicios?.nombre || 'Otro'
        servicioCount[nombre] = (servicioCount[nombre] || 0) + 1
      })
      const popular = Object.keys(servicioCount).reduce((a, b) => 
        servicioCount[a] > servicioCount[b] ? a : b, '-'
      )
      
      // Distribución semanal (Lun-Dom)
      const distSemanal = [0,0,0,0,0,0,0]
      turnosSemana.forEach(t => {
        const d = new Date(t.fecha_hora).getDay()
        const idx = d === 0 ? 6 : d - 1 // Lunes=0, Domingo=6
        distSemanal[idx]++
      })
      setDistribucionSemanal(distSemanal)

      // Próxima cita
      const ahora2 = new Date()
      const proxima = turnosFuturos.find(t => new Date(t.fecha_hora) > ahora2)
      if (proxima) {
        setProximaCita(proxima)
      }
      
      setStats({ 
        hoy: turnosFuturos.length, 
        ingresos: ingresosFuturos,
        popular,
        semana: turnosSemana.length,
        mesIngresos: ingresosMes,
        tasaOcupacion: turnosSemana.length > 0 ? Math.min(100, Math.round((turnosSemana.length / 35) * 100)) : 0
      })
    }
  }

  /**
   * ACTIVIDAD RECIENTE: Últimos movimientos del negocio
   */
  async function cargarActividadReciente(negocioId) {
    const { data, error } = await supabase
      .from('turnos')
      .select('*, servicios(nombre), empleados(nombre)')
      .eq('negocio_id', negocioId)
      .order('fecha_hora', { ascending: false })
      .limit(8)

    if (!error && data) {
      setActividadReciente(data)
    }
  }

  /**
   * LÓGICA CLIENTES: Extrae base de clientes del historial de turnos
   */
  async function cargarClientes(negocioId) {
    setCargandoClientes(true)
    try {
      const { data: turnos, error } = await supabase
        .from('turnos')
        .select('cliente_nombre, cliente_telefono, cliente_email, fecha_hora, servicios(nombre, precio)')
        .eq('negocio_id', negocioId)
        .order('fecha_hora', { ascending: false })

      if (error) throw error

      // Agrupar por teléfono como identificador único del cliente
      const clientesMap = {}
      ;(turnos || []).forEach(t => {
        const key = t.cliente_telefono || t.cliente_nombre
        if (!clientesMap[key]) {
          clientesMap[key] = {
            nombre: t.cliente_nombre,
            telefono: t.cliente_telefono,
            email: t.cliente_email || '',
            visitas: 0,
            ingresoTotal: 0,
            ultimaVisita: t.fecha_hora,
            primeraVisita: t.fecha_hora,
            servicios: new Set()
          }
        }
        clientesMap[key].visitas++
        clientesMap[key].ingresoTotal += (t.servicios?.precio || 0)
        clientesMap[key].primeraVisita = t.fecha_hora // como viene desc, la última iteración es la primera visita
        if (t.servicios?.nombre) clientesMap[key].servicios.add(t.servicios.nombre)
      })

      const listaClientes = Object.values(clientesMap).map(c => ({
        ...c,
        servicios: Array.from(c.servicios),
        frecuencia: c.visitas >= 10 ? 'VIP' : c.visitas >= 5 ? 'Frecuente' : c.visitas >= 2 ? 'Regular' : 'Nuevo'
      }))

      listaClientes.sort((a, b) => b.visitas - a.visitas)
      setClientes(listaClientes)
    } catch (e) {
      console.error('Error cargando clientes:', e.message)
    } finally {
      setCargandoClientes(false)
    }
  }

  // Cargar clientes cuando se selecciona la tab de clientes
  useEffect(() => {
    if (tab === 'clientes' && negocio && !negocio.es_admin_plataforma && clientes.length === 0) {
      cargarClientes(negocio.id)
    }
  }, [tab, negocio])

  /**
   * GESTIÓN DE MEDIA (CLOUDINARY) CON CARGAS INDEPENDIENTES
   */
  async function manejarSubidaImagen(e, tipo) {
    const file = e.target.files[0]
    if (!file) return
    
    if (tipo === 'logo') setSubiendoLogo(true)
    if (tipo === 'portada') setSubiendoPortada(true)
    
    const formData = new FormData()
    formData.append('file', file)
    formData.append('upload_preset', 'non_sistemas') 
    formData.append('cloud_name', 'ddp4r9dlu') 

    try {
      const res = await fetch('https://api.cloudinary.com/v1_1/ddp4r9dlu/image/upload', { method: 'POST', body: formData })
      const data = await res.json()
      
      if (data.secure_url) {
        const urlOptimizada = data.secure_url.replace('/upload/', '/upload/q_auto,f_auto/')
        if (tipo === 'logo') setLogoUrl(urlOptimizada)
        if (tipo === 'portada') setPortadaUrl(urlOptimizada)
      }
    } catch (error) {
      alert("Error en el servidor de imágenes. Intente nuevamente.")
    } finally {
      if (tipo === 'logo') setSubiendoLogo(false)
      if (tipo === 'portada') setSubiendoPortada(false)
    }
  }

  async function actualizarBranding() {
    setGuardandoPerfil(true)
    const updatePayload = { 
      color_primario: colorPrimario, 
      descripcion, 
      logo_url: logoUrl, 
      portada_url: portadaUrl, 
      instagram
    }
    
    // Solo agregamos campos extra si la tabla los soporta
    // (telefono, direccion, mensaje_bienvenida son opcionales)
    if (telefonoNegocio) updatePayload.telefono = telefonoNegocio
    if (direccionNegocio) updatePayload.direccion = direccionNegocio
    if (mensajeBienvenida) updatePayload.mensaje_bienvenida = mensajeBienvenida
    
    const { error } = await supabase
      .from('negocios')
      .update(updatePayload)
      .eq('id', negocio.id)

    if (!error) {
      setNegocio({ ...negocio, ...updatePayload })
      alert("Configuración guardada con éxito.")
    } else {
      // Si falla por campos extra, intentamos sin ellos
      const { error: e2 } = await supabase
        .from('negocios')
        .update({ color_primario: colorPrimario, descripcion, logo_url: logoUrl, portada_url: portadaUrl, instagram })
        .eq('id', negocio.id)
      
      if (!e2) {
        setNegocio({ ...negocio, color_primario: colorPrimario, descripcion, logo_url: logoUrl, portada_url: portadaUrl, instagram })
        alert("Marca actualizada. Algunos campos avanzados no están disponibles aún en tu base de datos.")
      } else {
        alert("Hubo un error al guardar la configuración.")
      }
    }
    setGuardandoPerfil(false)
  }

  /**
   * ONBOARDING: CREACIÓN TÉCNICA
   */
  async function handleOnboarding(e) {
    e.preventDefault()
    setCreando(true)
    const { data, error } = await supabase
      .from('negocios')
      .insert([{ 
        owner_id: session.user.id, 
        nombre: nombreNegocio, 
        rubro: rubroSeleccionado, 
        color_primario: '#0f172a', 
        estado_suscripcion: 'activo',
        es_admin_plataforma: import.meta.env.VITE_SUPERADMIN_EMAIL ? (session.user.email === import.meta.env.VITE_SUPERADMIN_EMAIL) : false
      }])
      .select().single()
    
    if (!error) {
      setNegocio(data)
    } else {
      console.error("Onboarding Error:", error.message)
    }
    setCreando(false)
  }

  // ===== HELPERS =====
  const formatearFechaRelativa = (fechaStr) => {
    if (!fechaStr) return ''
    const fecha = new Date(fechaStr)
    const ahora = new Date()
    const diff = ahora - fecha
    const mins = Math.floor(diff / 60000)
    const horas = Math.floor(diff / 3600000)
    const dias = Math.floor(diff / 86400000)
    
    if (mins < 1) return 'Ahora'
    if (mins < 60) return `Hace ${mins} min`
    if (horas < 24) return `Hace ${horas}h`
    if (dias < 7) return `Hace ${dias}d`
    if (dias < 30) return `Hace ${Math.floor(dias/7)} sem`
    return fecha.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
  }

  const formatearHora = (fechaStr) => {
    if (!fechaStr) return ''
    return new Date(fechaStr).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
  }

  const formatearFecha = (fechaStr) => {
    if (!fechaStr) return ''
    return new Date(fechaStr).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })
  }

  // Vocabulario dinámico según rubro del negocio (debe estar antes de tabsConfig)
  const vocab = getVocabulario(negocio?.rubro)

  // ===== DEFINICIÓN DE TABS (se usa vocab si está disponible, sino fallback genérico) =====
  const _tabServicios = vocab?.tabServicios || 'Servicios'
  const _tabStaff = vocab?.tabStaff || 'Staff'
  const _tabClientes = vocab?.tabClientes || 'Clientes'

  const tabsConfig = [
    { id: 'inicio', label: 'Monitor', d: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { id: 'agenda', label: 'Agenda', d: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
    { id: 'reportes', label: 'Reportes', d: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
    { id: 'servicios', label: _tabServicios, d: 'M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0-5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z' },
    { id: 'equipo', label: _tabStaff, d: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
    { id: 'horarios', label: 'Horarios', d: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
    { id: 'clientes', label: _tabClientes, d: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
    { id: 'ajustes', label: 'Ajustes', d: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' },
  ]

  // Bottom nav: 5 items para acceso rápido en móvil
  const bottomNavTabs = [
    tabsConfig[0], // Monitor
    tabsConfig[1], // Agenda
    tabsConfig[2], // Reportes
    tabsConfig[6], // Clientes
    tabsConfig[7], // Ajustes
  ]

  if (loading) return (
    <div className={`min-h-screen flex items-center justify-center ${negocio?.es_admin_plataforma ? 'bg-[#0A0A0B]' : 'bg-white'}`}>
      <div className={`w-6 h-6 border-2 rounded-full animate-spin ${negocio?.es_admin_plataforma ? 'border-white/10 border-t-white' : 'border-slate-200 border-t-slate-800'}`}></div>
    </div>
  )

  // ===== PANTALLA DE CUENTA SUSPENDIDA =====
  if (negocio && negocio.estado_suscripcion === 'suspendido' && !negocio.es_admin_plataforma) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] font-sans antialiased flex flex-col">
        {/* Navbar mínimo */}
        <nav className="h-14 border-b bg-white/90 backdrop-blur-md border-slate-200 shadow-sm flex items-center justify-between px-4 sticky top-0 z-50">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-slate-900 rounded-[0.4rem] flex items-center justify-center shadow-lg border border-white/10">
              <span className="text-white font-black text-[9px] italic">NS</span>
            </div>
            <div className="h-3 w-px mx-1 bg-slate-200"></div>
            <p className="text-[9px] font-bold tracking-[0.2em] uppercase text-slate-400">Cuenta Suspendida</p>
          </div>
          <button onClick={() => supabase.auth.signOut()} className="text-[9px] font-bold uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-opacity">Salir</button>
        </nav>

        {/* Contenido de bloqueo */}
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md w-full text-center animate-in zoom-in-95 duration-700">
            {/* Icono de bloqueo */}
            <div className="w-20 h-20 mx-auto mb-6 rounded-[1.5rem] bg-red-50 border-2 border-red-100 flex items-center justify-center">
              <svg className="w-10 h-10 text-red-400" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>

            {/* Mensaje principal */}
            <h2 className="text-2xl md:text-3xl font-bold tracking-tighter text-slate-900 mb-2">Cuenta Suspendida</h2>
            <p className="text-sm text-slate-500 font-medium leading-relaxed mb-8 max-w-sm mx-auto">
              Tu cuenta de <span className="font-bold text-slate-700">{negocio.nombre}</span> fue suspendida por el administrador de la plataforma. 
              Mientras esté suspendida, no podés acceder al panel de gestión ni recibir nuevas reservas.
            </p>

            {/* Info card */}
            <div className="bg-white rounded-[1.5rem] border border-slate-200 shadow-sm p-5 mb-4 text-left space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Negocio</span>
                <span className="text-sm font-bold text-slate-900">{negocio.nombre}</span>
              </div>
              <div className="h-px bg-slate-100"></div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Estado</span>
                <span className="text-[10px] font-black text-red-500 bg-red-50 px-2.5 py-1 rounded-lg uppercase tracking-widest">Suspendido</span>
              </div>
              <div className="h-px bg-slate-100"></div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Titular</span>
                <span className="text-xs font-medium text-slate-600">{session.user.email}</span>
              </div>
            </div>

            {/* Acciones */}
            <div className="space-y-3">
              <a 
                href={`mailto:soporte@nonsistemas.com?subject=Cuenta suspendida: ${negocio.nombre}&body=Hola, mi cuenta ${negocio.nombre} (ID: ${negocio.id}) fue suspendida. Solicito la reactivación.`}
                className="w-full py-4 rounded-xl bg-slate-900 text-white font-bold text-[10px] uppercase tracking-[0.2em] shadow-lg flex items-center justify-center gap-2 hover:bg-slate-800 transition-all active:scale-95"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Contactar Soporte
              </a>
              <button 
                onClick={() => supabase.auth.signOut()} 
                className="w-full py-4 rounded-xl bg-white border border-slate-200 text-slate-500 font-bold text-[10px] uppercase tracking-[0.2em] hover:bg-slate-50 transition-all active:scale-95"
              >
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const negociosFiltrados = todosLosNegocios.filter(n => 
    n.nombre.toLowerCase().includes(filtroBusqueda.toLowerCase()) || 
    n.rubro.toLowerCase().includes(filtroBusqueda.toLowerCase())
  )

  // Ordenar clientes según criterio
  const clientesOrdenados = [...clientes].sort((a, b) => {
    if (ordenClientes === 'nombre') return a.nombre.localeCompare(b.nombre)
    if (ordenClientes === 'reciente') return new Date(b.ultimaVisita) - new Date(a.ultimaVisita)
    if (ordenClientes === 'ingresos') return b.ingresoTotal - a.ingresoTotal
    return b.visitas - a.visitas
  })

  const clientesFiltrados = clientesOrdenados.filter(c =>
    c.nombre.toLowerCase().includes(busquedaCliente.toLowerCase()) ||
    c.telefono?.toLowerCase().includes(busquedaCliente.toLowerCase())
  )

  const publicSlug = negocio?.nombre?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || ''
  const publicLink = `${window.location.origin}/app/${publicSlug}/${negocio?.id || ''}`

  // Distribución semanal max para normalizar barras
  const maxSemanal = Math.max(...distribucionSemanal, 1)
  const diasSemanaLabels = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

  // Stats resumen del top de clientes
  const totalIngresosClientes = clientes.reduce((acc, c) => acc + c.ingresoTotal, 0)
  const clientesVIP = clientes.filter(c => c.frecuencia === 'VIP').length
  const clientesFrecuentes = clientes.filter(c => c.frecuencia === 'Frecuente').length


  return (
    <div className={`min-h-screen font-sans antialiased ${negocio?.es_admin_plataforma ? 'bg-[#0A0A0B] text-slate-100' : 'bg-[#F8FAFC] text-slate-900'}`}>
      
      {/* GLOBAL NAVBAR COMPACTO */}
      <nav className={`h-14 md:h-16 border-b flex items-center justify-between px-4 md:px-6 sticky top-0 z-50 ${negocio?.es_admin_plataforma ? 'bg-[#0A0A0B]/90 backdrop-blur-md border-white/5 shadow-2xl' : 'bg-white/90 backdrop-blur-md border-slate-200 shadow-sm'}`}>
        <div className="flex items-center gap-2 md:gap-3">
          <div className="w-7 h-7 md:w-8 md:h-8 bg-slate-900 rounded-[0.4rem] md:rounded-lg flex items-center justify-center shadow-lg border border-white/10">
            <span className="text-white font-black text-[9px] md:text-[10px] italic">NS</span>
          </div>
          <div className={`h-3 md:h-4 w-px mx-1 ${negocio?.es_admin_plataforma ? 'bg-white/10' : 'bg-slate-200'}`}></div>
          <p className="text-[9px] md:text-[10px] font-bold tracking-[0.2em] md:tracking-[0.3em] uppercase opacity-50">
            {negocio?.es_admin_plataforma ? 'Nucleus Master' : (negocio?.nombre || 'Panel')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {negocio && !negocio.es_admin_plataforma && (
            <button onClick={() => window.open(publicLink, '_blank')} className="hidden md:flex text-[9px] font-bold uppercase tracking-widest opacity-40 hover:opacity-100 transition-opacity items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Ver App
            </button>
          )}
          <button onClick={() => supabase.auth.signOut()} className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest opacity-40 hover:opacity-100 transition-opacity">Salir</button>
        </div>
      </nav>

      <main className={`max-w-7xl mx-auto p-4 md:p-8 ${!negocio?.es_admin_plataforma && negocio ? 'ns-has-bottom-nav' : ''}`}>
        
        {!negocio ? (
          /* ESCENARIO: ONBOARDING */
          <div className="max-w-xl mx-auto mt-4 md:mt-10">
            <div className="bg-white rounded-[2rem] md:rounded-[2.5rem] shadow-[0_20px_40px_-12px_rgba(0,0,0,0.1)] md:shadow-[0_32px_64px_-12px_rgba(0,0,0,0.1)] p-6 md:p-10 border border-slate-100 text-slate-900 animate-in zoom-in-95 duration-700">
              <h2 className="text-2xl md:text-3xl font-bold tracking-tighter mb-2">Non Sistemas</h2>
              <p className="text-slate-500 mb-8 md:mb-10 text-sm md:text-base font-medium">Inicie la activación de su infraestructura digital.</p>
              <form onSubmit={handleOnboarding} className="space-y-5 md:space-y-6">
                <div className="space-y-1">
                  <label className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Razón Social</label>
                  <input required className="w-full p-4 bg-slate-50 border border-slate-100 rounded-[1rem] md:rounded-2xl outline-none focus:bg-white focus:border-slate-900 transition-all font-semibold text-sm md:text-base" placeholder="Ej: Barbería Central, Restaurante La Casona" value={nombreNegocio} onChange={(e) => setNombreNegocio(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Ecosistema de Rubro</label>
                  <select className="w-full p-4 bg-slate-50 border border-slate-100 rounded-[1rem] md:rounded-2xl outline-none font-semibold cursor-pointer appearance-none text-sm md:text-base" value={rubroSeleccionado} onChange={(e) => setRubroSeleccionado(e.target.value)}>
                    {RUBROS_DISPONIBLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <button disabled={creando} className="w-full bg-slate-900 text-white font-bold py-4 md:py-5 rounded-[1rem] md:rounded-2xl active:scale-[0.98] transition-all uppercase tracking-[0.2em] text-[10px] md:text-[11px] shadow-xl md:shadow-2xl flex justify-center items-center mt-2">
                  {creando ? <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div> : 'Configurar Entorno'}
                </button>
              </form>
            </div>
          </div>
        ) : negocio.es_admin_plataforma ? (
          /* ==========================================================
             VISTA: SUPER ADMIN (NUCLEUS) — SIN CAMBIOS
             ========================================================== */
          <div className="space-y-6 md:space-y-8 animate-in fade-in duration-1000">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 md:gap-6">
              <div>
                <h2 className="text-3xl md:text-6xl font-bold tracking-tighter text-white">Nucleus Control</h2>
                <p className="text-slate-500 font-medium mt-1 md:mt-2 text-sm md:text-lg tracking-tight">Arquitectura centralizada de Non Sistemas.</p>
              </div>
              <div className="flex items-center gap-3 md:gap-4 bg-white/5 border border-white/10 px-4 md:px-6 py-2.5 md:py-3 rounded-[1rem] md:rounded-2xl">
                 <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]"></div>
                 <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-white/60">Sistema Estable</span>
              </div>
            </header>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
               {[
                 { label: 'Totales', val: statsGlobales.total, trend: 'Nodos' },
                 { label: 'Activas', val: statsGlobales.activos, trend: 'Suscrito' },
                 { label: 'Suspenso', val: statsGlobales.suspendidos, col: 'text-red-500', trend: 'Inactivo' },
                 { label: 'Dominante', val: Object.keys(statsGlobales.rubros).reduce((a, b) => statsGlobales.rubros[a] > statsGlobales.rubros[b] ? a : b, '...'), col: 'text-blue-400', trend: 'Mercado', truncate: true }
               ].map((s, i) => (
                 <div key={i} className="bg-white/5 border border-white/10 p-5 md:p-8 rounded-[1.5rem] md:rounded-[2rem] flex flex-col justify-between group hover:border-white/20 transition-all">
                    <p className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-slate-500 truncate">{s.label}</p>
                    <h3 className={`text-3xl md:text-5xl font-bold mt-4 md:mt-6 tracking-tighter group-hover:scale-105 transition-transform origin-left ${s.col || 'text-white'} ${s.truncate ? 'truncate text-2xl md:text-4xl' : ''}`}>{s.val}</h3>
                    <p className="text-[8px] md:text-[10px] font-bold mt-3 md:mt-4 opacity-30 uppercase tracking-widest">{s.trend}</p>
                 </div>
               ))}
            </div>
            <div className="bg-white/5 border border-white/10 rounded-[2rem] md:rounded-[2.5rem] p-5 md:p-10 shadow-2xl">
               <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-8 mb-6 md:mb-10">
                 <div>
                   <h4 className="text-lg md:text-xl font-bold text-white">Directorio Global</h4>
                   <p className="text-slate-500 text-xs md:text-sm mt-1">Gestión de licencias y accesos.</p>
                 </div>
                 <div className="relative w-full md:w-80">
                   <svg className="absolute left-4 md:left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeLinecap="round" strokeLinejoin="round"/></svg>
                   <input type="text" placeholder="Buscar por ID o Nombre..." className="w-full bg-white/5 border border-white/10 rounded-xl md:rounded-2xl py-3 md:py-4 pl-10 md:pl-12 pr-4 text-[11px] md:text-xs outline-none focus:border-white/30 transition-all font-medium text-white" value={filtroBusqueda} onChange={(e) => setFiltroBusqueda(e.target.value)} />
                 </div>
               </div>
               <div className="space-y-3">
                 {negociosFiltrados.map(n => (
                   <div key={n.id} className="bg-white/5 border border-white/5 hover:border-white/15 transition-all p-4 md:p-6 rounded-2xl md:rounded-3xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-6 group">
                      <div className="flex items-center gap-4 md:gap-6 w-full">
                        <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-white text-black flex items-center justify-center font-black text-lg md:text-xl shadow-xl transition-transform group-hover:rotate-6 shrink-0">{n.nombre.charAt(0)}</div>
                        <div className="overflow-hidden flex-1">
                          <p className="font-bold text-white text-base md:text-lg tracking-tight leading-none truncate">{n.nombre}</p>
                          <div className="flex items-center gap-2 md:gap-3 mt-2">
                             <span className="text-[8px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">{n.rubro}</span>
                             <span className="text-[8px] md:text-[9px] font-mono text-white/20 uppercase hidden sm:inline">• {n.id.slice(0,8)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 md:gap-3 w-full md:w-auto">
                        <button onClick={() => { const slug = n.nombre.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''); window.open(`/app/${slug}/${n.id}`, '_blank') }} className="p-3 md:p-4 bg-white/5 text-slate-400 hover:text-white rounded-xl md:rounded-2xl transition-all" title="Ver App Pública">
                          <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        </button>
                        <button onClick={() => gestionarSuscripcion(n.id, n.estado_suscripcion)} className={`flex-1 md:flex-none px-4 md:px-6 py-3 md:py-4 rounded-xl md:rounded-2xl font-bold text-[9px] md:text-[10px] uppercase tracking-widest transition-all ${n.estado_suscripcion === 'activo' ? 'bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white' : 'bg-green-500/10 text-green-400 hover:bg-green-500 hover:text-white'}`}>
                          {n.estado_suscripcion === 'activo' ? 'Suspender' : 'Activar'}
                        </button>
                      </div>
                   </div>
                 ))}
               </div>
            </div>
          </div>
        ) : (
          /* ==========================================================
             VISTA: DASHBOARD BUSINESS (OWNER) — MOBILE FIRST COMPLETO
             ========================================================== */
          <div className="space-y-4 md:space-y-6 animate-in slide-in-from-bottom-8 duration-700">
            
            {/* BRAND HERO — COMPACTO EN MOBILE */}
            <header className="ns-hero-compact relative overflow-hidden rounded-[1.3rem] md:rounded-[2.5rem] text-white group animate-in fade-in duration-500" style={{ background: `linear-gradient(135deg, #0f172a 0%, ${colorPrimario} 150%)` }}>
              <div className="relative z-10 flex items-start justify-between gap-3 md:gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5 md:mb-4 opacity-70">
                     <span className="relative flex h-1.5 w-1.5 md:h-2 md:w-2">
                       <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                       <span className="relative inline-flex rounded-full h-1.5 w-1.5 md:h-2 md:w-2 bg-green-500"></span>
                     </span>
                     <span className="text-[8px] md:text-[10px] font-bold uppercase tracking-[0.2em] md:tracking-[0.3em]">Operativo</span>
                  </div>
                  <h2 className="text-xl md:text-5xl font-bold tracking-tighter leading-tight truncate">{negocio.nombre}</h2>
                  <p className="text-[10px] md:text-lg mt-0.5 md:mt-3 opacity-80 font-medium tracking-tight">{negocio.rubro}</p>
                </div>
                {logoUrl && (
                  <div className="w-10 h-10 md:w-16 md:h-16 rounded-lg md:rounded-2xl overflow-hidden border-2 border-white/20 shadow-lg shrink-0 bg-white/10">
                    <img src={logoUrl} className="w-full h-full object-cover" alt="Logo" />
                  </div>
                )}
              </div>
              <div className="absolute -top-20 -right-20 md:-top-32 md:-right-32 w-64 h-64 md:w-96 md:h-96 bg-white/10 rounded-full blur-[80px] md:blur-[120px] group-hover:scale-110 transition-transform duration-1000"></div>
            </header>

            {/* TAB SELECTOR — DESKTOP ONLY */}
            <div className="hidden md:flex overflow-x-auto gap-1 md:gap-2 p-1 md:p-1.5 bg-white border border-slate-200 rounded-xl md:rounded-2xl w-fit no-scrollbar shadow-sm">
              {tabsConfig.map(i => (
                <button key={i.id} onClick={() => setTab(i.id)} className={`px-4 py-2.5 md:px-6 md:py-3 rounded-lg md:rounded-xl flex items-center gap-2 md:gap-3 text-[9px] md:text-[11px] shrink-0 font-bold uppercase tracking-widest transition-all ${tab === i.id ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'}`}>
                  <svg className="h-3 w-3 md:h-4 md:w-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d={i.d}/></svg>
                  {i.label}
                </button>
              ))}
            </div>

            {/* MOBILE TAB PILLS — Tabs no incluidos en el bottom nav */}
            <div className="flex md:hidden overflow-x-auto gap-2 no-scrollbar">
              {tabsConfig.filter(t => !bottomNavTabs.find(bn => bn.id === t.id)).map(i => (
                <button key={i.id} onClick={() => setTab(i.id)} className={`px-4 py-2.5 rounded-xl flex items-center gap-2 text-[9px] shrink-0 font-bold uppercase tracking-widest transition-all border ${tab === i.id ? 'bg-slate-900 text-white shadow-lg border-slate-900' : 'text-slate-500 hover:text-slate-900 bg-white border-slate-200'}`}>
                  <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d={i.d}/></svg>
                  {i.label}
                </button>
              ))}
            </div>

            {/* AREA DE CONTENIDO PRINCIPAL */}
            <div className="ns-mobile-content-area">

              {/* ====== TAB: MONITOR — MEJORADO ====== */}
              {tab === 'inicio' && (
                <div className="space-y-4 md:space-y-6 animate-in fade-in duration-700">
                  
                  {/* PRÓXIMA CITA CARD — Solo si existe */}
                  {proximaCita && (
                    <div className="bg-white p-4 md:p-6 rounded-[1.5rem] md:rounded-[2rem] border border-slate-200 shadow-sm flex items-center gap-4 relative overflow-hidden">
                      <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl md:rounded-2xl flex items-center justify-center shrink-0 text-white font-black text-sm shadow-lg" style={{ backgroundColor: colorPrimario }}>
                        {formatearHora(proximaCita.fecha_hora)?.split(':')[0] || ''}
                        <span className="text-[8px] font-bold ml-0.5">:{formatearHora(proximaCita.fecha_hora)?.split(':')[1] || ''}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">{vocab.proximaCita}</p>
                        <h4 className="text-sm md:text-base font-bold text-slate-900 truncate">{proximaCita.cliente_nombre}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded uppercase tracking-widest">{proximaCita.servicios?.nombre || vocab.servicio}</span>
                          <span className="text-[9px] text-slate-400 font-medium">{formatearFecha(proximaCita.fecha_hora)}</span>
                        </div>
                      </div>
                      <button onClick={() => {
                        const num = proximaCita.cliente_telefono?.replace(/[^0-9]/g, '') || ''
                        window.open(`https://wa.me/${num}`, '_blank')
                      }} className="w-10 h-10 rounded-xl bg-green-50 text-green-500 flex items-center justify-center hover:bg-green-500 hover:text-white transition-all shrink-0">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.888-.788-1.489-1.761-1.663-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 00-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                      </button>
                    </div>
                  )}

                  {/* KPIs GRID */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="ns-stat-mini group">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{vocab.monitorTurnos}</p>
                      <h3 className="text-3xl md:text-5xl font-bold text-slate-900 tracking-tighter group-hover:scale-105 transition-transform origin-left">{stats.hoy}</h3>
                      <div className="flex items-center gap-1.5 text-[9px] font-bold text-blue-500 uppercase tracking-widest">
                         <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" strokeWidth="3"/></svg>
                         En agenda
                      </div>
                    </div>

                    <div className="ns-stat-mini group">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{vocab.monitorIngresos}</p>
                      <h3 className="text-3xl md:text-5xl font-bold tracking-tighter group-hover:scale-105 transition-transform origin-left text-[#34C759]">${stats.ingresos.toLocaleString()}</h3>
                      <p className="text-[9px] font-medium text-slate-400 italic">{vocab.turnos} activos</p>
                    </div>

                    <div className="ns-stat-mini group">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{vocab.monitorSemana}</p>
                      <h3 className="text-3xl md:text-5xl font-bold tracking-tighter group-hover:scale-105 transition-transform origin-left text-slate-900">{stats.semana}</h3>
                      <p className="text-[9px] font-medium text-slate-400 italic">{vocab.turnos} agendados</p>
                    </div>

                    <div className="ns-stat-mini group">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{vocab.clientes.charAt(0).toUpperCase() + vocab.clientes.slice(1)}</p>
                      <h3 className="text-3xl md:text-5xl font-bold tracking-tighter group-hover:scale-105 transition-transform origin-left text-slate-900">{clientes.length}</h3>
                      <p className="text-[9px] font-medium text-slate-400 italic">Registrados</p>
                    </div>
                  </div>

                  {/* DISTRIBUCIÓN SEMANAL + SERVICIO POPULAR */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                    {/* Mini Chart Semanal */}
                    <div className="bg-white p-5 md:p-6 rounded-[1.5rem] md:rounded-[2rem] border border-slate-200 shadow-sm">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-4">Actividad Semanal</p>
                      <div className="flex items-end gap-2 h-24 md:h-32">
                        {distribucionSemanal.map((val, idx) => (
                          <div key={idx} className="flex-1 flex flex-col items-center gap-1.5">
                            <span className="text-[9px] font-bold text-slate-500">{val}</span>
                            <div 
                              className="w-full rounded-lg transition-all duration-700" 
                              style={{ 
                                height: `${Math.max(8, (val / maxSemanal) * 100)}%`,
                                backgroundColor: idx === new Date().getDay() - 1 || (new Date().getDay() === 0 && idx === 6) ? colorPrimario : '#e2e8f0'
                              }}
                            ></div>
                            <span className="text-[8px] font-bold text-slate-400 uppercase">{diasSemanaLabels[idx]}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Info Cards Stack */}
                    <div className="space-y-3">
                      {/* Servicio Popular */}
                      <div className="bg-white p-5 rounded-[1.5rem] border border-slate-200 shadow-sm flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center shrink-0">
                          <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{vocab.monitorPopular}</p>
                          <p className="text-sm font-bold text-slate-900 truncate mt-0.5">{stats.popular !== '-' ? stats.popular : 'Sin datos aún'}</p>
                        </div>
                      </div>

                      {/* Ingresos del Mes */}
                      <div className="bg-white p-5 rounded-[1.5rem] border border-slate-200 shadow-sm flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center shrink-0">
                          <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Ingresos del Mes</p>
                          <p className="text-sm font-bold text-[#34C759] mt-0.5">${stats.mesIngresos.toLocaleString()}</p>
                        </div>
                      </div>

                      {/* Tasa de ocupación */}
                      <div className="bg-white p-5 rounded-[1.5rem] border border-slate-200 shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Ocupación Semanal</p>
                          <span className="text-sm font-black text-slate-900">{stats.tasaOcupacion}%</span>
                        </div>
                        <div className="ns-progress-bar">
                          <div className="ns-progress-fill" style={{ width: `${stats.tasaOcupacion}%` }}></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ACCIONES RÁPIDAS */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
                    {[
                      { label: vocab.accionNueva, icon: 'M12 4v16m8-8H4', action: () => setTab('agenda') },
                      { label: vocab.accionServicio, icon: 'M12 4v16m8-8H4', action: () => setTab('servicios') },
                      { label: 'Copiar Link', icon: 'M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3', action: () => { navigator.clipboard.writeText(publicLink); alert('Link copiado') } },
                      { label: 'Ver App Pública', icon: 'M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14', action: () => window.open(publicLink, '_blank') }
                    ].map((a, i) => (
                      <button key={i} onClick={a.action} className="bg-white p-4 rounded-[1.2rem] border border-slate-200 shadow-sm flex flex-col items-center gap-2.5 hover:border-slate-400 hover:shadow-md transition-all active:scale-95 group">
                        <div className="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center group-hover:bg-slate-900 group-hover:text-white transition-all">
                          <svg className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d={a.icon} strokeLinecap="round" strokeLinejoin="round"/></svg>
                        </div>
                        <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500">{a.label}</span>
                      </button>
                    ))}
                  </div>

                  {/* ACTIVIDAD RECIENTE */}
                  {actividadReciente.length > 0 && (
                    <div className="bg-white rounded-[1.5rem] md:rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
                      <div className="p-5 md:p-6 border-b border-slate-100 flex items-center justify-between">
                        <div>
                          <h4 className="text-sm md:text-base font-bold text-slate-900">Actividad Reciente</h4>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Últimos movimientos</p>
                        </div>
                        <button onClick={() => setTab('agenda')} className="text-[9px] font-bold uppercase tracking-widest text-blue-500 hover:text-blue-700 transition-colors">
                          Ver Todo
                        </button>
                      </div>
                      <div className="divide-y divide-slate-50">
                        {actividadReciente.slice(0, 5).map((act, idx) => (
                          <div key={idx} className="px-5 md:px-6 py-3.5 flex items-center gap-3 hover:bg-slate-50/50 transition-colors">
                            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                              <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-slate-900 truncate">{act.cliente_nombre}</p>
                              <p className="text-[9px] text-slate-400 font-medium truncate">{act.servicios?.nombre || vocab.servicio} — {act.empleados?.nombre?.split(' ')[0] || vocab.fallbackStaff}</p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-[10px] font-bold text-slate-500">{formatearHora(act.fecha_hora)}</p>
                              <p className="text-[9px] text-slate-400 font-medium">{formatearFechaRelativa(act.fecha_hora)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* LINK PÚBLICO WIDGET */}
                  <div className="bg-slate-900 p-5 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] text-white relative overflow-hidden shadow-xl">
                     <div className="relative z-10">
                        <h4 className="text-lg md:text-xl font-bold tracking-tight mb-1 md:mb-3">Link de Reservas</h4>
                        <p className="text-slate-400 text-[11px] md:text-sm font-medium mb-4">{vocab.linkDescripcion}</p>
                        <div className="flex items-center bg-white/10 border border-white/10 rounded-xl p-3 cursor-pointer hover:bg-white/20 transition-all group" onClick={() => {
                           navigator.clipboard.writeText(publicLink); 
                           alert("Link copiado")
                        }}>
                           <code className="text-[9px] md:text-[11px] text-blue-300 font-mono truncate flex-1">{publicLink}</code>
                           <svg className="w-4 h-4 ml-2 text-white/30 group-hover:text-white transition-colors shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"/></svg>
                        </div>
                     </div>
                     <div className="absolute -top-16 -right-16 w-48 h-48 bg-white/5 rounded-full blur-[60px]"></div>
                  </div>
                </div>
              )}

              {/* GESTIÓN DINÁMICA DE TABS */}
              <div className="animate-in fade-in slide-in-from-left-4 duration-500">
                {tab === 'agenda' && <Turnos negocioId={negocio.id} rubro={negocio.rubro} />}
                {tab === 'reportes' && <Reportes negocioId={negocio.id} colorPrimario={colorPrimario} rubro={negocio.rubro} />}
                {tab === 'servicios' && <Servicios negocioId={negocio.id} rubro={negocio.rubro} />}
                {tab === 'equipo' && <Empleados negocioId={negocio.id} rubro={negocio.rubro} />}
                {tab === 'horarios' && <ConfiguracionHorarios negocio={negocio} onUpdate={() => inicializarPanel()} />}
              </div>

              {/* ====== TAB: CLIENTES — COMPLETO ====== */}
              {tab === 'clientes' && (
                <div className="space-y-4 animate-in fade-in duration-700">
                  {/* HEADER + BÚSQUEDA */}
                  <header className="flex flex-col gap-3 bg-white p-5 md:p-6 rounded-[1.5rem] md:rounded-[2rem] shadow-sm border border-slate-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-xl md:text-3xl font-bold tracking-tighter text-slate-900 leading-none">{vocab.clientePlural}</h2>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1">{clientes.length} registrados</p>
                      </div>
                    </div>
                    
                    {/* STATS RÁPIDOS DE CLIENTES */}
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-slate-50 rounded-xl p-3 text-center">
                        <p className="text-lg md:text-2xl font-black text-slate-900">{clientes.length}</p>
                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Total</p>
                      </div>
                      <div className="bg-amber-50 rounded-xl p-3 text-center">
                        <p className="text-lg md:text-2xl font-black text-amber-600">{clientesVIP + clientesFrecuentes}</p>
                        <p className="text-[8px] font-bold text-amber-500 uppercase tracking-widest">Recurrentes</p>
                      </div>
                      <div className="bg-green-50 rounded-xl p-3 text-center">
                        <p className="text-lg md:text-2xl font-black text-green-600">${totalIngresosClientes.toLocaleString()}</p>
                        <p className="text-[8px] font-bold text-green-500 uppercase tracking-widest">Facturado</p>
                      </div>
                    </div>

                    {/* BÚSQUEDA + ORDENAR */}
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        <input type="text" placeholder="Buscar cliente..." className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-10 pr-4 text-xs outline-none focus:bg-white focus:border-slate-400 transition-all font-medium" value={busquedaCliente} onChange={(e) => setBusquedaCliente(e.target.value)} />
                      </div>
                      <select value={ordenClientes} onChange={(e) => setOrdenClientes(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-500 outline-none cursor-pointer appearance-none">
                        <option value="visitas">Visitas</option>
                        <option value="nombre">Nombre</option>
                        <option value="reciente">Reciente</option>
                        <option value="ingresos">Ingresos</option>
                      </select>
                    </div>
                  </header>

                  {cargandoClientes ? (
                    <div className="flex justify-center items-center h-40">
                      <div className="w-6 h-6 border-2 border-slate-200 border-t-slate-900 rounded-full animate-spin"></div>
                    </div>
                  ) : clientesFiltrados.length === 0 ? (
                    <div className="bg-white rounded-[1.5rem] border border-dashed border-slate-300 p-12 flex flex-col items-center text-center">
                      <svg className="w-12 h-12 text-slate-300 mb-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest">Sin clientes</h3>
                      <p className="text-[11px] font-medium text-slate-500 mt-2 max-w-[250px]">Los clientes aparecerán automáticamente cuando recibas tu primera reserva.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {clientesFiltrados.map((c, idx) => (
                        <div key={idx} className="ns-client-card hover:border-slate-300 hover:shadow-md">
                          <div className="ns-client-avatar" style={c.frecuencia === 'VIP' ? { backgroundColor: '#fef3c7', color: '#d97706' } : {}}>
                            {c.nombre?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                          <div className="flex-1 overflow-hidden">
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-sm text-slate-900 truncate">{c.nombre}</h4>
                              <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0 ${
                                c.frecuencia === 'VIP' ? 'bg-amber-100 text-amber-700' :
                                c.frecuencia === 'Frecuente' ? 'bg-blue-50 text-blue-600' :
                                c.frecuencia === 'Regular' ? 'bg-slate-100 text-slate-500' :
                                'bg-green-50 text-green-600'
                              }`}>{c.frecuencia}</span>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] font-bold text-slate-400 tracking-wide">{c.telefono}</span>
                              {c.email && (
                                <>
                                  <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                                  <span className="text-[10px] font-medium text-slate-400 truncate">{c.email}</span>
                                </>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                              <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded uppercase tracking-widest">{c.visitas} visita{c.visitas !== 1 ? 's' : ''}</span>
                              <span className="text-[9px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded uppercase tracking-widest">${c.ingresoTotal.toLocaleString()}</span>
                              <span className="text-[9px] text-slate-400 font-medium">Última: {formatearFechaRelativa(c.ultimaVisita)}</span>
                            </div>
                          </div>
                          <div className="flex flex-col gap-1.5 shrink-0">
                            <button onClick={() => {
                              const num = c.telefono?.replace(/[^0-9]/g, '') || ''
                              window.open(`https://wa.me/${num}?text=${encodeURIComponent(`Hola ${c.nombre.split(' ')[0]}, te escribimos desde ${negocio.nombre}.`)}`, '_blank')
                            }} className="w-9 h-9 rounded-xl bg-green-50 text-green-500 flex items-center justify-center hover:bg-green-500 hover:text-white transition-all" title="WhatsApp">
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.888-.788-1.489-1.761-1.663-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 00-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                            </button>
                            <button onClick={() => {
                              const num = c.telefono?.replace(/[^0-9]/g, '') || ''
                              window.open(`tel:${num}`)
                            }} className="w-9 h-9 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center hover:bg-blue-500 hover:text-white transition-all" title="Llamar">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ====== TAB: AJUSTES — COMPLETO ====== */}
              {tab === 'ajustes' && (
                <div className="space-y-4 md:space-y-5 animate-in fade-in duration-700 max-w-2xl">
                  
                  {/* SECCIÓN: PERFIL DEL NEGOCIO */}
                  <div className="ns-settings-card">
                    <div className="ns-settings-card-header">
                      <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.172-1.172a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 115.656-5.656L10 6.343l1.172-1.172z"/></svg>
                      <h4>Perfil y Marca</h4>
                    </div>
                    <div className="p-5 md:p-6 space-y-5">
                      {/* Color Primario */}
                      <div>
                        <label className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Color de Interfaz</label>
                        <div className="flex gap-3 items-center bg-slate-50 p-2.5 rounded-xl border border-slate-100 focus-within:border-slate-300 transition-all">
                          <input type="color" value={colorPrimario} onChange={(e) => setColorPrimario(e.target.value)} className="w-8 h-8 md:w-10 md:h-10 rounded-lg cursor-pointer border-none bg-transparent" />
                          <span className="font-mono text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-widest">{colorPrimario}</span>
                        </div>
                      </div>

                      {/* Descripción */}
                      <div>
                        <label className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Biografía</label>
                        <textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Frase de tu negocio que verán tus clientes..." className="w-full p-3 md:p-4 bg-slate-50 border border-slate-100 rounded-xl outline-none text-[11px] md:text-xs font-medium focus:bg-white focus:border-slate-900 transition-all h-20 md:h-28 resize-none leading-relaxed" />
                      </div>

                      {/* Instagram */}
                      <div>
                        <label className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Instagram</label>
                        <div className="flex items-center bg-slate-50 border border-slate-100 rounded-xl overflow-hidden focus-within:border-slate-300 transition-all">
                          <span className="px-3 text-slate-400 text-xs font-bold">@</span>
                          <input value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="tu_negocio" className="flex-1 p-3 bg-transparent outline-none text-xs font-bold text-slate-900" />
                        </div>
                      </div>

                      {/* Upload Logo y Portada */}
                      <div className="grid grid-cols-2 gap-3 md:gap-4">
                        <div className="space-y-2">
                          <label className="text-[8px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest flex justify-between items-center">
                            Logo 
                            {subiendoLogo && <div className="w-2.5 h-2.5 border-2 border-slate-300 border-t-slate-900 rounded-full animate-spin"></div>}
                          </label>
                          <div className="relative aspect-square bg-slate-50 rounded-xl border border-slate-200 border-dashed flex items-center justify-center overflow-hidden group hover:border-slate-400 transition-colors">
                             {logoUrl ? <img src={logoUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform" /> : <svg className="h-5 w-5 text-slate-300" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>}
                             <input type="file" accept="image/*" onChange={(e) => manejarSubidaImagen(e, 'logo')} className="absolute inset-0 opacity-0 cursor-pointer" />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[8px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest flex justify-between items-center">
                            Portada
                            {subiendoPortada && <div className="w-2.5 h-2.5 border-2 border-slate-300 border-t-slate-900 rounded-full animate-spin"></div>}
                          </label>
                          <div className="relative aspect-square bg-slate-50 rounded-xl border border-slate-200 border-dashed flex items-center justify-center overflow-hidden group hover:border-slate-400 transition-colors">
                             {portadaUrl ? <img src={portadaUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform" /> : <svg className="h-5 w-5 text-slate-300" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>}
                             <input type="file" accept="image/*" onChange={(e) => manejarSubidaImagen(e, 'portada')} className="absolute inset-0 opacity-0 cursor-pointer" />
                          </div>
                        </div>
                      </div>

                      <button 
                        onClick={actualizarBranding} 
                        disabled={guardandoPerfil || subiendoLogo || subiendoPortada}
                        className="w-full py-4 rounded-xl text-white font-bold text-[9px] md:text-[10px] uppercase tracking-[0.2em] shadow-lg transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                        style={{ backgroundColor: colorPrimario }}
                      >
                        {guardandoPerfil ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : 'Guardar Perfil'}
                      </button>
                    </div>
                  </div>

                  {/* SECCIÓN: DATOS DE CONTACTO */}
                  <div className="ns-settings-card">
                    <div className="ns-settings-card-header">
                      <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      <h4>Datos de Contacto</h4>
                    </div>
                    <div className="p-5 md:p-6 space-y-4">
                      <div>
                        <label className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Teléfono / WhatsApp del Negocio</label>
                        <input value={telefonoNegocio} onChange={(e) => setTelefonoNegocio(e.target.value)} placeholder="Ej: +5493515551234" className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl outline-none text-xs font-bold text-slate-900 focus:bg-white focus:border-slate-300 transition-all" />
                      </div>
                      <div>
                        <label className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Dirección</label>
                        <input value={direccionNegocio} onChange={(e) => setDireccionNegocio(e.target.value)} placeholder="Ej: Av. Colón 1234, Córdoba" className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl outline-none text-xs font-bold text-slate-900 focus:bg-white focus:border-slate-300 transition-all" />
                      </div>
                      <div>
                        <label className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Mensaje de Bienvenida</label>
                        <textarea value={mensajeBienvenida} onChange={(e) => setMensajeBienvenida(e.target.value)} placeholder="Mensaje que verán tus clientes al abrir la app de reservas..." className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl outline-none text-[11px] font-medium focus:bg-white focus:border-slate-300 transition-all h-20 resize-none leading-relaxed" />
                      </div>
                      <button 
                        onClick={actualizarBranding} 
                        disabled={guardandoPerfil}
                        className="w-full py-3.5 rounded-xl bg-slate-900 text-white font-bold text-[9px] uppercase tracking-[0.2em] transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {guardandoPerfil ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : 'Guardar Contacto'}
                      </button>
                    </div>
                  </div>

                  {/* SECCIÓN: LINK PÚBLICO */}
                  <div className="ns-settings-card">
                    <div className="ns-settings-card-header">
                      <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      <h4>Link Público</h4>
                    </div>
                    <div className="p-5 md:p-6">
                      <p className="text-[11px] text-slate-500 font-medium mb-3">Este es tu link de reservas. Compartilo con tus clientes por WhatsApp, redes o donde quieras.</p>
                      <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl p-3 cursor-pointer hover:bg-slate-100 transition-all group" onClick={() => {
                        navigator.clipboard.writeText(publicLink)
                        alert("Link copiado al portapapeles")
                      }}>
                        <code className="text-[9px] md:text-[11px] text-blue-600 font-mono truncate flex-1">{publicLink}</code>
                        <svg className="w-4 h-4 ml-2 text-slate-400 group-hover:text-slate-900 transition-colors shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"/></svg>
                      </div>
                      <div className="grid grid-cols-2 gap-2 mt-3">
                        <button onClick={() => window.open(publicLink, '_blank')} className="py-3 rounded-xl bg-slate-50 border border-slate-200 text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all">
                          Vista Previa
                        </button>
                        <button onClick={() => {
                          const waMje = encodeURIComponent(`${vocab.shareWA} ${negocio.nombre}: ${publicLink}`)
                          window.open(`https://wa.me/?text=${waMje}`, '_blank')
                        }} className="py-3 rounded-xl bg-green-50 border border-green-200 text-[10px] font-bold uppercase tracking-widest text-green-600 hover:bg-green-500 hover:text-white hover:border-green-500 transition-all">
                          Compartir WA
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* SECCIÓN: INFORMACIÓN DE CUENTA */}
                  <div className="ns-settings-card">
                    <div className="ns-settings-card-header">
                      <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      <h4>Cuenta</h4>
                    </div>
                    <div className="ns-settings-row">
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Email</p>
                        <p className="text-sm font-bold text-slate-900 mt-0.5">{session.user.email}</p>
                      </div>
                    </div>
                    <div className="ns-settings-row">
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Rubro</p>
                        <p className="text-sm font-bold text-slate-900 mt-0.5">{negocio.rubro}</p>
                      </div>
                    </div>
                    <div className="ns-settings-row">
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Estado</p>
                        <p className={`text-sm font-bold mt-0.5 ${negocio.estado_suscripcion === 'activo' ? 'text-green-600' : 'text-red-500'}`}>{negocio.estado_suscripcion === 'activo' ? 'Activo' : 'Suspendido'}</p>
                      </div>
                      <span className={`w-2.5 h-2.5 rounded-full ${negocio.estado_suscripcion === 'activo' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                    </div>
                    <div className="ns-settings-row">
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">ID del Negocio</p>
                        <p className="text-[10px] font-mono text-slate-500 mt-0.5 break-all">{negocio.id}</p>
                      </div>
                    </div>
                  </div>

                  {/* SECCIÓN: ZONA DE SEGURIDAD */}
                  <div className="ns-settings-card">
                    <div className="ns-settings-card-header">
                      <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      <h4>Seguridad</h4>
                    </div>
                    <button onClick={() => window.location.href = '/actualizar-clave'} className="ns-settings-row cursor-pointer w-full text-left hover:bg-slate-50">
                      <div className="flex items-center gap-3">
                        <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        <span className="text-sm font-bold text-slate-900">Cambiar Contraseña</span>
                      </div>
                      <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </button>
                    <button onClick={() => supabase.auth.signOut()} className="ns-settings-row cursor-pointer w-full text-left hover:bg-red-50 group">
                      <div className="flex items-center gap-3">
                        <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        <span className="text-sm font-bold text-red-500">Cerrar Sesión</span>
                      </div>
                      <svg className="w-4 h-4 text-red-300" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </button>
                  </div>

                </div>
              )}

            </div>
          </div>
        )}
      </main>

      {/* ====== BOTTOM NAVIGATION BAR — MOBILE ONLY ====== */}
      {negocio && !negocio.es_admin_plataforma && (
        <nav className="ns-bottom-nav md:hidden">
          {bottomNavTabs.map(item => (
            <button 
              key={item.id} 
              onClick={() => setTab(item.id)} 
              className={`ns-bottom-nav-item ${tab === item.id ? 'active' : ''}`}
            >
              <svg fill="none" stroke="currentColor" strokeWidth={tab === item.id ? "2.5" : "2"} viewBox="0 0 24 24">
                <path d={item.d} strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span>{item.label}</span>
              {tab === item.id && <div className="w-1 h-1 rounded-full bg-slate-900 mt-px"></div>}
            </button>
          ))}
        </nav>
      )}
    </div>
  )
}