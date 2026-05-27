import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { useNavigate } from 'react-router-dom'

// Inyección de componentes modulares
import Turnos from './Turnos'
import Servicios from './Servicios'
import Empleados from './Empleados'
import ConfiguracionHorarios from './ConfiguracionHorarios'
import Reportes from './Reportes'
import Inventario from './Inventario'
import FlyerCreator from './FlyerCreator'

// Sistema de Vocabulario Multi-Negocio
import { getVocabulario, RUBROS_DISPONIBLES } from '../utils/vocabulario'

// Wizard de Onboarding Guiado
import OnboardingWizard from './OnboardingWizard'

// Panel de Configuración Guiada Post-Onboarding
import GuidedSetup from './GuidedSetup'

// Hooks globales
import { useToast } from './Toast'
import { useConfirm } from '../contexts/ConfirmContext'

// Iconos
import { IconCheckCircle } from './NoniIcons'

// Componentes del Dashboard
import DashboardTour, { useTour } from './DashboardTour'
import FloatingAssistant from './FloatingAssistant'
import NotificationCenter from './NotificationCenter'
import GlobalSearch from './GlobalSearch'

// Widgets Pro del Monitor
import KpiStrip from './dashboard/KpiStrip'
import SmartInsights from './dashboard/SmartInsights'
import TodayTimeline from './dashboard/TodayTimeline'
import FloatingActionMenu from './dashboard/FloatingActionMenu'

// Theme
import { ThemeToggle } from '../contexts/ThemeContext'

