import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { useNavigate } from 'react-router-dom'

// Inyección de componentes modulares
import Turnos from './Turnos'
import Servicios from './Servicios'
import Empleados from './Empleados'
import ConfiguracionHorarios from './ConfiguracionHorarios'

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
  const [stats, setStats] = useState({ hoy: 0, ingresos: 0, popular: '-' })
  
  // Lógica Granular de Carga
  const [guardandoPerfil, setGuardandoPerfil] = useState(false)
  const [subiendoLogo, setSubiendoLogo] = useState(false)
  const [subiendoPortada, setSubiendoPortada] = useState(false)

  // --- ESTADOS: ONBOARDING ---
  const [nombreNegocio, setNombreNegocio] = useState('')
  const [rubroSeleccionado, setRubroSeleccionado] = useState('Barbería / Peluquería')
  const [creando, setCreando] = useState(false)

  // --- ESTADOS: BRANDING & UI ---
  const [colorPrimario, setColorPrimario] = useState('#0f172a')
  const [descripcion, setDescripcion] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [portadaUrl, setPortadaUrl] = useState('')
  const [instagram, setInstagram] = useState('')

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
          await cargarMetricasNegocio(data.id)
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
    const { error } = await supabase
      .from('negocios')
      .update({ estado_suscripcion: nuevoEstado })
      .eq('id', id)
    
    if (!error) cargarConsolaMaestra()
  }

  /**
   * LÓGICA NEGOCIO: BUSINESS INTELLIGENCE (Timezone Safe)
   */
  async function cargarMetricasNegocio(negocioId) {
    const hoyInicio = new Date()
    hoyInicio.setHours(0, 0, 0, 0)

    const { data: turnos, error } = await supabase
      .from('turnos')
      .select('*, servicios(nombre, precio)')
      .eq('negocio_id', negocioId)
      .eq('estado', 'confirmado')
      .gte('fecha_hora', hoyInicio.toISOString())

    if (error) {
      console.error('Error obteniendo métricas:', error.message)
      return
    }

    if (turnos) {
      const ingresos = turnos.reduce((acc, t) => acc + (t.servicios?.precio || 0), 0)
      setStats({ hoy: turnos.length, ingresos, popular: '-' })
    }
  }

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
    const { error } = await supabase
      .from('negocios')
      .update({ 
        color_primario: colorPrimario, 
        descripcion, 
        logo_url: logoUrl, 
        portada_url: portadaUrl, 
        instagram 
      })
      .eq('id', negocio.id)

    if (!error) {
      setNegocio({ ...negocio, color_primario: colorPrimario, descripcion, logo_url: logoUrl, portada_url: portadaUrl, instagram })
      alert("Marca sincronizada con éxito.")
    } else {
      alert("Hubo un error al guardar la configuración.")
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

  if (loading) return (
    <div className={`min-h-screen flex items-center justify-center ${negocio?.es_admin_plataforma ? 'bg-[#0A0A0B]' : 'bg-white'}`}>
      <div className={`w-6 h-6 border-2 rounded-full animate-spin ${negocio?.es_admin_plataforma ? 'border-white/10 border-t-white' : 'border-slate-200 border-t-slate-800'}`}></div>
    </div>
  )

  const negociosFiltrados = todosLosNegocios.filter(n => 
    n.nombre.toLowerCase().includes(filtroBusqueda.toLowerCase()) || 
    n.rubro.toLowerCase().includes(filtroBusqueda.toLowerCase())
  )

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
            {negocio?.es_admin_plataforma ? 'Nucleus Master' : 'Management Console'}
          </p>
        </div>
        <button onClick={() => supabase.auth.signOut()} className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest opacity-40 hover:opacity-100 transition-opacity">Salir</button>
      </nav>

      <main className="max-w-7xl mx-auto p-4 md:p-8">
        
        {!negocio ? (
          /* ESCENARIO: ONBOARDING */
          <div className="max-w-xl mx-auto mt-4 md:mt-10">
            <div className="bg-white rounded-[2rem] md:rounded-[2.5rem] shadow-[0_20px_40px_-12px_rgba(0,0,0,0.1)] md:shadow-[0_32px_64px_-12px_rgba(0,0,0,0.1)] p-6 md:p-10 border border-slate-100 text-slate-900 animate-in zoom-in-95 duration-700">
              <h2 className="text-2xl md:text-3xl font-bold tracking-tighter mb-2">Non Sistemas</h2>
              <p className="text-slate-500 mb-8 md:mb-10 text-sm md:text-base font-medium">Inicie la activación de su infraestructura digital.</p>
              <form onSubmit={handleOnboarding} className="space-y-5 md:space-y-6">
                <div className="space-y-1">
                  <label className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Razón Social</label>
                  <input required className="w-full p-4 bg-slate-50 border border-slate-100 rounded-[1rem] md:rounded-2xl outline-none focus:bg-white focus:border-slate-900 transition-all font-semibold text-sm md:text-base" placeholder="Ej: Barbería Central" value={nombreNegocio} onChange={(e) => setNombreNegocio(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Ecosistema de Rubro</label>
                  <select className="w-full p-4 bg-slate-50 border border-slate-100 rounded-[1rem] md:rounded-2xl outline-none font-semibold cursor-pointer appearance-none text-sm md:text-base" value={rubroSeleccionado} onChange={(e) => setRubroSeleccionado(e.target.value)}>
                    <option>Barbería / Peluquería</option>
                    <option>Centro de Estética</option>
                    <option>Veterinaria</option>
                    <option>Salud / Clínica</option>
                    <option>Otros Servicios</option>
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
             VISTA: SUPER ADMIN (NUCLEUS) COMPACTA
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

            {/* BENTO GRID: GLOBAL ANALYTICS */}
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

            {/* BENTO: CLIENT DATABASE */}
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
                        <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-white text-black flex items-center justify-center font-black text-lg md:text-xl shadow-xl transition-transform group-hover:rotate-6 shrink-0">
                          {n.nombre.charAt(0)}
                        </div>
                        <div className="overflow-hidden flex-1">
                          <p className="font-bold text-white text-base md:text-lg tracking-tight leading-none truncate">{n.nombre}</p>
                          <div className="flex items-center gap-2 md:gap-3 mt-2">
                             <span className="text-[8px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">{n.rubro}</span>
                             <span className="text-[8px] md:text-[9px] font-mono text-white/20 uppercase hidden sm:inline">• {n.id.slice(0,8)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 md:gap-3 w-full md:w-auto">
                        <button onClick={() => {
                          const slug = n.nombre.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                          window.open(`/app/${slug}/${n.id}`, '_blank')
                        }} className="p-3 md:p-4 bg-white/5 text-slate-400 hover:text-white rounded-xl md:rounded-2xl transition-all" title="Ver App Pública">
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
             VISTA: DASHBOARD BUSINESS (OWNER) COMPACTA
             ========================================================== */
          <div className="space-y-4 md:space-y-6 animate-in slide-in-from-bottom-8 duration-700">
            
            {/* BRAND HERO */}
            <header className="p-6 md:p-14 rounded-[2rem] md:rounded-[3rem] text-white shadow-xl relative overflow-hidden transition-all duration-1000 group" style={{ backgroundColor: colorPrimario }}>
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-3 md:mb-4 opacity-70">
                   <span className="relative flex h-1.5 w-1.5 md:h-2 md:w-2">
                     <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                     <span className="relative inline-flex rounded-full h-1.5 w-1.5 md:h-2 md:w-2 bg-green-500"></span>
                   </span>
                   <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-[0.2em] md:tracking-[0.3em]">Operativo</span>
                </div>
                <h2 className="text-3xl md:text-6xl font-bold tracking-tighter leading-tight max-w-2xl">{negocio.nombre}</h2>
                <p className="text-sm md:text-xl mt-2 md:mt-4 opacity-80 font-medium tracking-tight">{negocio.rubro}</p>
              </div>
              <div className="absolute -top-20 -right-20 md:-top-32 md:-right-32 w-64 h-64 md:w-96 md:h-96 bg-white/10 rounded-full blur-[80px] md:blur-[120px] group-hover:scale-110 transition-transform duration-1000"></div>
            </header>

            {/* TAB SELECTOR BENTO */}
            <div className="flex overflow-x-auto gap-1 md:gap-2 p-1 md:p-1.5 bg-white border border-slate-200 rounded-xl md:rounded-2xl w-full md:w-fit no-scrollbar shadow-sm">
              {[
                { id: 'inicio', label: 'Monitor', d: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
                { id: 'agenda', label: 'Agenda', d: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
                { id: 'servicios', label: 'Servicios', d: 'M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0-5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z' },
                { id: 'equipo', label: 'Staff', d: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
                { id: 'horarios', label: 'Horarios', d: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' }
              ].map(i => (
                <button key={i.id} onClick={() => setTab(i.id)} className={`px-4 py-2.5 md:px-6 md:py-3 rounded-lg md:rounded-xl flex items-center gap-2 md:gap-3 text-[9px] md:text-[11px] shrink-0 font-bold uppercase tracking-widest transition-all ${tab === i.id ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'}`}>
                  <svg className="h-3 w-3 md:h-4 md:w-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d={i.d}/></svg>
                  {i.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
              
              {/* AREA PRINCIPAL */}
              <div className="lg:col-span-2 space-y-4 md:space-y-6">
                {tab === 'inicio' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-1000">
                    
                    <div className="bg-white p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col justify-between group">
                      <p className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest">Turnos Próximos</p>
                      <h3 className="text-5xl md:text-7xl font-bold text-slate-900 tracking-tighter group-hover:scale-105 transition-transform origin-left mt-2 md:mt-0">{stats.hoy}</h3>
                      <div className="flex items-center gap-2 mt-4 text-[9px] md:text-[10px] font-bold text-blue-500 uppercase tracking-widest">
                         <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" strokeWidth="3"/></svg>
                         En agenda global
                      </div>
                    </div>

                    <div className="bg-white p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col justify-between group">
                      <p className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ingresos Proyectados Futuros</p>
                      <h3 className="text-5xl md:text-7xl font-bold text-slate-900 tracking-tighter group-hover:scale-105 transition-transform origin-left mt-2 md:mt-0 text-[#34C759]">${stats.ingresos}</h3>
                      <p className="text-[9px] md:text-[10px] font-medium text-slate-400 mt-4 leading-tight italic">Cotización de reservas activas.</p>
                    </div>

                    {/* MARKETING WIDGET */}
                    <div className="md:col-span-2 bg-slate-900 p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] text-white flex flex-col sm:flex-row items-start sm:items-center gap-6 md:gap-10 relative overflow-hidden shadow-xl">
                       <div className="flex-1 z-10 w-full">
                          <h4 className="text-xl md:text-2xl font-bold tracking-tight mb-2 md:mb-4">Link Público</h4>
                          <p className="text-slate-400 text-xs md:text-sm font-medium leading-relaxed mb-6 md:mb-8">Envíe este link por WhatsApp o péguelo en Instagram.</p>
                          <div className="flex items-center bg-white/10 border border-white/10 rounded-xl md:rounded-2xl p-3 md:p-4 cursor-pointer hover:bg-white/20 transition-all group" onClick={() => {
                             const slug = negocio.nombre.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                             navigator.clipboard.writeText(`${window.location.origin}/app/${slug}/${negocio.id}`); 
                             alert("Link copiado")
                          }}>
                             <code className="text-[10px] md:text-[11px] text-blue-300 font-mono truncate flex-1">{window.location.origin}/app/{negocio.nombre.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}/{negocio.id}</code>
                             <svg className="w-4 h-4 ml-3 md:ml-4 text-white/30 group-hover:text-white transition-colors shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"/></svg>
                          </div>
                       </div>
                       <div className="hidden sm:flex w-24 h-24 md:w-40 md:h-40 bg-white rounded-2xl md:rounded-[2rem] p-3 md:p-4 shadow-2xl rotate-3 flex-col items-center justify-center gap-2 border-[6px] md:border-8 border-slate-100 shrink-0">
                          <div className="w-full h-full border-2 border-slate-100 border-dashed rounded-lg md:rounded-xl flex items-center justify-center text-slate-200 font-bold text-[8px] md:text-[10px] uppercase text-center">QR</div>
                       </div>
                    </div>
                  </div>
                )}

                {/* GESTIÓN DINÁMICA DE TABS */}
                <div className="animate-in fade-in slide-in-from-left-4 duration-500">
                  {tab === 'agenda' && <Turnos negocioId={negocio.id} />}
                  {tab === 'servicios' && <Servicios negocioId={negocio.id} />}
                  {tab === 'equipo' && <Empleados negocioId={negocio.id} />}
                  {tab === 'horarios' && <ConfiguracionHorarios negocio={negocio} onUpdate={() => inicializarPanel()} />}
                </div>
              </div>

              {/* COLUMNA BRANDING (BENTO LATERAL COMPACTO) */}
              <div className="space-y-4 md:space-y-6">
                <section className="bg-white p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] border border-slate-200 shadow-sm relative overflow-hidden">
                  <h4 className="text-[9px] md:text-[10px] font-bold text-slate-900 uppercase tracking-[0.2em] mb-6 md:mb-8 flex items-center gap-2 md:gap-3">
                    <svg className="w-3.5 h-3.5 md:w-4 md:h-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.172-1.172a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 115.656-5.656L10 6.343l1.172-1.172z"/></svg>
                    Branding
                  </h4>
                  
                  <div className="space-y-5 md:space-y-6">
                    <div>
                      <label className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 md:mb-3 block">Color Interfaz</label>
                      <div className="flex gap-3 md:gap-4 items-center bg-slate-50 p-2 md:p-3 rounded-xl md:rounded-2xl border border-slate-100 focus-within:border-slate-300 transition-all">
                        <input type="color" value={colorPrimario} onChange={(e) => setColorPrimario(e.target.value)} className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl cursor-pointer border-none bg-transparent" />
                        <span className="font-mono text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-widest">{colorPrimario}</span>
                      </div>
                    </div>

                    <div>
                      <label className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Biografía</label>
                      <textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Frase de negocio..." className="w-full p-3 md:p-4 bg-slate-50 border border-slate-100 rounded-xl md:rounded-2xl outline-none text-[11px] md:text-xs font-medium focus:bg-white focus:border-slate-900 transition-all h-20 md:h-28 resize-none leading-relaxed" />
                    </div>

                    <div className="grid grid-cols-2 gap-3 md:gap-4">
                      {/* Logo Upload Box */}
                      <div className="space-y-2">
                        <label className="text-[8px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest flex justify-between items-center">
                          Logo 
                          {subiendoLogo && <div className="w-2.5 h-2.5 md:w-3 md:h-3 border-2 border-slate-300 border-t-slate-900 rounded-full animate-spin"></div>}
                        </label>
                        <div className="relative aspect-square bg-slate-50 rounded-xl md:rounded-2xl border border-slate-200 border-dashed flex items-center justify-center overflow-hidden group hover:border-slate-400 transition-colors">
                           {logoUrl ? <img src={logoUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform" /> : <svg className="h-5 w-5 md:h-6 md:w-6 text-slate-300" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>}
                           <input type="file" accept="image/*" onChange={(e) => manejarSubidaImagen(e, 'logo')} className="absolute inset-0 opacity-0 cursor-pointer" />
                        </div>
                      </div>

                      {/* Portada Upload Box */}
                      <div className="space-y-2">
                        <label className="text-[8px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest flex justify-between items-center">
                          Portada
                          {subiendoPortada && <div className="w-2.5 h-2.5 md:w-3 md:h-3 border-2 border-slate-300 border-t-slate-900 rounded-full animate-spin"></div>}
                        </label>
                        <div className="relative aspect-square bg-slate-50 rounded-xl md:rounded-2xl border border-slate-200 border-dashed flex items-center justify-center overflow-hidden group hover:border-slate-400 transition-colors">
                           {portadaUrl ? <img src={portadaUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform" /> : <svg className="h-5 w-5 md:h-6 md:w-6 text-slate-300" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>}
                           <input type="file" accept="image/*" onChange={(e) => manejarSubidaImagen(e, 'portada')} className="absolute inset-0 opacity-0 cursor-pointer" />
                        </div>
                      </div>
                    </div>

                    <button 
                      onClick={actualizarBranding} 
                      disabled={guardandoPerfil || subiendoLogo || subiendoPortada}
                      className="w-full py-4 md:py-5 rounded-xl md:rounded-2xl text-white font-bold text-[9px] md:text-[10px] uppercase tracking-[0.2em] shadow-lg transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
                      style={{ backgroundColor: colorPrimario }}
                    >
                      {guardandoPerfil ? <div className="w-3 h-3 md:w-4 md:h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : 'Guardar Perfil'}
                    </button>
                  </div>
                </section>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}