export default function Dashboard({ session }) {
  const showToast = useToast()
  const { showConfirm } = useConfirm()
  // --- ESTADOS DE CARGA Y AUTENTICACIÓN ---
  const [loading, setLoading] = useState(true)
  const [negocio, setNegocio] = useState(null)

  // --- ESTADOS EXCLUSIVOS: NUCLEUS CONTROL (SUPER ADMIN) ---
  const [todosLosNegocios, setTodosLosNegocios] = useState([])
  const [filtroBusqueda, setFiltroBusqueda] = useState('')
  const [statsGlobales, setStatsGlobales] = useState({ total: 0, activos: 0, suspendidos: 0, rubros: {} })

  // --- ESTADOS: GESTIÓN DE NEGOCIO (OWNER) ---
  const [tab, setTab] = useState('inicio')
  const [drawerOpen, setDrawerOpen] = useState(false)
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
  const [mapaUrl, setMapaUrl] = useState('')
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

  // --- ESTADOS: CRM STATS (NUEVO) ---
  const [crmStats, setCrmStats] = useState({ stockBajo: 0, empleadosActivos: 0, totalEmpleados: 0, totalServicios: 0 })

  // --- ESTADOS: DISTRIBUCIÓN SEMANAL ---
  const [distribucionSemanal, setDistribucionSemanal] = useState([0, 0, 0, 0, 0, 0, 0])

  // --- ESTADOS: UI ---
  const [searchOpen, setSearchOpen] = useState(false)
  const [copyToast, setCopyToast] = useState(false)

  // --- TOUR GUIADO ---
  const tour = useTour()

  const navigate = useNavigate()

  // --- UTILIDADES DE EXPORTACIÓN ---
  function exportToCSV(data, filename, columns) {
    const header = columns.map(c => c.label).join(',')
    const rows = data.map(row =>
      columns.map(c => {
        const val = typeof c.key === 'function' ? c.key(row) : row[c.key]
        return `"${String(val ?? '').replace(/"/g, '""')}"`
      }).join(',')
    )
    const csv = [header, ...rows].join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${filename}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  function exportReportPDF({ title, negocioNombre, sections }) {
    // Generate a printable HTML report and trigger print dialog
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title} - ${negocioNombre}</title>
    <style>body{font-family:Inter,system-ui,sans-serif;padding:40px;color:#0f172a}
    h1{font-size:24px;margin-bottom:4px}h2{font-size:16px;margin-top:24px;color:#64748b;border-bottom:1px solid #e2e8f0;padding-bottom:8px}
    .kpi-grid{display:flex;gap:16px;margin:12px 0}.kpi{background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px;flex:1;text-align:center}
    .kpi .val{font-size:24px;font-weight:800}.kpi .lbl{font-size:10px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;margin-top:4px}
    table{width:100%;border-collapse:collapse;margin:12px 0;font-size:12px}th{background:#f1f5f9;text-align:left;padding:8px 12px;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#64748b}
    td{padding:8px 12px;border-bottom:1px solid #f1f5f9}.meta{font-size:11px;color:#94a3b8;margin-top:4px}</style></head><body>
    <h1>${title}</h1><p class="meta">${negocioNombre} — ${new Date().toLocaleDateString('es-ES', { day:'numeric',month:'long',year:'numeric' })}</p>`
    + sections.map(s => {
      let content = `<h2>${s.title}</h2>`
      if (s.type === 'kpi') {
        content += '<div class="kpi-grid">' + s.data.map(k => `<div class="kpi"><div class="val">${k.value}</div><div class="lbl">${k.label}</div></div>`).join('') + '</div>'
      } else if (s.type === 'table' && s.data) {
        content += '<table><thead><tr>' + s.columns.map(c => `<th>${c.label}</th>`).join('') + '</tr></thead><tbody>'
        + s.data.map(row => '<tr>' + s.columns.map(c => {
          const val = typeof c.key === 'function' ? c.key(row) : row[c.key]
          return `<td>${val ?? ''}</td>`
        }).join('') + '</tr>').join('') + '</tbody></table>'
      }
      return content
    }).join('')
    + '</body></html>'
    const w = window.open('', '_blank')
    w.document.write(html)
    w.document.close()
    w.print()
  }

  useEffect(() => {
    if (session) {
      inicializarPanel()
    }
  }, [session])

  // --- GLOBAL SEARCH KEYBOARD SHORTCUT (Cmd+K / Ctrl+K) ---
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(prev => !prev)
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

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
        setMapaUrl(data.mapa_url || '')
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
            cargarClientes(data.id),
            cargarCrmStats(data.id)
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
   * LÓGICA CRM: STOCK Y EMPLEADOS
   */
  async function cargarCrmStats(negocioId) {
    const { data: inv } = await supabase.from('inventario').select('cantidad, stock_minimo').eq('negocio_id', negocioId).eq('activo', true)
    let stockBajo = 0
    if (inv) {
      stockBajo = inv.filter(i => i.cantidad <= i.stock_minimo).length
    }

    const { data: emp } = await supabase.from('empleados').select('estado').eq('negocio_id', negocioId)
    let empActivos = 0
    let empTotal = 0
    if (emp) {
      empTotal = emp.length
      empActivos = emp.filter(e => e.estado === 'activo').length
    }

    const { count: svcCount } = await supabase.from('servicios').select('*', { count: 'exact', head: true }).eq('negocio_id', negocioId)

    setCrmStats({ stockBajo, empleadosActivos: empActivos, totalEmpleados: empTotal, totalServicios: svcCount || 0 })
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

    showConfirm({
      title: `¿${accion} Negocio?`,
      message: `¿Confirma que desea ${accion} a "${negocioTarget?.nombre || id}"?`,
      confirmText: accion,
      isDestructive: nuevoEstado === 'suspendido',
      onConfirm: async () => {
        const { data, error } = await supabase
          .from('negocios')
          .update({ estado_suscripcion: nuevoEstado })
          .eq('id', id)
          .select()

        if (error) {
          console.error('Error de RLS/Supabase:', error)
          showToast(`Error al ${accion.toLowerCase()}: ${error.message}`, 'error')
          return
        }

        if (!data || data.length === 0) {
          showToast(`No se pudo ${accion.toLowerCase()} el negocio debido a políticas de seguridad.`, 'error')
          return
        }

        cargarConsolaMaestra()
        showToast(`Negocio ${accion.toLowerCase()} correctamente`)
      }
    })
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
      const distSemanal = [0, 0, 0, 0, 0, 0, 0]
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
        ; (turnos || []).forEach(t => {
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
      showToast("Error en el servidor de imágenes. Intente nuevamente.", "error")
    } finally {
      if (tipo === 'logo') setSubiendoLogo(false)
      if (tipo === 'portada') setSubiendoPortada(false)
    }
  }

  async function actualizarBranding() {
    setGuardandoPerfil(true)

    // Payload base de branding (siempre existe)
    const brandingPayload = {
      color_primario: colorPrimario,
      descripcion,
      logo_url: logoUrl,
      portada_url: portadaUrl,
      instagram
    }

    // Payload de contacto (campos opcionales que pueden no existir en la DB)
    const contactoPayload = {}
    if (telefonoNegocio) contactoPayload.telefono = telefonoNegocio
    if (direccionNegocio) contactoPayload.direccion = direccionNegocio
    if (mapaUrl || mapaUrl === '') contactoPayload.mapa_url = mapaUrl
    if (mensajeBienvenida) contactoPayload.mensaje_bienvenida = mensajeBienvenida

    // Intento 1: Todo junto
    const fullPayload = { ...brandingPayload, ...contactoPayload }
    const { error } = await supabase
      .from('negocios')
      .update(fullPayload)
      .eq('id', negocio.id)

    if (!error) {
      setNegocio({ ...negocio, ...fullPayload })
      showToast("Configuración guardada con éxito.")
    } else {
      console.warn('Guardado completo falló, intentando por partes:', error.message)

      // Intento 2: Solo branding
      const { error: e2 } = await supabase
        .from('negocios')
        .update(brandingPayload)
        .eq('id', negocio.id)

      if (!e2) {
        setNegocio({ ...negocio, ...brandingPayload })
      }

      // Intento 3: Contacto campo por campo
      let contactoGuardado = false
      if (Object.keys(contactoPayload).length > 0) {
        for (const [campo, valor] of Object.entries(contactoPayload)) {
          const { error: ec } = await supabase
            .from('negocios')
            .update({ [campo]: valor })
            .eq('id', negocio.id)

          if (!ec) {
            setNegocio(prev => ({ ...prev, [campo]: valor }))
            contactoGuardado = true
          } else {
            console.warn(`Campo "${campo}" no existe en la DB. Ejecutá el SQL de migración.`)
          }
        }
      }

      if (!e2) {
        showToast(contactoGuardado
          ? "Configuración guardada con éxito."
          : "Marca guardada. Para datos de contacto, ejecutá el SQL de migración."
        )
      } else {
        showToast("Hubo un error al guardar. Revisá tu conexión.", "error")
      }
    }
    setGuardandoPerfil(false)
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
    if (dias < 30) return `Hace ${Math.floor(dias / 7)} sem`
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

  // ── Marcar recordatorio enviado proactivamente ──
  async function marcarRecordatorioEnviado(t) {
    const num = t.cliente_telefono?.replace(/[^0-9]/g, '') || ''
    const nombreCorto = t.cliente_nombre?.split(' ')[0] || ''
    const servNombre = t.servicios?.nombre?.toLowerCase() || vocab?.servicio || 'servicio'
    const horaStr = formatearHora(t.fecha_hora)
    const mje = `Hola ${nombreCorto}, te recuerdo tu ${servNombre} hoy a las ${horaStr} hs. ¡Te esperamos!`
    window.open(`https://wa.me/${num}?text=${encodeURIComponent(mje)}`, '_blank')

    const { error } = await supabase.from('turnos').update({ recordatorio_enviado: true }).eq('id', t.id)
    if (!error) {
      const actualizados = actividadReciente.map(turno => turno.id === t.id ? { ...turno, recordatorio_enviado: true } : turno)
      setActividadReciente(actualizados)
      if (proximaCita?.id === t.id) {
        setProximaCita({ ...proximaCita, recordatorio_enviado: true })
      }
    }
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

  // ===== DEFINICIÓN DE TABS (se usa vocab si está disponible, sino fallback genérico) =====
  const _tabServicios = vocab?.tabServicios || 'Servicios'
  const _tabStaff = vocab?.tabStaff || 'Staff'
  const _tabClientes = vocab?.tabClientes || 'Clientes'

  const tabsConfig = [
    { id: 'inicio', label: 'Monitor', group: 'Operación', d: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { id: 'agenda', label: 'Agenda', group: 'Operación', d: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
    { id: 'clientes', label: _tabClientes, group: 'Operación', d: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
    { id: 'servicios', label: _tabServicios, group: 'Catálogo', d: 'M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0-5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z' },
    { id: 'equipo', label: _tabStaff, group: 'Catálogo', d: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
    { id: 'horarios', label: 'Horarios', group: 'Catálogo', d: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
    { id: 'inventario', label: 'Inventario', group: 'Catálogo', d: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
    { id: 'reportes', label: 'Reportes', group: 'Análisis', d: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
    { id: 'flyer', label: 'Flyer', group: 'Análisis', d: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z' },
    { id: 'ajustes', label: 'Ajustes', group: 'Sistema', d: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' },
  ]

  // Agrupación para sidebar desktop
  const tabsGrouped = tabsConfig.reduce((acc, t) => {
    if (!acc[t.group]) acc[t.group] = []
    acc[t.group].push(t)
    return acc
  }, {})

  const tabActual = tabsConfig.find(t => t.id === tab) || tabsConfig[0]

  // Bottom nav: 4 items principales + botón "Más" que abre el drawer con todos los demás
  const bottomNavTabs = [
    tabsConfig.find(t => t.id === 'inicio'),
    tabsConfig.find(t => t.id === 'agenda'),
    tabsConfig.find(t => t.id === 'clientes'),
    tabsConfig.find(t => t.id === 'reportes'),
  ]

  if (loading) return (
    <div className={`min-h-screen flex items-center justify-center ${negocio?.es_admin_plataforma ? 'bg-[#0A0A0B]' : 'bg-[#F8FAFC]'}`} data-testid="dashboard-loading" style={{ fontFamily: '"Inter Tight", sans-serif' }}>
      <div className="flex flex-col items-center gap-5">
        <div className="relative">
          <div className={`w-11 h-11 rounded-md flex items-center justify-center ${negocio?.es_admin_plataforma ? 'bg-[#F8FAFC]' : 'bg-[#0F172A]'}`}>
            <span className={`font-black text-base tracking-tighter ${negocio?.es_admin_plataforma ? 'text-[#0A0A0B]' : 'text-[#F8FAFC]'}`} style={{ fontFamily: '"Fraunces", serif', fontStyle: 'italic' }}>N</span>
          </div>
          <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[#0EA5E9] animate-pulse" />
        </div>
        <div className={`w-32 h-px overflow-hidden ${negocio?.es_admin_plataforma ? 'bg-white/10' : 'bg-slate-300'}`}>
          <div className="h-full bg-[#0EA5E9]" style={{ width: '40%', animation: 'loadingBar 1.2s ease-in-out infinite' }}></div>
        </div>
      </div>
      <style>{`@keyframes loadingBar { 0% { transform: translateX(-100%); } 100% { transform: translateX(350%); } }`}</style>
    </div>
  )

  // ===== PANTALLA DE CUENTA SUSPENDIDA =====
  if (negocio && negocio.estado_suscripcion === 'suspendido' && !negocio.es_admin_plataforma) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] font-sans antialiased flex flex-col" style={{ fontFamily: '"Inter Tight", "Inter", sans-serif' }}>
        {/* Navbar editorial */}
        <nav className="h-14 border-b bg-[#F8FAFC]/95 backdrop-blur-md border-slate-300/70 shadow-[0_1px_0_rgba(0,0,0,0.02)] flex items-center justify-between px-4 sticky top-0 z-50" style={{ fontFamily: '"Inter Tight", sans-serif' }}>
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <div className="w-9 h-9 rounded-md bg-[#0F172A] flex items-center justify-center">
                <span className="text-[#F8FAFC] font-black text-[14px] tracking-tighter" style={{ fontFamily: '"Fraunces", serif', fontStyle: 'italic' }}>N</span>
              </div>
              <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-red-500" />
            </div>
            <div className="leading-none">
              <p className="font-bold text-[14px] text-[#0F172A] tracking-tight">Noni<span className="text-red-500">.</span></p>
              <p className="text-[9px] font-medium tracking-[0.2em] uppercase text-red-600 mt-1" style={{ fontFamily: '"JetBrains Mono", monospace' }}>Cuenta suspendida</p>
            </div>
          </div>
          <button onClick={() => supabase.auth.signOut()} className="text-[11px] font-semibold uppercase tracking-widest text-slate-600 hover:text-[#0F172A] transition-colors px-3 py-2 hover:bg-slate-200/60 rounded-md" style={{ fontFamily: '"JetBrains Mono", monospace' }}>Salir</button>
        </nav>

        {/* Contenido de bloqueo */}
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md w-full text-center animate-in zoom-in-95 duration-700">
            {/* Icono de bloqueo */}
            <div className="w-20 h-20 mx-auto mb-6 rounded-[1.5rem] bg-red-50 border-2 border-red-100 flex items-center justify-center">
              <svg className="w-10 h-10 text-red-400" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" strokeLinecap="round" strokeLinejoin="round" />
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
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" /></svg>
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
  const showCopyToast = () => { navigator.clipboard.writeText(publicLink).catch(() => { }); setCopyToast(true); setTimeout(() => setCopyToast(false), 3000) }

  // Distribución semanal max para normalizar barras
  const maxSemanal = Math.max(...distribucionSemanal, 1)
  const diasSemanaLabels = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

  // Stats resumen del top de clientes
  const totalIngresosClientes = clientes.reduce((acc, c) => acc + c.ingresoTotal, 0)
  const clientesVIP = clientes.filter(c => c.frecuencia === 'VIP').length
  const clientesFrecuentes = clientes.filter(c => c.frecuencia === 'Frecuente').length


  return (
    <div className={`min-h-screen font-sans antialiased ${negocio?.es_admin_plataforma ? 'bg-[#0A0A0B] text-slate-100' : 'bg-[#F8FAFC] text-[#0F172A]'}`}>

      {/* Copy-link toast */}
      {copyToast && (
        <div className="ns-copy-toast">
          <IconCheckCircle size={20} className="text-emerald-500 shrink-0" />
          <div>
            <p className="text-xs font-bold text-slate-900">¡Link copiado!</p>
            <p className="text-[10px] text-slate-400 font-medium">Compartilo por WhatsApp o redes</p>
          </div>
        </div>
      )}

      {/* GLOBAL NAVBAR EDITORIAL */}
      <nav className={`h-14 md:h-16 border-b flex items-center justify-between px-4 md:px-6 sticky top-0 z-50 ${negocio?.es_admin_plataforma ? 'bg-[#0A0A0B]/95 backdrop-blur-md border-white/5 shadow-2xl' : 'bg-[#F8FAFC]/95 backdrop-blur-md border-slate-300/70 shadow-[0_1px_0_rgba(0,0,0,0.02)]'}`} data-testid="dashboard-navbar" style={{ fontFamily: '"Inter Tight", "Inter", sans-serif' }}>
        <div className="flex items-center gap-2.5 md:gap-3">
          <div className="relative">
            <div className={`w-8 h-8 md:w-9 md:h-9 rounded-md flex items-center justify-center ${negocio?.es_admin_plataforma ? 'bg-[#F8FAFC]' : 'bg-[#0F172A]'}`}>
              <span className={`font-black text-[13px] md:text-[14px] tracking-tighter ${negocio?.es_admin_plataforma ? 'text-[#0A0A0B]' : 'text-[#F8FAFC]'}`} style={{ fontFamily: '"Fraunces", serif', fontStyle: 'italic' }}>N</span>
            </div>
            <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-[#0EA5E9]" />
          </div>
          <div className="hidden sm:block leading-none">
            <p className={`font-bold text-[13px] md:text-[14px] tracking-tight ${negocio?.es_admin_plataforma ? 'text-white' : 'text-[#0F172A]'}`}>
              Noni<span className="text-[#0EA5E9]">.</span>
            </p>
            <p className={`text-[8px] md:text-[9px] font-medium uppercase tracking-[0.22em] mt-1 ${negocio?.es_admin_plataforma ? 'text-white/45' : 'text-slate-500'}`} style={{ fontFamily: '"JetBrains Mono", monospace' }}>
              {negocio?.es_admin_plataforma ? 'Nucleus Master' : (negocio?.nombre || 'Workspace')}
            </p>
          </div>
          {/* Mobile-only label */}
          <div className="sm:hidden leading-none">
            <p className={`text-[10px] font-bold tracking-[0.18em] uppercase ${negocio?.es_admin_plataforma ? 'text-white/70' : 'text-slate-700'}`} style={{ fontFamily: '"JetBrains Mono", monospace' }}>
              {negocio?.es_admin_plataforma ? 'Nucleus' : (negocio?.nombre?.slice(0, 14) || 'Panel')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 md:gap-2">
          {negocio && !negocio.es_admin_plataforma && (
            <>
              <NotificationCenter negocioId={negocio.id} rubro={negocio.rubro} />

              <button onClick={() => setSearchOpen(true)} data-testid="global-search-btn" className="hidden md:flex items-center gap-2 px-3 py-2 bg-transparent hover:bg-slate-200/60 transition-all text-[11px] font-medium text-slate-600 border border-slate-300 rounded-md">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeLinecap="round" strokeLinejoin="round" /></svg>
                <span>Buscar</span>
                <kbd className="hidden lg:inline-flex px-1.5 py-0.5 bg-slate-100 text-[9px] font-bold text-slate-500 border border-slate-300 rounded-sm" style={{ fontFamily: '"JetBrains Mono", monospace' }}>⌘K</kbd>
              </button>

              <button onClick={() => window.open(publicLink, '_blank')} data-testid="open-public-link-btn" className="hidden md:inline-flex items-center gap-1.5 px-3 py-2 text-[11px] font-semibold text-slate-700 hover:text-[#0EA5E9] hover:bg-slate-200/60 border border-slate-300 transition-all rounded-md">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" strokeLinecap="round" strokeLinejoin="round" /></svg>
                <span>Ver app</span>
              </button>
            </>
          )}
          <ThemeToggle testId="theme-toggle-btn" className="!w-9 !h-9" />
          <button onClick={() => supabase.auth.signOut()} data-testid="signout-btn" className={`inline-flex items-center gap-1.5 px-3 py-2 text-[11px] font-semibold transition-all rounded-md ${negocio?.es_admin_plataforma ? 'text-white/60 hover:text-white hover:bg-white/5' : 'text-slate-600 hover:text-[#0F172A] hover:bg-slate-200/60'}`}>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" strokeLinecap="round" strokeLinejoin="round" /></svg>
            <span>Salir</span>
          </button>
        </div>
      </nav>

      {/* GLOBAL SEARCH MODAL (Cmd+K) */}
      {searchOpen && negocio && !negocio.es_admin_plataforma && (
        <GlobalSearch
          negocio={negocio}
          session={session}
          onNavigate={(t) => setTab(t)}
          onClose={() => setSearchOpen(false)}
        />
      )}

      <main className={`max-w-[1400px] mx-auto p-4 md:p-8 ${!negocio?.es_admin_plataforma && negocio ? 'ns-has-bottom-nav' : ''}`}>

        {!negocio ? (
          /* ESCENARIO: ONBOARDING WIZARD GUIADO */
          <OnboardingWizard session={session} onComplete={() => inicializarPanel()} />
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
                  <svg className="absolute left-4 md:left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeLinecap="round" strokeLinejoin="round" /></svg>
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
                          <span className="text-[8px] md:text-[9px] font-mono text-white/20 uppercase hidden sm:inline">• {n.id.slice(0, 8)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 md:gap-3 w-full md:w-auto">
                      <button onClick={() => { const slug = n.nombre.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''); window.open(`/app/${slug}/${n.id}`, '_blank') }} className="p-3 md:p-4 bg-white/5 text-slate-400 hover:text-white rounded-xl md:rounded-2xl transition-all" title="Ver App Pública">
                        <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" strokeLinecap="round" strokeLinejoin="round" /></svg>
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
             VISTA: DASHBOARD BUSINESS (OWNER) — EDITORIAL LAYOUT
             ========================================================== */
          <div className="md:grid md:grid-cols-[240px_1fr] md:gap-7 lg:gap-10 animate-in fade-in duration-500" style={{ fontFamily: '"Inter Tight", "Inter", sans-serif' }}>

            {/* ═════════════ SIDEBAR — DESKTOP ═════════════ */}
            <aside id="tour-tabs" className="hidden md:block">
              <div className="sticky top-20 space-y-7">
                {Object.entries(tabsGrouped).map(([groupName, items]) => (
                  <div key={groupName}>
                    <p className="px-3 mb-2 text-[9px] font-bold uppercase tracking-[0.25em] text-slate-500" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                      {groupName}
                    </p>
                    <nav className="space-y-0.5">
                      {items.map(i => {
                        const activo = tab === i.id
                        return (
                          <button
                            key={i.id}
                            id={i.id === 'servicios' ? 'tour-servicios' : i.id === 'agenda' ? 'tour-agenda' : i.id === 'ajustes' ? 'tour-ajustes' : undefined}
                            onClick={() => setTab(i.id)}
                            data-testid={`sidebar-tab-${i.id}`}
                            className={`w-full group flex items-center gap-2.5 px-3 py-2 rounded-md transition-all relative ${
                              activo
                                ? 'bg-[#0F172A] text-[#F8FAFC]'
                                : 'text-slate-700 hover:bg-slate-200/60 hover:text-[#0F172A]'
                            }`}
                          >
                            {activo && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-[#0EA5E9] rounded-r" />}
                            <svg className={`w-4 h-4 shrink-0 transition-colors ${activo ? 'text-[#0EA5E9]' : 'text-slate-500 group-hover:text-[#0F172A]'}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d={i.d} strokeLinecap="round" strokeLinejoin="round" /></svg>
                            <span className="text-[13px] font-semibold tracking-tight flex-1">{i.label}</span>
                            {/* Badge contador */}
                            {(() => {
                              let badge = 0
                              if (i.id === 'agenda') badge = stats?.hoy || 0
                              else if (i.id === 'inventario') badge = crmStats?.stockBajo || 0
                              else if (i.id === 'clientes') badge = clientes?.length || 0
                              if (badge === 0) return null
                              const esAlerta = i.id === 'inventario' && badge > 0
                              return (
                                <span className={`text-[9px] font-bold tabular-nums px-1.5 py-0.5 rounded ${
                                  activo
                                    ? 'bg-[#0EA5E9] text-white'
                                    : esAlerta
                                      ? 'bg-[#E0F2FE] text-[#0EA5E9] border border-[#0EA5E9]/30'
                                      : 'bg-slate-200 text-slate-700'
                                }`} style={{ fontFamily: '"JetBrains Mono", monospace' }} data-testid={`badge-${i.id}`}>
                                  {badge > 99 ? '99+' : badge}
                                </span>
                              )
                            })()}
                            {activo && <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>}
                          </button>
                        )
                      })}
                    </nav>
                  </div>
                ))}

                {/* Sidebar footer */}
                <div className="px-3 pt-5 border-t border-slate-300/70">
                  <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-slate-400 mb-1.5" style={{ fontFamily: '"JetBrains Mono", monospace' }}>Tu workspace</p>
                  <p className="text-[12px] font-semibold text-[#0F172A] truncate" title={negocio?.nombre}>{negocio?.nombre}</p>
                  <p className="text-[10px] text-slate-500 truncate mt-0.5">{negocio?.rubro}</p>
                </div>
              </div>
            </aside>

            {/* ═════════════ MAIN CONTENT ═════════════ */}
            <div className="space-y-5 md:space-y-7 min-w-0">

            {/* ─────── HERO COMPACTO EDITORIAL ─────── */}
            <header className="relative overflow-hidden rounded-xl bg-[#0F172A] text-[#F8FAFC] px-5 md:px-7 py-5 md:py-6 animate-in fade-in duration-500">
              {/* Subtle grain */}
              <div className="absolute inset-0 opacity-[0.04] pointer-events-none mix-blend-overlay" style={{
                backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")"
              }} />
              <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(255,79,0,0.18) 0%, transparent 70%)' }} />

              <div className="relative z-10 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 md:gap-4 min-w-0 flex-1">
                  {/* Avatar / logo */}
                  {logoUrl ? (
                    <div className="w-11 h-11 md:w-12 md:h-12 rounded-md overflow-hidden border border-white/15 shrink-0">
                      <img src={logoUrl} className="w-full h-full object-cover" alt="Logo" />
                    </div>
                  ) : (
                    <div className="w-11 h-11 md:w-12 md:h-12 rounded-md bg-white/10 border border-white/15 flex items-center justify-center shrink-0">
                      <span className="text-[#F8FAFC] font-black text-lg tracking-tighter" style={{ fontFamily: '"Fraunces", serif', fontStyle: 'italic' }}>
                        {negocio.nombre.charAt(0)}
                      </span>
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="flex h-1.5 w-1.5 relative shrink-0">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                      </span>
                      <span className="text-[9px] font-bold uppercase tracking-[0.25em] text-slate-300/80" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                        Operativo · {new Date().toLocaleDateString('es-AR', { weekday: 'short', day: '2-digit', month: 'short' })}
                      </span>
                    </div>
                    <h2 className="text-[20px] md:text-[28px] font-light tracking-[-0.025em] leading-tight truncate" style={{ fontFamily: '"Fraunces", serif' }}>
                      {tabActual.label} <em className="italic font-medium text-[#38BDF8]">·</em> <span className="font-bold">{negocio.nombre}</span>
                    </h2>
                  </div>
                </div>

                {/* Quick stat */}
                <div className="hidden sm:flex flex-col items-end shrink-0 pl-3 border-l border-white/10">
                  <span className="text-[9px] font-bold uppercase tracking-[0.25em] text-slate-400" style={{ fontFamily: '"JetBrains Mono", monospace' }}>Hoy</span>
                  <p className="text-[20px] md:text-[24px] font-bold text-[#F8FAFC] leading-none mt-1" style={{ fontFamily: '"Fraunces", serif' }}>
                    {stats.hoy}
                  </p>
                  <p className="text-[9px] text-slate-400 font-medium mt-0.5">{vocab.turnos}</p>
                </div>
              </div>
            </header>

            {/* ─────── MOBILE TAB CHIP (current section + menú) ─────── */}
            <div className="flex md:hidden items-center gap-2">
              <div className="flex-1 flex items-center gap-2.5 px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg shadow-sm">
                <svg className="w-4 h-4 text-[#0EA5E9] shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d={tabActual.d} strokeLinecap="round" strokeLinejoin="round" /></svg>
                <p className="text-[12px] font-bold text-[#0F172A] truncate flex-1">{tabActual.label}</p>
                <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                  {tabActual.group}
                </span>
              </div>
              <button
                onClick={() => setDrawerOpen(true)}
                data-testid="mobile-menu-btn"
                aria-label="Abrir menú"
                className="shrink-0 w-11 h-11 flex items-center justify-center bg-[#0F172A] text-[#F8FAFC] rounded-lg active:scale-95 transition-transform"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>

            {/* AREA DE CONTENIDO PRINCIPAL */}
            <div className="ns-mobile-content-area">

              {/* ====== TAB: MONITOR — MEJORADO ====== */}
              {tab === 'inicio' && (
                <div id="tour-monitor" className="space-y-4 md:space-y-6 animate-in fade-in duration-700">

                  {/* GUIDED SETUP — Checklist de configuración post-onboarding */}
                  <GuidedSetup
                    negocio={negocio}
                    serviciosCount={crmStats.totalServicios}
                    empleadosCount={crmStats.totalEmpleados}
                    onNavigate={(t) => setTab(t)}
                    onDismiss={() => { }}
                  />

                  {/* ═══════════ RESUMEN DE HOY ═══════════ */}
                  {(stats.hoy > 0 || actividadReciente.length > 0) && (() => {
                    const ahora = new Date()
                    const turnosHoyData = actividadReciente.filter(t => {
                      const td = new Date(t.fecha_hora)
                      return td.toDateString() === ahora.toDateString() && td > ahora
                    })
                    const turnosPasados = actividadReciente.filter(t => {
                      const td = new Date(t.fecha_hora)
                      return td.toDateString() === ahora.toDateString() && td <= ahora
                    })
                    const ingresosDia = [...turnosHoyData, ...turnosPasados].reduce((a, t) => a + (t.servicios?.precio || 0), 0)

                    // Turnos en próximas 2 horas para recordatorios
                    const en2h = new Date(ahora.getTime() + 2 * 60 * 60000)
                    const recordatorios = turnosHoyData.filter(t => {
                      const td = new Date(t.fecha_hora)
                      return td <= en2h && !t.recordatorio_enviado
                    })

                    // Countdown al próximo
                    let countdown = ''
                    if (turnosHoyData.length > 0) {
                      const proximo = new Date(turnosHoyData[0].fecha_hora)
                      const diffMin = Math.round((proximo - ahora) / 60000)
                      if (diffMin < 60) countdown = `en ${diffMin} min`
                      else countdown = `en ${Math.floor(diffMin / 60)}h ${diffMin % 60}m`
                    }

                    return (
                      <div className="bg-white rounded-xl border border-slate-300/70 shadow-sm overflow-hidden">
                        {/* Header */}
                        <div className="px-5 pt-5 pb-3 flex items-center justify-between border-b border-slate-200/80">
                          <div>
                            <h3 className="text-[13px] font-bold text-[#0F172A] tracking-tight">Resumen de hoy</h3>
                            <p className="text-[9px] font-medium text-slate-500 uppercase tracking-[0.25em] mt-1" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                              {ahora.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                            </p>
                          </div>
                          {countdown && (
                            <span className="text-[9px] font-bold text-[#0EA5E9] bg-[#E0F2FE] border border-[#0EA5E9]/20 px-3 py-1.5 rounded-md uppercase tracking-[0.18em]" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                              Próximo · {countdown}
                            </span>
                          )}
                        </div>

                        {/* Mini Stats */}
                        <div className="grid grid-cols-4 divide-x divide-slate-200">
                          <div className="p-4 text-center">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-1.5" style={{ fontFamily: '"JetBrains Mono", monospace' }}>{vocab.turnos}</p>
                            <p className="text-2xl font-bold text-[#0F172A] tracking-tight" style={{ fontFamily: '"Fraunces", serif' }}>{turnosHoyData.length + turnosPasados.length}</p>
                          </div>
                          <div className="p-4 text-center">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-1.5" style={{ fontFamily: '"JetBrains Mono", monospace' }}>Ingresos</p>
                            <p className="text-2xl font-bold text-emerald-700 tracking-tight" style={{ fontFamily: '"Fraunces", serif' }}>${ingresosDia.toLocaleString()}</p>
                          </div>
                          <div className="p-4 text-center">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-1.5" style={{ fontFamily: '"JetBrains Mono", monospace' }}>Atendidos</p>
                            <p className="text-2xl font-bold text-slate-600 tracking-tight" style={{ fontFamily: '"Fraunces", serif' }}>{turnosPasados.length}</p>
                          </div>
                          <div className="p-4 text-center">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-1.5" style={{ fontFamily: '"JetBrains Mono", monospace' }}>Pendientes</p>
                            <p className="text-2xl font-bold text-[#0EA5E9] tracking-tight" style={{ fontFamily: '"Fraunces", serif' }}>{turnosHoyData.length}</p>
                          </div>
                        </div>

                        {/* Banner de Recordatorios */}
                        {recordatorios.length > 0 && (
                          <div className="mx-5 mb-4 bg-amber-50 border border-amber-100 rounded-xl p-3">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
                              <p className="text-[10px] font-bold text-amber-700 uppercase tracking-widest">
                                {recordatorios.length} {recordatorios.length === 1 ? 'turno' : 'turnos'} en las próximas 2 horas
                              </p>
                            </div>
                            <div className="space-y-1.5">
                              {recordatorios.map(t => {
                                const hora = new Date(t.fecha_hora).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
                                const num = t.cliente_telefono?.replace(/[^0-9]/g, '') || ''
                                const nombreCorto = t.cliente_nombre?.split(' ')[0] || ''
                                const servNombre = t.servicios?.nombre?.toLowerCase() || vocab.servicio
                                const mje = `Hola ${nombreCorto}, te recuerdo tu ${servNombre} hoy a las ${hora} hs. ¡Te esperamos!`
                                return (
                                  <div key={t.id} className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <span className="text-xs font-black text-amber-800">{hora}</span>
                                      <span className="text-[10px] font-medium text-amber-700 truncate">{t.cliente_nombre}</span>
                                    </div>
                                    <button
                                      onClick={() => marcarRecordatorioEnviado(t)}
                                      className="flex items-center gap-1 px-2.5 py-1 bg-green-500 text-white rounded-lg text-[9px] font-bold uppercase tracking-wider hover:bg-green-600 transition-colors shrink-0"
                                    >
                                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" /></svg>
                                      Recordar
                                    </button>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })()}

                  {/* ═══════════ PRÓXIMA CITA — Card editorial con countdown ═══════════ */}
                  {proximaCita && (() => {
                    const ahora = new Date()
                    const cita = new Date(proximaCita.fecha_hora)
                    const diffMin = Math.round((cita - ahora) / 60000)
                    const numero = proximaCita.cliente_telefono?.replace(/[^0-9]/g, '') || ''
                    const hora = formatearHora(proximaCita.fecha_hora) || ''
                    return (
                      <div className="bg-white rounded-xl border border-slate-300/70 shadow-sm overflow-hidden" data-testid="proxima-cita">
                        <div className="grid grid-cols-1 md:grid-cols-[140px_1fr_auto] gap-0 md:divide-x md:divide-slate-200">
                          {/* Hora bloque */}
                          <div className="px-5 py-4 md:py-5 bg-[#0F172A] text-[#F8FAFC] flex md:flex-col items-center md:items-start justify-between md:justify-center gap-2">
                            <div>
                              <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-[#38BDF8] mb-1" style={{ fontFamily: '"JetBrains Mono", monospace' }}>{vocab.proximaCita}</p>
                              <p className="text-[32px] md:text-[38px] font-light leading-none tabular-nums tracking-tight" style={{ fontFamily: '"Fraunces", serif' }}>{hora}</p>
                            </div>
                            {diffMin > 0 && diffMin < 1440 && (
                              <span className="text-[9px] font-bold uppercase tracking-[0.22em] text-slate-400" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                                {diffMin < 60 ? `En ${diffMin} min` : `En ${Math.floor(diffMin / 60)}h ${diffMin % 60}m`}
                              </span>
                            )}
                          </div>
                          {/* Info */}
                          <div className="px-5 py-4 md:py-5 flex-1 min-w-0 flex flex-col justify-center">
                            <p className="text-[16px] md:text-[18px] font-bold text-[#0F172A] truncate" style={{ fontFamily: '"Fraunces", serif' }}>{proximaCita.cliente_nombre}</p>
                            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                              <span className="text-[10px] font-bold text-[#0F172A] bg-slate-100 border border-slate-300 px-2 py-0.5 rounded uppercase tracking-[0.18em]" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                                {proximaCita.servicios?.nombre || vocab.servicio}
                              </span>
                              <span className="text-[10px] text-slate-500 font-medium">{formatearFecha(proximaCita.fecha_hora)}</span>
                              {proximaCita.empleados?.nombre && (
                                <span className="text-[10px] text-slate-500 font-medium">· {proximaCita.empleados.nombre}</span>
                              )}
                            </div>
                          </div>
                          {/* Acciones */}
                          <div className="px-5 py-4 md:py-5 flex md:flex-col items-center md:items-stretch justify-center gap-2 border-t md:border-t-0 border-slate-200">
                            {numero && (
                              <a
                                href={`https://wa.me/${numero}?text=${encodeURIComponent(`Hola ${proximaCita.cliente_nombre?.split(' ')[0]}, te recuerdo tu ${(proximaCita.servicios?.nombre || vocab.servicio).toLowerCase()} hoy a las ${hora} hs. ¡Te esperamos!`)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={() => marcarRecordatorioEnviado(proximaCita)}
                                className={`inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-[10px] font-bold uppercase tracking-[0.18em] transition-colors ${proximaCita.recordatorio_enviado ? 'bg-emerald-600 text-white' : 'bg-emerald-500 text-white hover:bg-emerald-600'}`}
                                style={{ fontFamily: '"JetBrains Mono", monospace' }}
                                data-testid="proxima-cita-whatsapp"
                              >
                                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" /></svg>
                                {proximaCita.recordatorio_enviado ? 'Enviado' : 'Recordar'}
                              </a>
                            )}
                            <button
                              onClick={() => setTab('agenda')}
                              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-[10px] font-bold uppercase tracking-[0.18em] bg-transparent border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors"
                              style={{ fontFamily: '"JetBrains Mono", monospace' }}
                              data-testid="proxima-cita-ver"
                            >
                              Ver agenda
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })()}

                  {/* ═══════════ KPI STRIP — Pulse de operaciones con sparklines y delta ═══════════ */}
                  <KpiStrip
                    stats={stats}
                    clientes={clientes}
                    actividadReciente={actividadReciente}
                    distribucionSemanal={distribucionSemanal}
                    vocab={vocab}
                  />

                  {/* ═══════════ SMART INSIGHTS — Recomendaciones accionables en tiempo real ═══════════ */}
                  <SmartInsights
                    stats={stats}
                    crmStats={crmStats}
                    clientes={clientes}
                    actividadReciente={actividadReciente}
                    distribucionSemanal={distribucionSemanal}
                    proximaCita={proximaCita}
                    onNavigate={(t) => setTab(t)}
                    publicLink={publicLink}
                    vocab={vocab}
                  />

                  {/* ═══════════ TIMELINE DEL DÍA — Línea visual de turnos ═══════════ */}
                  <TodayTimeline
                    turnos={actividadReciente}
                    onClickTurno={() => setTab('agenda')}
                    vocab={vocab}
                  />

                  {/* ═══════════ CRM WIDGETS — Stock & Staff ═══════════ */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                    <button
                      onClick={() => setTab('inventario')}
                      className={`text-left p-5 rounded-xl border shadow-sm flex items-center justify-between group transition-all ${
                        crmStats.stockBajo > 0
                          ? 'bg-[#E0F2FE] border-[#0EA5E9]/30 hover:border-[#0EA5E9]'
                          : 'bg-white border-slate-300/70 hover:border-slate-400'
                      }`}
                      data-testid="widget-stock"
                    >
                      <div className="min-w-0">
                        <p className={`text-[9px] font-bold uppercase tracking-[0.22em] mb-2 ${crmStats.stockBajo > 0 ? 'text-[#0EA5E9]' : 'text-slate-500'}`} style={{ fontFamily: '"JetBrains Mono", monospace' }}>Alertas de stock</p>
                        <p className={`text-[32px] font-light tracking-[-0.03em] leading-none ${crmStats.stockBajo > 0 ? 'text-[#0EA5E9]' : 'text-[#0F172A]'}`} style={{ fontFamily: '"Fraunces", serif' }}>{crmStats.stockBajo}</p>
                        <p className={`text-[11px] mt-1.5 font-medium ${crmStats.stockBajo > 0 ? 'text-slate-700' : 'text-slate-500'}`}>
                          {crmStats.stockBajo > 0 ? 'Reponé antes de que se agoten' : 'Inventario en orden'}
                        </p>
                      </div>
                      <div className={`w-11 h-11 rounded-md flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${crmStats.stockBajo > 0 ? 'bg-[#0EA5E9] text-white' : 'bg-slate-100 text-slate-400'}`}>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      </div>
                    </button>

                    <button
                      onClick={() => setTab('equipo')}
                      className="text-left p-5 rounded-xl bg-white border border-slate-300/70 shadow-sm hover:border-slate-400 flex items-center justify-between group transition-all"
                      data-testid="widget-staff"
                    >
                      <div className="min-w-0">
                        <p className="text-[9px] font-bold uppercase tracking-[0.22em] mb-2 text-slate-500" style={{ fontFamily: '"JetBrains Mono", monospace' }}>Equipo activo</p>
                        <p className="text-[32px] font-light tracking-[-0.03em] leading-none text-[#0F172A]" style={{ fontFamily: '"Fraunces", serif' }}>
                          {crmStats.empleadosActivos}<span className="text-slate-400 text-[24px]"> / {crmStats.totalEmpleados}</span>
                        </p>
                        <p className="text-[11px] mt-1.5 font-medium text-slate-500">{vocab.empleados} disponibles</p>
                      </div>
                      <div className="w-11 h-11 rounded-md bg-[#0F172A] text-[#F8FAFC] flex items-center justify-center shrink-0 transition-transform group-hover:scale-105">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      </div>
                    </button>
                  </div>

                  {/* ═══════════ DISTRIBUCIÓN SEMANAL + INFO STACK ═══════════ */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
                    {/* Bar chart semanal */}
                    <div className="md:col-span-2 bg-white p-5 rounded-xl border border-slate-300/70 shadow-sm" data-testid="weekly-chart">
                      <div className="flex items-center justify-between mb-5">
                        <div>
                          <h3 className="text-[13px] font-bold text-[#0F172A] tracking-tight">Distribución semanal</h3>
                          <p className="text-[9px] font-medium text-slate-500 uppercase tracking-[0.22em] mt-1" style={{ fontFamily: '"JetBrains Mono", monospace' }}>{vocab.turnos} por día</p>
                        </div>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.22em]" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                          Total: {distribucionSemanal.reduce((a, b) => a + b, 0)}
                        </span>
                      </div>
                      <div className="flex items-end gap-2 md:gap-3 h-28 md:h-36">
                        {distribucionSemanal.map((val, idx) => {
                          const esHoy = idx === new Date().getDay() - 1 || (new Date().getDay() === 0 && idx === 6)
                          const altura = Math.max(4, (val / maxSemanal) * 100)
                          return (
                            <div key={idx} className="flex-1 flex flex-col items-center gap-2 group/bar">
                              <span className={`text-[10px] font-bold tabular-nums ${esHoy ? 'text-[#0EA5E9]' : 'text-slate-500'}`} style={{ fontFamily: '"JetBrains Mono", monospace' }}>{val || ''}</span>
                              <div className="w-full flex items-end" style={{ height: '100%' }}>
                                <div
                                  className={`w-full rounded-t transition-all duration-500 group-hover/bar:opacity-80 ${esHoy ? 'bg-[#0EA5E9]' : 'bg-slate-300'}`}
                                  style={{ height: `${altura}%`, minHeight: '4px' }}
                                />
                              </div>
                              <span className={`text-[9px] font-bold uppercase tracking-[0.18em] ${esHoy ? 'text-[#0EA5E9]' : 'text-slate-400'}`} style={{ fontFamily: '"JetBrains Mono", monospace' }}>{diasSemanaLabels[idx]}</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    {/* Info cards stack */}
                    <div className="space-y-3 md:space-y-4">
                      {/* Servicio popular */}
                      <div className="p-4 rounded-xl bg-white border border-slate-300/70 shadow-sm" data-testid="widget-popular">
                        <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-slate-500 mb-1.5" style={{ fontFamily: '"JetBrains Mono", monospace' }}>{vocab.monitorPopular}</p>
                        <p className="text-[16px] font-bold text-[#0F172A] truncate leading-tight" style={{ fontFamily: '"Fraunces", serif' }}>
                          {stats.popular !== '-' ? stats.popular : 'Sin datos aún'}
                        </p>
                        <p className="text-[10px] text-slate-500 mt-1.5 font-medium">Tu mejor servicio este mes</p>
                      </div>

                      {/* Ingresos mes */}
                      <div className="p-4 rounded-xl bg-[#0F172A] text-[#F8FAFC] shadow-sm relative overflow-hidden" data-testid="widget-mes">
                        <div className="absolute top-0 right-0 w-20 h-20 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(255,79,0,0.25) 0%, transparent 70%)' }} />
                        <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-slate-400 mb-1.5 relative" style={{ fontFamily: '"JetBrains Mono", monospace' }}>Ingresos del mes</p>
                        <p className="text-[22px] font-bold leading-none relative" style={{ fontFamily: '"Fraunces", serif' }}>
                          ${stats.mesIngresos.toLocaleString('es-AR')}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-1.5 font-medium relative">Acumulado del mes en curso</p>
                      </div>

                      {/* Ocupación */}
                      <div className="p-4 rounded-xl bg-white border border-slate-300/70 shadow-sm" data-testid="widget-ocupacion">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-slate-500" style={{ fontFamily: '"JetBrains Mono", monospace' }}>Ocupación</p>
                          <span className="text-[14px] font-bold text-[#0F172A] tabular-nums" style={{ fontFamily: '"Fraunces", serif' }}>{stats.tasaOcupacion}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-[#0EA5E9] to-[#FF8A3D] transition-all duration-700" style={{ width: `${stats.tasaOcupacion}%` }} />
                        </div>
                        <p className="text-[10px] text-slate-500 mt-2 font-medium">vs. capacidad semanal</p>
                      </div>
                    </div>
                  </div>

                  {/* ═══════════ ACCIONES RÁPIDAS ═══════════ */}
                  <div className="bg-white rounded-xl border border-slate-300/70 shadow-sm p-5" data-testid="quick-actions">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-[13px] font-bold text-[#0F172A] tracking-tight">Atajos rápidos</h3>
                        <p className="text-[9px] font-medium text-slate-500 uppercase tracking-[0.22em] mt-1" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                          Las acciones más usadas en un solo lugar
                        </p>
                      </div>
                      <button onClick={() => setSearchOpen(true)} className="hidden md:flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 hover:text-[#0EA5E9] transition-colors" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        Buscar · ⌘K
                      </button>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {[
                        { label: vocab.accionNueva || 'Nuevo turno', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z', action: () => setTab('agenda'), badge: 'A' },
                        { label: vocab.accionServicio || 'Nuevo servicio', icon: 'M12 4v16m8-8H4', action: () => setTab('servicios'), badge: 'S' },
                        { label: 'Copiar link público', icon: 'M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3', action: () => { navigator.clipboard.writeText(publicLink).catch(() => {}); showToast('¡Link copiado!') }, badge: 'L' },
                        { label: 'Ver agenda pública', icon: 'M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14', action: () => window.open(publicLink, '_blank'), badge: 'V' },
                      ].map((a, i) => (
                        <button key={i} onClick={a.action} className="group relative text-left p-3 rounded-md border border-slate-300 hover:border-[#0EA5E9] hover:bg-[#E0F2FE] transition-all active:scale-[0.98]" data-testid={`quick-action-${i}`}>
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="w-7 h-7 rounded-md bg-[#0F172A] text-[#F8FAFC] group-hover:bg-[#0EA5E9] flex items-center justify-center transition-colors shrink-0">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24"><path d={a.icon} strokeLinecap="round" strokeLinejoin="round" /></svg>
                            </span>
                          </div>
                          <p className="text-[11px] font-bold text-[#0F172A] leading-tight">{a.label}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* ═══════════ ACTIVIDAD RECIENTE — Editorial ═══════════ */}
                  {actividadReciente.length > 0 && (
                    <div className="bg-white rounded-xl border border-slate-300/70 shadow-sm overflow-hidden" data-testid="recent-activity">
                      <div className="px-5 py-4 border-b border-slate-200/80 flex items-center justify-between">
                        <div>
                          <h4 className="text-[13px] font-bold text-[#0F172A] tracking-tight">Actividad reciente</h4>
                          <p className="text-[9px] font-medium text-slate-500 uppercase tracking-[0.22em] mt-1" style={{ fontFamily: '"JetBrains Mono", monospace' }}>Últimos {Math.min(actividadReciente.length, 5)} movimientos</p>
                        </div>
                        <button onClick={() => setTab('agenda')} className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-600 hover:text-[#0EA5E9] transition-colors" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                          Ver todo
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                        </button>
                      </div>
                      <div className="divide-y divide-slate-200/70">
                        {actividadReciente.slice(0, 5).map((act, idx) => (
                          <div key={idx} className="px-5 py-3 flex items-center gap-3 hover:bg-slate-50/50 transition-colors cursor-pointer" onClick={() => setTab('agenda')} data-testid={`activity-${idx}`}>
                            <div className="w-9 h-9 rounded-md bg-slate-100 flex items-center justify-center shrink-0 text-[11px] font-bold text-[#0F172A] tabular-nums" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                              {formatearHora(act.fecha_hora)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[12px] font-bold text-[#0F172A] truncate">{act.cliente_nombre}</p>
                              <p className="text-[11px] text-slate-500 font-medium truncate">{act.servicios?.nombre || vocab.servicio} <span className="text-slate-400">·</span> {act.empleados?.nombre?.split(' ')[0] || vocab.fallbackStaff}</p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-[10px] font-medium text-slate-500">{formatearFechaRelativa(act.fecha_hora)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ═══════════ LINK PÚBLICO — Card editorial dark ═══════════ */}
                  <div id="tour-link" className="bg-[#0F172A] rounded-xl text-[#F8FAFC] relative overflow-hidden shadow-lg" data-testid="public-link-widget">
                    <div className="absolute inset-0 opacity-[0.04] pointer-events-none mix-blend-overlay" style={{
                      backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")"
                    }} />
                    <div className="absolute -top-12 -right-12 w-44 h-44 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(255,79,0,0.25) 0%, transparent 70%)' }} />

                    <div className="relative z-10 p-5 md:p-6">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[9px] font-bold uppercase tracking-[0.25em] text-[#38BDF8]" style={{ fontFamily: '"JetBrains Mono", monospace' }}>Tu agenda online</span>
                        <span className="flex h-1.5 w-1.5 relative">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                        </span>
                      </div>
                      <h4 className="text-[22px] md:text-[26px] font-light tracking-[-0.025em] leading-tight mb-1" style={{ fontFamily: '"Fraunces", serif' }}>
                        Recibí <em className="italic font-medium text-[#38BDF8]">reservas 24/7</em>
                      </h4>
                      <p className="text-slate-400 text-[12px] md:text-[13px] font-medium mb-4 max-w-md">{vocab.linkDescripcion}</p>
                      <div
                        onClick={() => { navigator.clipboard.writeText(publicLink).catch(() => {}); showToast("¡Link copiado!") }}
                        className="flex items-center bg-black/40 border border-white/10 rounded-md p-3 cursor-pointer hover:border-[#0EA5E9]/60 transition-all group"
                        data-testid="public-link-copy"
                      >
                        <code className="text-[11px] md:text-[12px] text-[#38BDF8] truncate flex-1" style={{ fontFamily: '"JetBrains Mono", monospace' }}>{publicLink}</code>
                        <svg className="w-4 h-4 ml-2 text-slate-400 group-hover:text-[#0EA5E9] transition-colors shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3" /></svg>
                      </div>
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => window.open(publicLink, '_blank')}
                          className="flex-1 py-2.5 text-[11px] font-bold uppercase tracking-[0.15em] bg-[#0EA5E9] text-white rounded-md hover:bg-[#38BDF8] transition-colors flex items-center justify-center gap-1.5"
                          style={{ fontFamily: '"JetBrains Mono", monospace' }}
                          data-testid="public-link-open"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                          Abrir
                        </button>
                        <button
                          onClick={() => { const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`📅 Reservá tu ${vocab.turno || 'turno'} acá: ${publicLink}`)}`; window.open(whatsappUrl, '_blank') }}
                          className="flex-1 py-2.5 text-[11px] font-bold uppercase tracking-[0.15em] bg-white/5 text-[#F8FAFC] border border-white/10 rounded-md hover:bg-white/10 transition-colors flex items-center justify-center gap-1.5"
                          style={{ fontFamily: '"JetBrains Mono", monospace' }}
                          data-testid="public-link-share"
                        >
                          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" /></svg>
                          Compartir
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* GESTIÓN DINÁMICA DE TABS */}
              <div className="animate-in fade-in slide-in-from-left-4 duration-500">
                {tab === 'agenda' && <Turnos negocioId={negocio.id} rubro={negocio.rubro} negocio={negocio} />}
                {tab === 'reportes' && <Reportes negocioId={negocio.id} colorPrimario={colorPrimario} rubro={negocio.rubro} />}
                {tab === 'servicios' && <Servicios negocioId={negocio.id} rubro={negocio.rubro} />}
                {tab === 'equipo' && <Empleados negocioId={negocio.id} rubro={negocio.rubro} />}
                {tab === 'horarios' && <ConfiguracionHorarios negocio={negocio} onUpdate={() => inicializarPanel()} />}
                {tab === 'inventario' && <Inventario negocioId={negocio.id} rubro={negocio.rubro} />}
                {tab === 'flyer' && <FlyerCreator negocio={negocio} publicLink={publicLink} />}
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
                      {/* EXPORT BUTTONS */}
                      {clientes.length > 0 && (
                        <div className="flex gap-1.5">
                          <button onClick={() => {
                            exportToCSV(clientes, `clientes_${negocio.nombre}`, [
                              { key: 'nombre', label: 'Nombre' },
                              { key: 'telefono', label: 'Teléfono' },
                              { key: 'email', label: 'Email' },
                              { key: 'visitas', label: 'Visitas' },
                              { key: (c) => `$${c.ingresoTotal}`, label: 'Facturado' },
                              { key: 'frecuencia', label: 'Frecuencia' },
                              { key: (c) => c.servicios.join(', '), label: 'Servicios' },
                            ])
                            showToast('Archivo CSV descargado')
                          }} className="ns-export-btn" title="Exportar CSV">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" strokeLinecap="round" strokeLinejoin="round" /></svg>
                            CSV
                          </button>
                          <button onClick={() => {
                            exportReportPDF({
                              title: 'Base de Clientes',
                              negocioNombre: negocio.nombre,
                              sections: [
                                {
                                  title: 'Resumen', type: 'kpi', data: [
                                    { label: 'Total Clientes', value: clientes.length },
                                    { label: 'Recurrentes', value: clientesVIP + clientesFrecuentes },
                                    { label: 'Facturado', value: `$${totalIngresosClientes.toLocaleString()}` },
                                  ]
                                },
                                {
                                  title: 'Detalle de Clientes', type: 'table', columns: [
                                    { key: 'nombre', label: 'Nombre' },
                                    { key: 'telefono', label: 'Teléfono' },
                                    { key: 'visitas', label: 'Visitas' },
                                    { key: (c) => `$${c.ingresoTotal.toLocaleString()}`, label: 'Facturado' },
                                    { key: 'frecuencia', label: 'Frecuencia' },
                                  ], data: clientes
                                },
                              ]
                            })
                            showToast('Reporte PDF generado', 'success')
                          }} className="ns-export-btn" title="Exportar PDF">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" strokeLinecap="round" strokeLinejoin="round" /></svg>
                            PDF
                          </button>
                        </div>
                      )}
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
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeLinecap="round" strokeLinejoin="round" /></svg>
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
                      <svg className="w-12 h-12 text-slate-300 mb-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" strokeLinecap="round" strokeLinejoin="round" /></svg>
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
                              <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0 ${c.frecuencia === 'VIP' ? 'bg-amber-100 text-amber-700' :
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
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.888-.788-1.489-1.761-1.663-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 00-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" /></svg>
                            </button>
                            <button onClick={() => {
                              const num = c.telefono?.replace(/[^0-9]/g, '') || ''
                              window.open(`tel:${num}`)
                            }} className="w-9 h-9 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center hover:bg-blue-500 hover:text-white transition-all" title="Llamar">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" strokeLinecap="round" strokeLinejoin="round" /></svg>
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
                      <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.172-1.172a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 115.656-5.656L10 6.343l1.172-1.172z" /></svg>
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
                            {logoUrl ? <img src={logoUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform" /> : <svg className="h-5 w-5 text-slate-300" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
                            <input type="file" accept="image/*" onChange={(e) => manejarSubidaImagen(e, 'logo')} className="absolute inset-0 opacity-0 cursor-pointer" />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[8px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest flex justify-between items-center">
                            Portada
                            {subiendoPortada && <div className="w-2.5 h-2.5 border-2 border-slate-300 border-t-slate-900 rounded-full animate-spin"></div>}
                          </label>
                          <div className="relative aspect-square bg-slate-50 rounded-xl border border-slate-200 border-dashed flex items-center justify-center overflow-hidden group hover:border-slate-400 transition-colors">
                            {portadaUrl ? <img src={portadaUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform" /> : <svg className="h-5 w-5 text-slate-300" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
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
                      <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" strokeLinecap="round" strokeLinejoin="round" /></svg>
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
                        <label className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Ubicación — Google Maps</label>
                        <input value={mapaUrl} onChange={(e) => setMapaUrl(e.target.value)} placeholder='Pegá el link de Google Maps de tu negocio' className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl outline-none text-xs font-bold text-slate-900 focus:bg-white focus:border-slate-300 transition-all" />
                        <p className="text-[9px] text-slate-400 mt-1.5 ml-1 font-medium">Abrí Google Maps, buscá tu negocio, tocá &quot;Compartir&quot; y pegá el link acá.</p>
                        {mapaUrl && (
                          <div className="mt-3 rounded-xl overflow-hidden border border-slate-200 h-40">
                            <iframe
                              src={mapaUrl.includes('<iframe') ? mapaUrl.match(/src="([^"]+)"/)?.[1] || '' : `https://www.google.com/maps?q=${encodeURIComponent(mapaUrl.includes('google.com/maps') ? mapaUrl : direccionNegocio || mapaUrl)}&output=embed`}
                              width="100%" height="100%" style={{ border: 0 }} allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade"
                            ></iframe>
                          </div>
                        )}
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
                      <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      <h4>Link Público</h4>
                    </div>
                    <div className="p-5 md:p-6">
                      <p className="text-[11px] text-slate-500 font-medium mb-3">Este es tu link de reservas. Compartilo con tus clientes por WhatsApp, redes o donde quieras.</p>
                      <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl p-3 cursor-pointer hover:bg-slate-100 transition-all group" onClick={() => {
                        navigator.clipboard.writeText(publicLink)
                        showToast("¡Link copiado!")
                      }}>
                        <code className="text-[9px] md:text-[11px] text-blue-600 font-mono truncate flex-1">{publicLink}</code>
                        <svg className="w-4 h-4 ml-2 text-slate-400 group-hover:text-slate-900 transition-colors shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
                      </div>

                      {/* QR Code */}
                      <div className="mt-4 p-4 bg-white border border-slate-200 rounded-xl text-center">
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(publicLink)}&bgcolor=ffffff&color=0f172a&margin=8`}
                          alt="QR de reservas"
                          className="w-32 h-32 md:w-40 md:h-40 mx-auto rounded-lg"
                          loading="lazy"
                        />
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-2">Escaneá para reservar</p>
                      </div>

                      <div className="grid grid-cols-3 gap-2 mt-3">
                        <button onClick={() => window.open(publicLink, '_blank')} className="py-3 rounded-xl bg-slate-50 border border-slate-200 text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all">
                          Vista Previa
                        </button>
                        <button onClick={() => {
                          const waMje = encodeURIComponent(`${vocab.shareWA} ${negocio.nombre}: ${publicLink}`)
                          window.open(`https://wa.me/?text=${waMje}`, '_blank')
                        }} className="py-3 rounded-xl bg-green-50 border border-green-200 text-[10px] font-bold uppercase tracking-widest text-green-600 hover:bg-green-500 hover:text-white hover:border-green-500 transition-all">
                          Compartir WA
                        </button>
                        <button onClick={() => {
                          const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${encodeURIComponent(publicLink)}&bgcolor=ffffff&color=0f172a&margin=16&format=png`
                          const a = document.createElement('a')
                          a.href = qrUrl
                          a.download = `qr-${negocio?.nombre?.replace(/\s+/g, '-')?.toLowerCase() || 'reservas'}.png`
                          a.target = '_blank'
                          a.click()
                        }} className="py-3 rounded-xl bg-purple-50 border border-purple-200 text-[10px] font-bold uppercase tracking-widest text-purple-600 hover:bg-purple-500 hover:text-white hover:border-purple-500 transition-all">
                          Descargar QR
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* SECCIÓN: INFORMACIÓN DE CUENTA */}
                  <div className="ns-settings-card">
                    <div className="ns-settings-card-header">
                      <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" strokeLinecap="round" strokeLinejoin="round" /></svg>
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
                      <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      <h4>Seguridad</h4>
                    </div>
                    <button onClick={() => window.location.href = '/actualizar-clave'} className="ns-settings-row cursor-pointer w-full text-left hover:bg-slate-50">
                      <div className="flex items-center gap-3">
                        <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        <span className="text-sm font-bold text-slate-900">Cambiar Contraseña</span>
                      </div>
                      <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </button>
                    <button onClick={() => supabase.auth.signOut()} className="ns-settings-row cursor-pointer w-full text-left hover:bg-red-50 group">
                      <div className="flex items-center gap-3">
                        <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        <span className="text-sm font-bold text-red-500">Cerrar Sesión</span>
                      </div>
                      <svg className="w-4 h-4 text-red-300" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </button>
                  </div>

                </div>
              )}

            </div>
          </div>
          </div>
        )}
      </main>

      {/* ====== MOBILE NAV DRAWER ====== */}
      {drawerOpen && negocio && !negocio.es_admin_plataforma && (
        <div className="md:hidden fixed inset-0 z-[90] flex" data-testid="mobile-drawer">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-[#0F172A]/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setDrawerOpen(false)} />
          {/* Panel */}
          <div className="relative ml-auto w-[78%] max-w-[320px] bg-[#F8FAFC] h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-300" style={{ fontFamily: '"Inter Tight", "Inter", sans-serif' }}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-300/70">
              <div className="flex items-center gap-2.5">
                <div className="relative">
                  <div className="w-8 h-8 rounded-md bg-[#0F172A] flex items-center justify-center">
                    <span className="text-[#F8FAFC] font-black text-[13px] tracking-tighter" style={{ fontFamily: '"Fraunces", serif', fontStyle: 'italic' }}>N</span>
                  </div>
                  <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-[#0EA5E9]" />
                </div>
                <div className="leading-none">
                  <p className="font-bold text-[13px] text-[#0F172A] tracking-tight">Noni<span className="text-[#0EA5E9]">.</span></p>
                  <p className="text-[9px] font-medium uppercase tracking-[0.22em] mt-1 text-slate-500" style={{ fontFamily: '"JetBrains Mono", monospace' }}>Menú</p>
                </div>
              </div>
              <button
                onClick={() => setDrawerOpen(false)}
                aria-label="Cerrar menú"
                data-testid="drawer-close-btn"
                className="w-9 h-9 flex items-center justify-center rounded-md text-slate-500 hover:bg-slate-200/70 hover:text-[#0F172A] transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-3 py-5 space-y-6">
              {Object.entries(tabsGrouped).map(([groupName, items]) => (
                <div key={groupName}>
                  <p className="px-2 mb-2 text-[9px] font-bold uppercase tracking-[0.25em] text-slate-500" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                    {groupName}
                  </p>
                  <nav className="space-y-0.5">
                    {items.map(i => {
                      const activo = tab === i.id
                      return (
                        <button
                          key={i.id}
                          onClick={() => { setTab(i.id); setDrawerOpen(false) }}
                          data-testid={`drawer-tab-${i.id}`}
                          className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-md transition-all relative ${
                            activo ? 'bg-[#0F172A] text-[#F8FAFC]' : 'text-slate-700 hover:bg-slate-200/60'
                          }`}
                        >
                          {activo && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-[#0EA5E9] rounded-r" />}
                          <svg className={`w-4 h-4 shrink-0 ${activo ? 'text-[#0EA5E9]' : 'text-slate-500'}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d={i.d} strokeLinecap="round" strokeLinejoin="round" /></svg>
                          <span className="text-[13px] font-semibold tracking-tight">{i.label}</span>
                        </button>
                      )
                    })}
                  </nav>
                </div>
              ))}
            </div>

            <div className="px-5 py-4 border-t border-slate-300/70 bg-white/40">
              <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-slate-400 mb-1" style={{ fontFamily: '"JetBrains Mono", monospace' }}>Workspace</p>
              <p className="text-[12px] font-semibold text-[#0F172A] truncate">{negocio?.nombre}</p>
              <p className="text-[10px] text-slate-500 truncate mt-0.5">{negocio?.rubro}</p>
            </div>
          </div>
        </div>
      )}

      {/* ====== BOTTOM NAVIGATION BAR — MOBILE ONLY ====== */}
      {negocio && !negocio.es_admin_plataforma && (
        <nav className="ns-bottom-nav md:hidden" data-testid="bottom-nav">
          {bottomNavTabs.map(item => (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              data-testid={`bottom-nav-${item.id}`}
              className={`ns-bottom-nav-item ${tab === item.id ? 'active' : ''}`}
            >
              <svg fill="none" stroke="currentColor" strokeWidth={tab === item.id ? "2.5" : "2"} viewBox="0 0 24 24">
                <path d={item.d} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>{item.label}</span>
              {tab === item.id && <div className="w-1 h-1 rounded-full bg-[#0EA5E9] mt-px"></div>}
            </button>
          ))}
          <button
            onClick={() => setDrawerOpen(true)}
            data-testid="bottom-nav-more"
            className="ns-bottom-nav-item"
          >
            <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            <span>Más</span>
          </button>
        </nav>
      )}

      {/* ====== FLOATING ACTION MENU — Acciones rápidas siempre accesibles ====== */}
      {negocio && !negocio.es_admin_plataforma && (
        <FloatingActionMenu
          label="Acciones rápidas"
          actions={[
            {
              id: 'turno',
              label: vocab.accionNueva || 'Nuevo turno',
              icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
              onClick: () => setTab('agenda'),
            },
            {
              id: 'servicio',
              label: vocab.accionServicio || 'Nuevo servicio',
              icon: 'M12 4v16m8-8H4',
              onClick: () => setTab('servicios'),
            },
            {
              id: 'cliente',
              label: 'Ver clientes',
              icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
              onClick: () => setTab('clientes'),
            },
            {
              id: 'link',
              label: 'Copiar link público',
              icon: 'M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3',
              onClick: () => { navigator.clipboard.writeText(publicLink).catch(() => {}); showToast('¡Link copiado!') },
            },
            {
              id: 'search',
              label: 'Buscar (⌘K)',
              icon: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z',
              onClick: () => setSearchOpen(true),
            },
          ]}
        />
      )}

      {/* ====== TOUR GUIADO INTERACTIVO ====== */}
      {negocio && !negocio.es_admin_plataforma && (
        <DashboardTour
          active={tour.active}
          onDismiss={tour.dismiss}
          negocio={negocio}
          onNavigate={(t) => setTab(t)}
          publicLink={publicLink}
        />
      )}

      {/* ====== ASISTENTE FLOTANTE "NONI" ====== */}
      {negocio && !negocio.es_admin_plataforma && (
        <FloatingAssistant
          tab={tab}
          setupData={{
            hasServicios: crmStats.totalServicios > 0,
            hasEmpleados: crmStats.totalEmpleados > 0,
            hasHorarios: negocio?.horarios && Object.values(negocio.horarios).some(d => d.abierto),
            hasBranding: !!(logoUrl || descripcion),
            hasShared: false,
            hasTurnos: stats.hoy > 0 || actividadReciente.length > 0,
          }}
          vocab={vocab}
          publicLink={publicLink}
          onNavigate={(t) => setTab(t)}
          onStartTour={() => tour.start()}
          negocioNombre={negocio?.nombre}
          smartAlerts={{
            turnosHoy: stats.hoy || 0,
            ingresosHoy: stats.ingresos || 0,
            turnosSemana: stats.semana || 0,
            ingresosMes: stats.mesIngresos || 0,
            totalClientes: clientes.length,
            clientesVIP: clientes.filter(c => c.frecuencia === 'VIP').length,
            stockBajo: crmStats.stockBajo,
            proximaCita,
            ocupacion: stats.tasaOcupacion || 0,
          }}
        />
      )}
    </div>
  )
}