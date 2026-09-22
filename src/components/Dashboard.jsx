import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

// Inyección de componentes modulares
import Turnos from './Turnos'
import Servicios from './Servicios'
import Empleados from './Empleados'
import ConfiguracionHorarios from './ConfiguracionHorarios'
import Reportes from './Reportes'
import InventarioPro from './InventarioPro'
import FlyerCreatorPro from './FlyerCreatorPro'

// Sistema de Vocabulario Multi-Negocio
import { getVocabulario } from '../utils/vocabulario'

// Wizard de Onboarding Guiado
import OnboardingWizard from './OnboardingWizard'

// Panel de Configuración Guiada Post-Onboarding
import GuidedSetup from './GuidedSetup'

// Hooks globales
import { useToast } from './Toast'
import { useConfirm } from '../contexts/ConfirmContext'

// Iconos
import { IconCheckCircle } from './NoniIcons'

// Aislamiento de fallos por sección
import { ErrorGuard } from './ErrorBoundary'

// Suscripción / planes
import { getEstadoSuscripcion, etiquetaEstado, whatsappActivacion, calcularNuevoVencimiento, PLAN, cobroSinConfigurar, formatearPrecio } from '../utils/suscripcion'
import { haptic } from '../utils/haptics'
import { useSwipeTabs } from '../hooks/useSwipeTabs'
import { ocupaHorario, factura, precioTurno, parseFecha, tieneHorariosConfigurados, mapaEmbedUrl } from '../utils/reservas'
import { PALETA_MARCA, colorSeguro } from '../utils/paleta'

// Componentes del Dashboard
import DashboardTour, { useTour } from './DashboardTourV2'
import FloatingAssistant from './NoniAssistantV4'
import DashboardHome from './DashboardHome'
import NotificationCenter from './NotificationCenterV2'
import { notificationService } from '../utils/notificationService'
import GlobalSearch from './GlobalSearch'
import Atajos from './neo/Atajos'

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
  const [stats, setStats] = useState({ hoy: 0, ingresos: 0, proximos: 0, popular: '-', semana: 0, mesIngresos: 0, tasaOcupacion: 0 })

  // Lógica Granular de Carga
  const [guardandoPerfil, setGuardandoPerfil] = useState(false)
  const [subiendoLogo, setSubiendoLogo] = useState(false)
  const [subiendoPortada, setSubiendoPortada] = useState(false)

  // --- ESTADOS: BRANDING & UI ---
  const [colorPrimario, setColorPrimario] = useState('#990011')
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

  // Al cambiar de sección arrancamos arriba, como cualquier app nativa:
  // antes entrabas a Ajustes y aparecías en la mitad de la pantalla.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [tab])

  // --- BARRA SUPERIOR: sombra sólo cuando hay contenido por encima ---
  const [scrolleado, setScrolleado] = useState(false)
  useEffect(() => {
    const alScrollear = () => setScrolleado(window.scrollY > 6)
    alScrollear()
    window.addEventListener('scroll', alScrollear, { passive: true })
    return () => window.removeEventListener('scroll', alScrollear)
  }, [])

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
    // Escapamos todo lo que venga de la base: un nombre con "<" rompía el HTML.
    const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ))
    // Generate a printable HTML report and trigger print dialog
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(title)} - ${esc(negocioNombre)}</title>
    <style>body{font-family:Inter,system-ui,sans-serif;padding:40px;color:#990011}
    h1{font-size:24px;margin-bottom:4px}h2{font-size:16px;margin-top:24px;color:#B94F5A;border-bottom:1px solid #F4E2E3;padding-bottom:8px}
    .kpi-grid{display:flex;gap:16px;margin:12px 0}.kpi{background:#FDF8F8;border:1px solid #F4E2E3;border-radius:12px;padding:16px;flex:1;text-align:center}
    .kpi .val{font-size:24px;font-weight:800}.kpi .lbl{font-size:10px;color:#D28F95;text-transform:uppercase;letter-spacing:1px;margin-top:4px}
    table{width:100%;border-collapse:collapse;margin:12px 0;font-size:12px}th{background:#FAF1F0;text-align:left;padding:8px 12px;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#B94F5A}
    td{padding:8px 12px;border-bottom:1px solid #FAF1F0}.meta{font-size:11px;color:#D28F95;margin-top:4px}</style></head><body>
    <h1>${esc(title)}</h1><p class="meta">${esc(negocioNombre)} — ${new Date().toLocaleDateString('es-ES', { day:'numeric',month:'long',year:'numeric' })}</p>`
    + sections.map(s => {
      let content = `<h2>${esc(s.title)}</h2>`
      if (s.type === 'kpi') {
        content += '<div class="kpi-grid">' + s.data.map(k => `<div class="kpi"><div class="val">${esc(k.value)}</div><div class="lbl">${esc(k.label)}</div></div>`).join('') + '</div>'
      } else if (s.type === 'table' && s.data) {
        content += '<table><thead><tr>' + s.columns.map(c => `<th>${esc(c.label)}</th>`).join('') + '</tr></thead><tbody>'
        + s.data.map(row => '<tr>' + s.columns.map(c => {
          const val = typeof c.key === 'function' ? c.key(row) : row[c.key]
          return `<td>${esc(val)}</td>`
        }).join('') + '</tr>').join('') + '</tbody></table>'
      }
      return content
    }).join('')
    + '</body></html>'
    const w = window.open('', '_blank')
    if (!w) {
      showToast('Tu navegador bloqueó la ventana del reporte. Permití las ventanas emergentes e intentá de nuevo.', 'error')
      return
    }
    w.document.write(html)
    w.document.close()
    // Esperamos al render antes de imprimir: en Safari/Firefox `print()`
    // inmediato salía en blanco.
    w.onload = () => w.print()
    setTimeout(() => { try { w.print() } catch { /* ya impreso */ } }, 400)
  }

  useEffect(() => {
    if (session) {
      inicializarPanel()
    }
  }, [session])

  // Cerrar sesión limpiando la suscripción de tiempo real: si no, el canal de
  // Supabase del negocio anterior quedaba abierto al cambiar de cuenta.
  async function cerrarSesion() {
    try { notificationService.destroy() } catch { /* nada que cerrar */ }
    await supabase.auth.signOut()
  }

  // Al salir del panel, cortamos la suscripción de notificaciones.
  useEffect(() => () => { notificationService.destroy() }, [])

  // Cuando entra una reserva nueva por tiempo real, refrescamos las métricas.
  // Antes el panel mostraba números viejos hasta que recargabas la página.
  useEffect(() => {
    if (!negocio?.id || negocio.es_admin_plataforma) return

    let pendiente = null
    const alRecibirReserva = () => {
      // Agrupamos ráfagas de eventos en un solo refresco.
      clearTimeout(pendiente)
      pendiente = setTimeout(() => {
        cargarCrmStats(negocio.id).then((crm) => {
          cargarMetricasNegocio(negocio.id, negocio, crm.empleadosActivos)
          cargarActividadReciente(negocio.id)
        })
      }, 1200)
    }

    window.addEventListener('noni:notification', alRecibirReserva)
    return () => {
      clearTimeout(pendiente)
      window.removeEventListener('noni:notification', alRecibirReserva)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [negocio?.id, negocio?.es_admin_plataforma])

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

      if (data && data.id) {
        setNegocio(data)
        setColorPrimario(data?.color_primario || '#990011')
        setDescripcion(data.descripcion || '')
        setLogoUrl(data.logo_url || '')
        setPortadaUrl(data.portada_url || '')
        setInstagram(data.instagram || '')
        setTelefonoNegocio(data.telefono || '')
        setDireccionNegocio(data.direccion || '')
        setMapaUrl(data.mapa_url || '')
        setMensajeBienvenida(data.mensaje_bienvenida || '')

        // El rol de super admin viene SÓLO de la base. Antes la app se lo
        // auto-asignaba comparando el email contra una variable pública del
        // bundle; como las policies permitían al dueño actualizar su propia
        // fila, cualquiera podía escribirse es_admin_plataforma = true y ver
        // todos los negocios de la plataforma. Para designar un admin ahora se
        // corre el UPDATE desde el SQL Editor de Supabase (ver el archivo de
        // migración en /sql).
        const isAdmin = data.es_admin_plataforma === true

        if (isAdmin) {
          await cargarConsolaMaestra()
        } else {
          const crm = await cargarCrmStats(data.id)
          await Promise.all([
            cargarMetricasNegocio(data.id, data, crm.empleadosActivos),
            cargarActividadReciente(data.id),
            cargarClientes(data.id),
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

    const resumen = { stockBajo, empleadosActivos: empActivos, totalEmpleados: empTotal, totalServicios: svcCount || 0 }
    setCrmStats(resumen)
    return resumen
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
      const activos = data.filter(n => {
        const s = getEstadoSuscripcion(n)
        return s.estado === 'activo' || s.estado === 'trial'
      }).length
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

  async function registrarPago(neg) {
    const nuevoVenc = calcularNuevoVencimiento(neg)
    showConfirm({
      title: 'Registrar pago (+30 días)',
      message: `¿Confirmás que "${neg?.nombre || neg.id}" pagó? Quedará activo hasta el ${nuevoVenc.toLocaleDateString('es-AR')}.`,
      confirmText: 'Activar 30 días',
      onConfirm: async () => {
        const { data, error } = await supabase
          .from('negocios')
          .update({ estado_suscripcion: 'activo', fecha_vencimiento: nuevoVenc.toISOString() })
          .eq('id', neg.id)
          .select()

        if (error) {
          console.error('Error de RLS/Supabase:', error)
          showToast(`Error al activar: ${error.message}`, 'error')
          return
        }
        if (!data || data.length === 0) {
          showToast('No se pudo activar el negocio (políticas de seguridad).', 'error')
          return
        }
        cargarConsolaMaestra()
        showToast('Pago registrado · +30 días de acceso')
      }
    })
  }

  async function suspenderNegocio(neg) {
    showConfirm({
      title: '¿Suspender Negocio?',
      message: `¿Suspender a "${neg?.nombre || neg.id}"? Perderá acceso al panel y a recibir reservas.`,
      confirmText: 'Suspender',
      isDestructive: true,
      onConfirm: async () => {
        const { data, error } = await supabase
          .from('negocios')
          .update({ estado_suscripcion: 'suspendido' })
          .eq('id', neg.id)
          .select()

        if (error) {
          console.error('Error de RLS/Supabase:', error)
          showToast(`Error al suspender: ${error.message}`, 'error')
          return
        }
        if (!data || data.length === 0) {
          showToast('No se pudo suspender el negocio (políticas de seguridad).', 'error')
          return
        }
        cargarConsolaMaestra()
        showToast('Negocio suspendido')
      }
    })
  }

  /**
   * LÓGICA NEGOCIO: BUSINESS INTELLIGENCE COMPLETA (Timezone Safe)
   */
  async function cargarMetricasNegocio(negocioId, negocioData = null, empleadosActivos = 1) {
    const ahora = new Date()
    const hoyInicio = new Date(ahora)
    hoyInicio.setHours(0, 0, 0, 0)
    const hoyFin = new Date(ahora)
    hoyFin.setHours(23, 59, 59, 999)

    // Inicio de la semana (lunes)
    const inicioSemana = new Date(ahora)
    const diaSemana = ahora.getDay()
    const diff = diaSemana === 0 ? 6 : diaSemana - 1
    inicioSemana.setDate(ahora.getDate() - diff)
    inicioSemana.setHours(0, 0, 0, 0)

    // Inicio del mes
    const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1)

    // Traemos todos los turnos desde inicio de mes para calcular todo.
    // OJO: no filtramos por estado en la query. Antes se pedía sólo
    // estado='confirmado' y, en cuanto el dueño marcaba un turno como atendido
    // ('completado'), ese turno y su facturación desaparecían del panel.
    const { data: turnos, error } = await supabase
      .from('turnos')
      .select('*, servicios(nombre, precio, duracion_minutos), empleados(nombre)')
      .eq('negocio_id', negocioId)
      .gte('fecha_hora', inicioMes.toISOString())
      .order('fecha_hora', { ascending: true })

    if (error) {
      console.error('Error obteniendo métricas:', error.message)
      return
    }

    if (turnos) {
      // Cancelados y ausencias no cuentan para nada.
      const activos = turnos.filter(ocupaHorario)

      const fechaDe = (t) => parseFecha(t.fecha_hora) || new Date(t.fecha_hora)

      // Turnos de HOY (antes esta métrica decía "hoy" pero contaba todo el mes
      // que venía por delante).
      const turnosHoy = activos.filter(t => {
        const f = fechaDe(t)
        return f >= hoyInicio && f <= hoyFin
      })
      const ingresosHoy = turnosHoy.filter(factura).reduce((acc, t) => acc + precioTurno(t), 0)

      // Turnos futuros (desde ahora en adelante)
      const turnosFuturos = activos.filter(t => fechaDe(t) >= ahora)

      // Turnos esta semana
      const turnosSemana = activos.filter(t => fechaDe(t) >= inicioSemana)

      // Ingresos del mes completo
      const ingresosMes = activos.filter(factura).reduce((acc, t) => acc + precioTurno(t), 0)

      // Servicio más popular
      const servicioCount = {}
      activos.forEach(t => {
        const nombre = t.servicios?.nombre || 'Otro'
        servicioCount[nombre] = (servicioCount[nombre] || 0) + 1
      })
      const popular = Object.keys(servicioCount).reduce((a, b) =>
        servicioCount[a] > servicioCount[b] ? a : b, '-'
      )

      // Distribución semanal (Lun-Dom)
      const distSemanal = [0, 0, 0, 0, 0, 0, 0]
      turnosSemana.forEach(t => {
        const d = fechaDe(t).getDay()
        const idx = d === 0 ? 6 : d - 1 // Lunes=0, Domingo=6
        distSemanal[idx]++
      })
      setDistribucionSemanal(distSemanal)

      // Próxima cita (la primera que todavía no empezó)
      setProximaCita(turnosFuturos.find(t => fechaDe(t) > ahora) || null)

      // Ocupación real: turnos de la semana sobre la capacidad configurada.
      const capacidadSemanal = calcularCapacidadSemanal(negocioData || negocio, empleadosActivos)
      const tasaOcupacion = capacidadSemanal > 0
        ? Math.min(100, Math.round((turnosSemana.length / capacidadSemanal) * 100))
        : 0

      setStats({
        hoy: turnosHoy.length,
        ingresos: ingresosHoy,
        proximos: turnosFuturos.length,
        popular,
        semana: turnosSemana.length,
        mesIngresos: ingresosMes,
        tasaOcupacion
      })
    }
  }

  /**
   * Capacidad semanal aproximada: slots que entran en los horarios abiertos,
   * usando la duración del servicio más corto. Reemplaza el "/35" fijo que
   * daba porcentajes inventados.
   */
  function calcularCapacidadSemanal(neg, empleadosActivos = 1) {
    const horarios = neg?.horarios
    if (!horarios || typeof horarios !== 'object') return 0
    const duracionBase = 30
    let slots = 0
    for (const dia of Object.values(horarios)) {
      if (!dia?.abierto || !dia.inicio || !dia.fin) continue
      const [hi, mi] = String(dia.inicio).split(':').map(Number)
      const [hf, mf] = String(dia.fin).split(':').map(Number)
      let minutos = (hf * 60 + mf) - (hi * 60 + mi)
      if (minutos <= 0) minutos += 1440 // horario nocturno
      if (dia.pausa && dia.inicioPausa && dia.finPausa) {
        const [hpi, mpi] = String(dia.inicioPausa).split(':').map(Number)
        const [hpf, mpf] = String(dia.finPausa).split(':').map(Number)
        minutos -= Math.max(0, (hpf * 60 + mpf) - (hpi * 60 + mpi))
      }
      slots += Math.max(0, Math.floor(minutos / duracionBase))
    }
    return slots * Math.max(1, empleadosActivos || 1)
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
        .select('cliente_nombre, cliente_telefono, cliente_email, fecha_hora, estado, servicios(nombre, precio)')
        .eq('negocio_id', negocioId)
        .order('fecha_hora', { ascending: false })
        .limit(5000)

      if (error) throw error

      // Agrupar por teléfono como identificador único del cliente
      const clientesMap = {}
        ; (turnos || []).forEach(t => {
          // Un turno cancelado no convierte a alguien en cliente ni suma plata.
          if (!ocupaHorario(t)) return
          const key = (t.cliente_telefono || t.cliente_nombre || '').trim()
          if (!key) return
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
          clientesMap[key].ingresoTotal += precioTurno(t)
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
    } catch {
      showToast('No pudimos subir la imagen. Revisá tu conexión y reintentá.', 'error')
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
  /**
   * El campo "mapa_url" se inyectaba directo en un <iframe src>. Cualquier URL
   * (incluido javascript: o un sitio de terceros) terminaba embebida en el
   * panel y en la app pública. Sólo permitimos Google Maps.
   */

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
    { id: 'inventario', label: 'Inventario', d: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
    { id: 'clientes', label: _tabClientes, d: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
    { id: 'flyer', label: 'Flyer', d: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z' },
    { id: 'ajustes', label: 'Ajustes', d: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' },
  ]

  // Bottom nav: 5 items para acceso rápido en móvil (por ID, no por índice)
  const bottomNavTabs = [
    tabsConfig.find(t => t.id === 'inicio'),
    tabsConfig.find(t => t.id === 'agenda'),
    tabsConfig.find(t => t.id === 'reportes'),
    tabsConfig.find(t => t.id === 'clientes'),
    tabsConfig.find(t => t.id === 'ajustes'),
  ]

  // Deslizar de costado cambia de sección en móvil, como en una app nativa.
  // Va acá abajo porque necesita `tabsConfig`, que se arma más arriba con el
  // vocabulario del rubro.
  useSwipeTabs({
    tabs: tabsConfig.map((t) => t.id),
    actual: tab,
    onCambiar: (id) => { haptic('select'); setTab(id) },
    habilitado: Boolean(negocio) && !negocio?.es_admin_plataforma,
  })

  if (loading) return (
    <div className={`min-h-screen flex items-center justify-center ${negocio?.es_admin_plataforma ? 'bg-[#990011]' : 'bg-white'}`}>
      <span className="neo-spinner" role="status" aria-label="Cargando" />
    </div>
  )

  // ===== BLOQUEO POR SUSCRIPCIÓN (prueba vencida o cuenta suspendida) =====
  const accesoSub = negocio ? getEstadoSuscripcion(negocio) : { acceso: true, estado: 'activo', diasRestantes: null, vence: null, enTrial: false }
  if (negocio && !accesoSub.acceso && !negocio.es_admin_plataforma) {
    const esVencido = accesoSub.estado === 'vencido'
    return (
      <div className="noni-shell font-sans antialiased" style={{ colorScheme: 'light' }}>
        <header className="noni-topbar">
          <div className="flex items-center gap-3">
            <span className="neo-avatar neo-avatar--brand w-9 h-9 text-xs">N</span>
            <p className="neo-eyebrow">{esVencido ? 'Suscripción vencida' : 'Cuenta suspendida'}</p>
          </div>
          <button onClick={cerrarSesion} className="neo-btn neo-btn--ghost neo-btn--quiet" data-testid="blocked-logout">Salir</button>
        </header>

        {/* Contenido de bloqueo */}
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md w-full text-center animate-in zoom-in-95 duration-700" data-testid="subscription-blocked">
            {/* Icono */}
            <span className="neo-pod neo-pod--brand mx-auto mb-6" style={{ width: 76, height: 76, borderRadius: 'var(--ns-radius-lg)' }}>
              {esVencido ? (
                <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" /></svg>
              ) : (
                <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" strokeLinecap="round" strokeLinejoin="round" /></svg>
              )}
            </span>

            {/* Mensaje principal */}
            <h2 className="neo-head__title text-2xl md:text-3xl mb-2 justify-center">
              {esVencido ? (accesoSub.enTrial ? 'Tu prueba gratis terminó' : 'Tu suscripción venció') : 'Cuenta Suspendida'}
            </h2>
            <p className="text-sm font-medium leading-relaxed mb-8 max-w-sm mx-auto" style={{ color: 'var(--ns-text-secondary)' }}>
              {esVencido ? (
                <>Para seguir usando <span className="font-bold" style={{ color: 'var(--ns-text-secondary)' }}>{negocio.nombre}</span> y recibir reservas, activá el plan {PLAN.nombre}. Escribinos y te reactivamos la cuenta al instante.</>
              ) : (
                <>Tu cuenta de <span className="font-bold" style={{ color: 'var(--ns-text-secondary)' }}>{negocio.nombre}</span> fue suspendida por el administrador. Mientras esté suspendida no podés acceder al panel ni recibir reservas.</>
              )}
            </p>

            {/* Plan card (solo vencido) */}
            {esVencido && (
              <div className="neo-card p-5 mb-4 text-left">
                <div className="flex items-center justify-between mb-3">
                  <span className="neo-eyebrow">Plan {PLAN.nombre}</span>
                  <span className="neo-chip neo-chip--outline text-[10px]">{accesoSub.enTrial ? 'Prueba finalizada' : 'Vencido'}</span>
                </div>
                <div className="flex items-end gap-1">
                  <span className="font-display text-3xl font-black tracking-tighter" style={{ color: 'var(--ns-text)' }}>{formatearPrecio()}</span>
                  <span className="text-xs font-bold mb-1" style={{ color: 'var(--ns-text-muted)' }}>/mes</span>
                </div>
                <ul className="mt-3 space-y-1.5">
                  {['Reservas online ilimitadas', 'CRM de clientes + reportes', 'App de reservas con tu marca', 'Soporte por WhatsApp'].map(x => (
                    <li key={x} className="flex items-center gap-2 text-[12px] font-medium" style={{ color: 'var(--ns-text-secondary)' }}>
                      <svg className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--ns-primary)' }} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      {x}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Info card */}
            <div className="neo-card p-5 mb-4 text-left space-y-3">
              <div className="flex items-center justify-between">
                <span className="neo-eyebrow">Negocio</span>
                <span className="text-sm font-bold" style={{ color: 'var(--ns-text)' }}>{negocio.nombre}</span>
              </div>
              <div className="neo-divider" />
              <div className="flex items-center justify-between">
                <span className="neo-eyebrow">Titular</span>
                <span className="text-xs font-medium" style={{ color: 'var(--ns-text-secondary)' }}>{session.user.email}</span>
              </div>
            </div>

            {/* Acciones */}
            <div className="space-y-3">
              <a
                href={whatsappActivacion(negocio, session.user.email)}
                target="_blank" rel="noopener noreferrer"
                data-testid="blocked-activate-cta"
                className="neo-btn neo-btn--primary neo-btn--block py-4 text-[10px] uppercase tracking-[0.2em] gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-4 4v-4z" strokeLinecap="round" strokeLinejoin="round" /></svg>
                {esVencido ? 'Activar mi plan' : 'Contactar al administrador'}
              </a>
              <button
                onClick={() => window.location.reload()}
                className="neo-btn neo-btn--block"
              >
                Ya pagué · Actualizar
              </button>
              <button
                onClick={cerrarSesion}
                className="neo-btn neo-btn--ghost neo-btn--block"
              >
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const filtroNormalizado = filtroBusqueda.trim().toLowerCase()
  const negociosFiltrados = todosLosNegocios.filter(n =>
    (n.nombre || '').toLowerCase().includes(filtroNormalizado) ||
    (n.rubro || '').toLowerCase().includes(filtroNormalizado) ||
    (n.id || '').toLowerCase().includes(filtroNormalizado)
  )

  // Ordenar clientes según criterio
  const clientesOrdenados = [...clientes].sort((a, b) => {
    if (ordenClientes === 'nombre') return (a.nombre || '').localeCompare(b.nombre || '')
    if (ordenClientes === 'reciente') return new Date(b.ultimaVisita) - new Date(a.ultimaVisita)
    if (ordenClientes === 'ingresos') return b.ingresoTotal - a.ingresoTotal
    return b.visitas - a.visitas
  })

  const busquedaNormalizada = busquedaCliente.trim().toLowerCase()
  const clientesFiltrados = clientesOrdenados.filter(c =>
    (c.nombre || '').toLowerCase().includes(busquedaNormalizada) ||
    (c.telefono || '').toLowerCase().includes(busquedaNormalizada) ||
    (c.email || '').toLowerCase().includes(busquedaNormalizada)
  )

  const publicSlug = negocio?.nombre?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || ''
  const publicLink = `${window.location.origin}/app/${publicSlug}/${negocio?.id || ''}`
  const showCopyToast = () => {
    navigator.clipboard.writeText(publicLink).catch(() => { })
    try { localStorage.setItem('ns_link_shared', '1') } catch { /* modo privado */ }
    setCopyToast(true)
    setTimeout(() => setCopyToast(false), 3000)
  }

  // Stats resumen del top de clientes
  const totalIngresosClientes = clientes.reduce((acc, c) => acc + c.ingresoTotal, 0)
  const clientesVIP = clientes.filter(c => c.frecuencia === 'VIP').length
  const clientesFrecuentes = clientes.filter(c => c.frecuencia === 'Frecuente').length


  const esPanelNegocio = Boolean(negocio) && !negocio.es_admin_plataforma
  const tituloSeccion = tabsConfig.find((t) => t.id === tab)?.label || 'Panel'

  return (
    <div
      className={`noni-shell font-sans antialiased ${negocio?.es_admin_plataforma ? 'ns-admin-shell' : ''}`}
      style={{ colorScheme: 'light' }}
    >

      {/* Copy-link toast */}
      {copyToast && (
        <div className="ns-copy-toast" role="status">
          <span className="neo-avatar w-9 h-9">
            <IconCheckCircle size={18} />
          </span>
          <div>
            <p className="text-xs font-bold" style={{ color: 'var(--ns-text)' }}>¡Link copiado!</p>
            <p className="text-[10px] font-medium" style={{ color: 'var(--ns-text-muted)' }}>Compartilo por WhatsApp o redes</p>
          </div>
        </div>
      )}

      {/* ══════════ RAIL LATERAL — navegación de escritorio ══════════ */}
      <div className="noni-layout">
        {esPanelNegocio && (
          <aside className="noni-rail" data-tour="nav" aria-label="Navegación del panel">
            <div className="noni-rail__brand">
              <span className="neo-avatar neo-avatar--brand w-11 h-11 text-base">N</span>
              <div className="min-w-0">
                <p className="text-[13px] font-black tracking-tight truncate" style={{ color: 'var(--ns-text)' }}>
                  {negocio?.nombre || 'Panel'}
                </p>
                <p className="neo-eyebrow truncate">{negocio?.rubro || 'Reservas'}</p>
              </div>
            </div>

            <button onClick={() => setSearchOpen(true)} className="noni-rail__item" aria-keyshortcuts="Control+K">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeLinecap="round" strokeLinejoin="round" /></svg>
              Buscar
              <kbd className="ml-auto text-[9px] font-mono px-1.5 py-0.5 rounded-md" style={{ background: 'var(--ns-sunken)', boxShadow: 'var(--neo-inset-sm)', color: 'var(--ns-text-faint)' }}>⌘K</kbd>
            </button>

            <p className="noni-rail__label">Gestión</p>
            <div className="noni-rail__group">
              {tabsConfig.map((i) => (
                <button
                  key={i.id}
                  onClick={() => { haptic(); setTab(i.id) }}
                  aria-current={tab === i.id ? 'page' : undefined}
                  className={`noni-rail__item ${tab === i.id ? 'is-active' : ''}`}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d={i.d} strokeLinecap="round" strokeLinejoin="round" /></svg>
                  {i.label}
                </button>
              ))}
            </div>

            <div className="noni-rail__spacer" />

            <div className="noni-rail__footer noni-rail__group">
              <button onClick={() => window.open(publicLink, '_blank')} className="noni-rail__item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" strokeLinecap="round" strokeLinejoin="round" /></svg>
                Ver mi app
              </button>
              <button onClick={cerrarSesion} className="noni-rail__item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" strokeLinecap="round" strokeLinejoin="round" /></svg>
                Cerrar sesión
              </button>
            </div>
          </aside>
        )}

        <div className="flex-1 min-w-0 flex flex-col">

        {/* ══════════ BARRA SUPERIOR ══════════ */}
        <header className={`noni-topbar ${scrolleado ? 'is-stuck' : ''}`}>
          <div className="flex items-center gap-3 min-w-0">
            <span className={`neo-avatar neo-avatar--brand w-10 h-10 text-sm ${esPanelNegocio ? 'lg:hidden' : ''}`}>N</span>
            <div className="noni-topbar__title">
              <p className="text-[14px] md:text-[15px] font-black tracking-tight leading-none truncate" style={{ color: 'var(--ns-text)' }}>
                {negocio?.es_admin_plataforma ? 'Nucleus Master' : (esPanelNegocio ? tituloSeccion : (negocio?.nombre || 'Panel'))}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className="ns-live-dot" style={{ width: 6, height: 6 }} />
                <p className="text-[9px] font-bold tracking-[0.16em] uppercase truncate" style={{ color: 'var(--ns-text-muted)' }}>
                  {esPanelNegocio ? (negocio?.nombre || '') : (negocio?.rubro || 'Gestión de Reservas')}
                </p>
              </div>
            </div>
          </div>

          <div className="relative flex items-center gap-2">
            {esPanelNegocio && (
              <>
                <button onClick={() => { haptic(); setSearchOpen(true) }} aria-label="Buscar (Ctrl+K)" className="neo-icon-btn lg:hidden">
                  <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="2.4" viewBox="0 0 24 24"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </button>
                <NotificationCenter negocioId={negocio.id} rubro={negocio.rubro} />
              </>
            )}
            <button onClick={cerrarSesion} className="neo-icon-btn lg:hidden" aria-label="Cerrar sesión" title="Cerrar sesión">
              <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="2.4" viewBox="0 0 24 24"><path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
          </div>
        </header>

      {/* GLOBAL SEARCH MODAL (Cmd+K) */}
      {searchOpen && negocio && !negocio.es_admin_plataforma && (
        <GlobalSearch
          negocio={negocio}
          onNavigate={(t) => setTab(t)}
          onClose={() => setSearchOpen(false)}
        />
      )}

      <main className={`noni-main ${esPanelNegocio ? 'ns-has-bottom-nav' : ''}`}>
        <div className="noni-container">

        {!negocio ? (
          /* ESCENARIO: ONBOARDING WIZARD GUIADO */
          <OnboardingWizard session={session} onComplete={() => inicializarPanel()} />
        ) : negocio.es_admin_plataforma ? (
          /* ==========================================================
             VISTA: SUPER ADMIN (NUCLEUS) — SIN CAMBIOS
             ========================================================== */
          <div className="space-y-5 md:space-y-7 animate-in fade-in duration-700">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 md:gap-6">
              <div>
                <h2 className="text-3xl md:text-6xl font-bold tracking-tighter" style={{ fontFamily: 'var(--font-display)' }}>Nucleus Control</h2>
                <p className="font-medium mt-1 md:mt-2 text-sm md:text-lg tracking-tight" style={{ color: 'rgba(252,246,245,0.6)' }}>
                  Arquitectura centralizada de Non Sistemas.
                </p>
              </div>
              <div className="neo-onbrand-chip is-active flex items-center gap-2.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute h-full w-full rounded-full opacity-60" style={{ background: 'var(--ns-paper)' }} />
                  <span className="relative rounded-full h-2 w-2" style={{ background: 'var(--ns-paper)' }} />
                </span>
                Sistema estable
              </div>
            </header>

            {cobroSinConfigurar && (
              <div
                className="rounded-[26px] p-5 flex items-start gap-3.5"
                style={{ background: 'rgba(52,0,6,0.32)', boxShadow: 'inset 6px 6px 14px rgba(40,0,5,0.45), inset -5px -5px 12px rgba(255,255,255,0.07)' }}
                data-testid="aviso-cobro"
              >
                <svg className="w-5 h-5 shrink-0 mt-0.5" style={{ color: 'var(--ns-paper)' }} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <div>
                  <p className="text-sm font-bold">Falta configurar el canal de cobro</p>
                  <p className="text-[12px] font-medium mt-1 leading-relaxed" style={{ color: 'rgba(252,246,245,0.66)' }}>
                    Los botones «Activar plan» están cayendo al email de soporte. Definí <code className="font-mono">VITE_CONTACTO_WHATSAPP</code> (tu número internacional sin «+») en las variables de entorno de Vercel y volvé a desplegar.
                  </p>
                </div>
              </div>
            )}

            {/* Métricas globales */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              {[
                { label: 'Totales', val: statsGlobales.total, trend: 'Nodos' },
                { label: 'Activas', val: statsGlobales.activos, trend: 'Suscritos' },
                { label: 'En suspenso', val: statsGlobales.suspendidos, trend: 'Inactivos' },
                { label: 'Rubro dominante', val: Object.keys(statsGlobales.rubros).reduce((a, b) => statsGlobales.rubros[a] > statsGlobales.rubros[b] ? a : b, '...'), trend: 'Mercado', truncate: true }
              ].map((st) => (
                <div
                  key={st.label}
                  className="p-5 md:p-7 rounded-[26px] md:rounded-[32px] flex flex-col justify-between transition-transform duration-300 hover:-translate-y-1"
                  style={{ background: 'rgba(252,246,245,0.09)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2), 10px 12px 28px rgba(45,0,5,0.3)' }}
                >
                  <p className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.18em] truncate" style={{ color: 'rgba(252,246,245,0.55)' }}>{st.label}</p>
                  <h3 className={`font-bold mt-4 md:mt-6 tracking-tighter ${st.truncate ? 'truncate text-2xl md:text-4xl' : 'text-3xl md:text-5xl'}`} style={{ fontFamily: 'var(--font-display)' }}>
                    {st.val}
                  </h3>
                  <p className="text-[8px] md:text-[10px] font-black mt-3 md:mt-4 uppercase tracking-[0.18em]" style={{ color: 'rgba(252,246,245,0.32)' }}>{st.trend}</p>
                </div>
              ))}
            </div>

            {/* Directorio */}
            <div
              className="rounded-[32px] md:rounded-[40px] p-5 md:p-9"
              style={{ background: 'rgba(252,246,245,0.07)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.16), 16px 18px 42px rgba(45,0,5,0.28)' }}
            >
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-8 mb-6 md:mb-8">
                <div>
                  <h4 className="text-lg md:text-xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>Directorio global</h4>
                  <p className="text-xs md:text-sm mt-1" style={{ color: 'rgba(252,246,245,0.55)' }}>Gestión de licencias y accesos.</p>
                </div>
                <div className="relative w-full md:w-80">
                  <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'rgba(252,246,245,0.5)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                    <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <input
                    type="search"
                    placeholder="Buscar por ID o nombre…"
                    className="neo-onbrand-field w-full pl-11"
                    value={filtroBusqueda}
                    onChange={(e) => setFiltroBusqueda(e.target.value)}
                    aria-label="Buscar negocios"
                  />
                </div>
              </div>

              {negociosFiltrados.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-sm font-bold">No encontramos negocios</p>
                  <p className="text-xs mt-1" style={{ color: 'rgba(252,246,245,0.55)' }}>
                    {filtroBusqueda ? 'Probá con otro nombre o ID.' : 'Todavía no hay ninguno dado de alta.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {negociosFiltrados.map(n => {
                    const sn = getEstadoSuscripcion(n)
                    const badge = sn.estado === 'admin' ? { t: 'Admin', on: true }
                      : sn.estado === 'trial' ? { t: `Prueba · ${sn.diasRestantes}d`, on: false }
                      : sn.estado === 'activo' ? { t: `Activo${sn.diasRestantes != null ? ` · ${sn.diasRestantes}d` : ''}`, on: true }
                      : sn.estado === 'vencido' ? { t: 'Vencido', on: false }
                      : { t: 'Suspendido', on: false, tachado: true }
                    return (
                      <div
                        key={n.id}
                        className="p-4 md:p-5 rounded-[24px] md:rounded-[30px] flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all duration-300 hover:-translate-y-0.5 group"
                        style={{ background: 'rgba(252,246,245,0.08)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.14), 8px 10px 22px rgba(45,0,5,0.24)' }}
                      >
                        <div className="flex items-center gap-4 w-full min-w-0">
                          <div
                            className="w-12 h-12 md:w-14 md:h-14 rounded-[18px] flex items-center justify-center font-black text-lg md:text-xl shrink-0 transition-transform duration-300 group-hover:rotate-6"
                            style={{ background: 'var(--ns-paper)', color: 'var(--ns-primary)', boxShadow: '6px 7px 16px rgba(45,0,5,0.35)' }}
                          >
                            {(n.nombre || '?').charAt(0)}
                          </div>
                          <div className="overflow-hidden flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-bold text-base md:text-lg tracking-tight leading-none truncate">{n.nombre || 'Sin nombre'}</p>
                              <span className={`neo-onbrand-chip text-[9px] ${badge.on ? 'is-active' : ''}`} style={badge.tachado ? { textDecoration: 'line-through' } : undefined}>
                                {badge.t}
                              </span>
                            </div>
                            <div className="flex items-center gap-2.5 mt-2">
                              <span className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.16em] truncate" style={{ color: 'rgba(252,246,245,0.55)' }}>{n.rubro}</span>
                              <span className="text-[9px] font-mono uppercase hidden sm:inline" style={{ color: 'rgba(252,246,245,0.3)' }}>• {n.id.slice(0, 8)}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2.5 w-full md:w-auto">
                          <button
                            onClick={() => { const slug = (n.nombre || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''); window.open(`/app/${slug}/${n.id}`, '_blank') }}
                            className="neo-onbrand-btn neo-onbrand-btn--ghost p-3.5"
                            title="Ver la app pública"
                            aria-label={`Ver la app pública de ${n.nombre || 'este negocio'}`}
                          >
                            <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                              <path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </button>
                          {sn.estado !== 'admin' && (
                            <>
                              <button
                                onClick={() => registrarPago(n)}
                                className="neo-onbrand-btn flex-1 md:flex-none text-[9px] md:text-[10px] uppercase tracking-[0.16em] px-5 py-3.5"
                                title="Registrar pago (+30 días)"
                              >
                                +30 días
                              </button>
                              {sn.acceso && (
                                <button
                                  onClick={() => suspenderNegocio(n)}
                                  className="neo-onbrand-btn neo-onbrand-btn--ghost flex-1 md:flex-none text-[9px] md:text-[10px] uppercase tracking-[0.16em] px-5 py-3.5"
                                >
                                  Suspender
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* ==========================================================
             VISTA: DASHBOARD BUSINESS (OWNER) — MOBILE FIRST COMPLETO
             ========================================================== */
          <div className="space-y-4 md:space-y-5 animate-in slide-in-from-bottom-8 duration-700">

            {/* BANNER DE SUSCRIPCIÓN — Bento */}
            {(accesoSub.estado === 'trial' || (accesoSub.estado === 'activo' && accesoSub.diasRestantes != null && accesoSub.diasRestantes <= 5)) && (
              <div className={`flex flex-col sm:flex-row sm:items-center gap-3 px-4 md:px-5 py-3 md:py-3.5 rounded-2xl border ${accesoSub.estado === 'trial' ? 'bg-[#F2DDDE] border-[#E0B1B5]' : 'bg-[#FAF1F0] border-[#ECCFD1]'}`} data-testid="subscription-banner">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${accesoSub.estado === 'trial' ? 'bg-[#AF3643]' : 'bg-[#DAA2A7]'}`}>
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </div>
                  <div className="min-w-0">
                    <p className={`text-[13px] font-bold ${accesoSub.estado === 'trial' ? 'text-[#990011]' : 'text-[#A72231]'}`}>
                      {accesoSub.estado === 'trial'
                        ? `Prueba gratis · te ${accesoSub.diasRestantes === 1 ? 'queda 1 día' : `quedan ${accesoSub.diasRestantes} días`}`
                        : `Tu plan vence en ${accesoSub.diasRestantes === 1 ? '1 día' : `${accesoSub.diasRestantes} días`}`}
                    </p>
                    <p className={`text-[11px] font-medium ${accesoSub.estado === 'trial' ? 'text-[#AF3643]' : 'text-[#CB7B83]'}`}>
                      Plan {PLAN.nombre} · {formatearPrecio()}/mes · activá para no perder el acceso
                    </p>
                  </div>
                </div>
                <a
                  href={whatsappActivacion(negocio, session.user.email)}
                  target="_blank" rel="noopener noreferrer"
                  data-testid="subscription-banner-cta"
                  className={`shrink-0 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-white text-center transition-all active:scale-95 ${accesoSub.estado === 'trial' ? 'bg-[#AF3643]' : 'bg-[#DAA2A7]'}`}
                >
                  {accesoSub.estado === 'trial' ? 'Activar plan' : 'Renovar'}
                </a>
              </div>
            )}

            {/* AVISO CRÍTICO: sin horarios no hay disponibilidad en el link público */}
            {!tieneHorariosConfigurados(negocio) && (
              <button
                onClick={() => setTab('horarios')}
                data-testid="aviso-sin-horarios"
                className="w-full text-left flex items-center gap-3 px-4 md:px-5 py-3.5 rounded-2xl border transition-all active:scale-[0.99]"
                style={{ background: '#FAF1F0', borderColor: '#ECCFD1' }}
              >
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#DAA2A7' }}>
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-bold text-[#A72231]">Todavía no configuraste tus horarios</p>
                  <p className="text-[11px] font-medium text-[#CB7B83]">Sin horarios, tu link de reservas muestra todos los días cerrados. Tocá acá para configurarlos.</p>
                </div>
                <svg className="w-4 h-4 text-[#CB7B83] shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
            )}

            {/* BRAND HERO — Bento Card Light (sólo en pestañas que no son el inicio) */}
            {tab !== 'inicio' && (
            <header className="relative overflow-hidden rounded-3xl p-6 md:p-10 bg-[#FCF6F5] border group animate-in fade-in slide-in-from-top-4 duration-700" style={{ borderColor: 'var(--ns-border)', boxShadow: 'var(--ns-shadow-sm)' }}>
              <div className="relative z-10 flex items-center justify-between gap-6">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--ns-primary)' }} />
                    <span className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: 'var(--ns-text-muted)' }}>{tabsConfig.find(t => t.id === tab)?.label || 'Panel'}</span>
                  </div>
                  <h2 className="text-2xl md:text-4xl font-black tracking-tighter leading-none mb-1 truncate" style={{ color: 'var(--ns-text)' }}>{negocio.nombre}</h2>
                  <p className="text-[10px] md:text-xs font-black uppercase tracking-[0.15em]" style={{ color: 'var(--ns-primary)' }}>{negocio.rubro}</p>
                </div>
                {logoUrl && (
                  <div className="w-16 h-16 md:w-24 md:h-24 rounded-2xl md:rounded-3xl bg-[#F2DDDE] p-1 shrink-0 transform group-hover:scale-105 transition-transform duration-500">
                    <img src={logoUrl} className="w-full h-full object-cover rounded-[1rem] md:rounded-[1.5rem]" alt="Logo" />
                  </div>
                )}
              </div>
              <div className="absolute -bottom-16 -right-16 w-48 h-48 md:w-64 md:h-64 rounded-full blur-[80px] opacity-10 group-hover:opacity-15 transition-opacity duration-700 pointer-events-none" style={{ background: 'var(--ns-primary)' }}></div>
            </header>
            )}

            {/* ══════════ PESTAÑAS — barra deslizable bajo 1024px ══════════ */}
            <div className="lg:hidden -mx-1 px-1 overflow-x-auto no-scrollbar" data-tour="tabs">
              <div className="flex gap-1.5 w-max p-1.5 rounded-[22px]" style={{ background: 'var(--ns-sunken)', boxShadow: 'var(--neo-inset-sm)' }}>
                {tabsConfig.map((i) => (
                  <button
                    key={i.id}
                    onClick={() => { haptic(); setTab(i.id) }}
                    aria-current={tab === i.id ? 'page' : undefined}
                    className={`ns-tab ${tab === i.id ? 'active' : ''}`}
                    style={tab === i.id ? { background: 'var(--ns-surface)', boxShadow: 'var(--neo-raised-sm)' } : undefined}
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.4" viewBox="0 0 24 24"><path d={i.d} strokeLinecap="round" strokeLinejoin="round" /></svg>
                    {i.label}
                  </button>
                ))}
              </div>
            </div>

            {/* AREA DE CONTENIDO PRINCIPAL */}
            <div className="ns-mobile-content-area">

              {tab === 'inicio' && (
                <ErrorGuard fallbackMessage="No pudimos mostrar el resumen">
                <div data-tour="monitor">
                  {/* Panel de configuración guiada: estaba importado pero nunca
                      se renderizaba, así que el usuario nuevo caía en un panel
                      vacío sin saber qué hacer. */}
                  <GuidedSetup
                    negocio={negocio}
                    serviciosCount={crmStats.totalServicios}
                    empleadosCount={crmStats.totalEmpleados}
                    onNavigate={(t) => setTab(t)}
                  />
                  <DashboardHome
                    negocio={negocio}
                    vocab={vocab}
                    onNavigate={(t) => setTab(t)}
                    publicLink={publicLink}
                    showToast={showToast}
                    clientesCount={clientes.length}
                    stats={stats}
                    distribucionSemanal={distribucionSemanal}
                  />
                </div>
                </ErrorGuard>
              )}

              {/* GESTIÓN DINÁMICA DE TABS
                  Cada sección va dentro de su propio ErrorGuard: si una falla,
                  el resto del panel sigue funcionando. */}
              <div className="animate-in fade-in slide-in-from-left-4 duration-500">
                {tab === 'agenda' && <ErrorGuard fallbackMessage="No pudimos mostrar la agenda"><div data-tour="agenda"><Turnos negocioId={negocio.id} rubro={negocio.rubro} negocio={negocio} /></div></ErrorGuard>}
                {tab === 'reportes' && <ErrorGuard fallbackMessage="No pudimos generar los reportes"><Reportes negocioId={negocio.id} rubro={negocio.rubro} /></ErrorGuard>}
                {tab === 'servicios' && <ErrorGuard fallbackMessage="No pudimos mostrar tus servicios"><div data-tour="servicios"><Servicios negocioId={negocio.id} rubro={negocio.rubro} /></div></ErrorGuard>}
                {tab === 'equipo' && <ErrorGuard fallbackMessage="No pudimos mostrar tu equipo"><Empleados negocioId={negocio.id} rubro={negocio.rubro} /></ErrorGuard>}
                {tab === 'horarios' && <ErrorGuard fallbackMessage="No pudimos mostrar los horarios"><ConfiguracionHorarios negocio={negocio} onUpdate={() => inicializarPanel()} /></ErrorGuard>}
                {tab === 'inventario' && <ErrorGuard fallbackMessage="No pudimos mostrar el inventario"><InventarioPro negocioId={negocio.id} /></ErrorGuard>}
                {tab === 'flyer' && <ErrorGuard fallbackMessage="No pudimos abrir el creador de flyers"><FlyerCreatorPro negocio={negocio} publicLink={publicLink} /></ErrorGuard>}
              </div>

              {/* ====== TAB: CLIENTES — COMPLETO ====== */}
              {tab === 'clientes' && (
                <div className="space-y-4 ns-tab-content-enter">
                  {/* HEADER + BÚSQUEDA — Plastilina 3D */}
                  <header className="ns-section-header">
                    <div className="flex items-center justify-between relative z-10">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'var(--ns-gradient-1)', boxShadow: 'var(--ns-plastilina-btn)' }}>
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" strokeLinecap="round" strokeLinejoin="round" /></svg>
                          </div>
                          <span className="text-[9px] font-black uppercase tracking-[0.2em]" style={{ color: 'var(--ns-primary)' }}>Base de Datos</span>
                        </div>
                        <h2 className="text-2xl md:text-4xl font-black tracking-tighter leading-none" style={{ color: 'var(--ns-text)' }}>{vocab.clientePlural}</h2>
                        <p className="text-[10px] font-bold uppercase tracking-widest mt-1" style={{ color: 'var(--ns-text-muted)' }}>{clientes.length} registrados</p>
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

                    {/* STATS RÁPIDOS DE CLIENTES — Plastilina Bento */}
                    <div className="grid grid-cols-3 gap-2.5 relative z-10">
                      <div className="neo-tile !p-3.5 text-center items-center">
                        <span className="neo-stat__value" style={{ fontSize: 'clamp(20px,4vw,28px)' }}>{clientes.length}</span>
                        <span className="neo-stat__label">Total</span>
                      </div>
                      <div className="neo-tile !p-3.5 text-center items-center">
                        <span className="neo-stat__value" style={{ fontSize: 'clamp(20px,4vw,28px)' }}>{clientesVIP + clientesFrecuentes}</span>
                        <span className="neo-stat__label">Recurrentes</span>
                      </div>
                      <div className="neo-tile !p-3.5 text-center items-center">
                        <span className="neo-stat__value" style={{ fontSize: 'clamp(16px,3.2vw,22px)' }}>${totalIngresosClientes.toLocaleString('es-AR')}</span>
                        <span className="neo-stat__label">Facturado</span>
                      </div>
                    </div>

                    {/* BÚSQUEDA + ORDENAR — Plastilina */}
                    <div className="flex gap-2 relative z-10">
                      <div className="relative flex-1">
                        <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--ns-text-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        <input type="text" placeholder="Buscar cliente…" aria-label="Buscar cliente" className="neo-field pl-11" value={busquedaCliente} onChange={(e) => setBusquedaCliente(e.target.value)} />
                      </div>
                      <select value={ordenClientes} onChange={(e) => setOrdenClientes(e.target.value)} aria-label="Ordenar clientes" className="neo-field cursor-pointer w-auto shrink-0">
                        <option value="visitas">Visitas</option>
                        <option value="nombre">Nombre</option>
                        <option value="reciente">Reciente</option>
                        <option value="ingresos">Ingresos</option>
                      </select>
                    </div>
                  </header>

                  {cargandoClientes ? (
                    <div className="flex flex-col gap-3" aria-busy="true">
                      <div className="ns-skeleton" style={{ height: 84 }} />
                      <div className="ns-skeleton" style={{ height: 84 }} />
                      <div className="ns-skeleton" style={{ height: 84 }} />
                    </div>
                  ) : clientesFiltrados.length === 0 ? (
                    <div className="neo-card">
                      <div className="neo-empty">
                        <span className="neo-pod neo-pod--sunken neo-pod--lg">
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        </span>
                        <p className="neo-empty__title">{busquedaCliente ? 'Nadie con ese nombre' : 'Todavía sin clientes'}</p>
                        <p className="neo-empty__text">
                          {busquedaCliente
                            ? 'Probá con otro nombre, teléfono o email.'
                            : 'Se cargan solos con cada reserva que entra por tu link: no hace falta anotarlos a mano.'}
                        </p>
                        {!busquedaCliente && (
                          <button onClick={showCopyToast} className="neo-btn neo-btn--primary mt-1">Copiar mi link</button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="grid gap-3">
                      {clientesFiltrados.map((c, idx) => (
                        <div key={idx} className="ns-cliente-card ns-stagger-in" style={{ animationDelay: `${idx * 0.04}s` }}>
                          {/* Avatar Plastilina */}
                          <span className={`neo-pod neo-pod--lg font-display text-xl shrink-0 ${c.frecuencia === 'VIP' ? 'neo-pod--brand' : ''}`}>
                            {c.nombre?.charAt(0)?.toUpperCase() || '?'}
                          </span>
                          
                          <div className="flex-1 overflow-hidden min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-black text-base md:text-lg truncate leading-none" style={{ color: 'var(--ns-text)' }}>{c.nombre}</h4>
                              <span className={`neo-chip shrink-0 ${
                                c.frecuencia === 'VIP' ? 'neo-chip--solid'
                                : c.frecuencia === 'Frecuente' ? 'neo-chip--outline'
                                : 'neo-chip--quiet'
                              }`}>{c.frecuencia}</span>
                            </div>
                            <p className="text-[11px] font-semibold truncate" style={{ color: 'var(--ns-text-secondary)' }}>{c.telefono}{c.email ? ` · ${c.email}` : ''}</p>
                            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                              <span className="neo-chip neo-chip--soft">{c.visitas} visita{c.visitas !== 1 ? 's' : ''}</span>
                              <span className="neo-chip neo-chip--quiet tabular-nums">${c.ingresoTotal.toLocaleString('es-AR')}</span>
                              <span className="text-[9px] font-semibold" style={{ color: 'var(--ns-text-muted)' }}>Última: {formatearFechaRelativa(c.ultimaVisita)}</span>
                            </div>
                          </div>
                          
                          <div className="flex flex-col gap-2 shrink-0">
                            <button onClick={() => {
                              const num = c.telefono?.replace(/[^0-9]/g, '') || ''
                              window.open(`https://wa.me/${num}?text=${encodeURIComponent(`Hola ${c.nombre.split(' ')[0]}, te escribimos desde ${negocio.nombre}.`)}`, '_blank')
                            }} className="nh-wa-btn shrink-0" title="Escribir por WhatsApp" aria-label={`Escribirle por WhatsApp a ${c.nombre}`}>
                              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.888-.788-1.489-1.761-1.663-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 00-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" /></svg>
                            </button>
                            <button onClick={() => {
                              const num = c.telefono?.replace(/[^0-9]/g, '') || ''
                              window.open(`tel:${num}`)
                            }} className="neo-icon-btn shrink-0" title="Llamar" aria-label={`Llamar a ${c.nombre}`}>
                              <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" strokeLinecap="round" strokeLinejoin="round" /></svg>
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
                <div data-tour="ajustes" className="space-y-4 md:space-y-5 animate-in fade-in duration-700 max-w-2xl">

                  {/* SECCIÓN: PERFIL DEL NEGOCIO */}
                  <div className="ns-settings-card">
                    <div className="ns-settings-card-header">
                      <svg className="w-4 h-4" style={{ color: 'var(--ns-text-muted)' }} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.172-1.172a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 115.656-5.656L10 6.343l1.172-1.172z" /></svg>
                      <h4>Perfil y Marca</h4>
                    </div>
                    <div className="p-5 md:p-6 space-y-5">
                      {/* Acento de tu app de reservas */}
                      <div>
                        <label className="neo-eyebrow mb-2">Acento de tu app de reservas</label>
                        <div className="neo-well p-3">
                          <div className="grid grid-cols-5 gap-2.5">
                            {PALETA_MARCA.map((c) => {
                              const elegido = colorSeguro(colorPrimario) === c
                              return (
                                <button
                                  key={c}
                                  type="button"
                                  onClick={() => setColorPrimario(c)}
                                  aria-label={`Usar el tono ${c}`}
                                  aria-pressed={elegido}
                                  className="aspect-square rounded-full transition-all duration-300"
                                  style={{
                                    background: c,
                                    transform: elegido ? 'scale(1.08)' : 'scale(1)',
                                    boxShadow: elegido
                                      ? `0 0 0 3px var(--ns-surface), 0 0 0 5px ${c}, 6px 7px 14px rgba(153,0,17,0.28)`
                                      : '4px 5px 11px rgba(153,0,17,0.18), -3px -3px 8px rgba(255,255,255,0.9)'
                                  }}
                                />
                              )
                            })}
                            <label
                              className="aspect-square rounded-full grid place-items-center cursor-pointer transition-all duration-300"
                              style={{ background: 'var(--ns-sunken)', boxShadow: 'var(--neo-inset-sm)', color: 'var(--ns-text-muted)' }}
                              title="Elegir otro tono"
                            >
                              <input
                                type="color"
                                value={colorSeguro(colorPrimario)}
                                onChange={(e) => setColorPrimario(e.target.value)}
                                className="sr-only"
                                aria-label="Elegir otro tono para tu app de reservas"
                              />
                              <span className="text-lg leading-none font-bold">+</span>
                            </label>
                          </div>
                          <p className="neo-tip mt-3">Este tono sólo pinta la app que ven tus clientes. Tu panel siempre queda en la paleta de Noni.</p>
                        </div>
                      </div>

                      {/* Descripción */}
                      <div>
                        <label className="neo-eyebrow mb-2">Biografía</label>
                        <textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Frase de tu negocio que verán tus clientes..." className="neo-field resize-none h-24 md:h-28" />
                      </div>

                      {/* Instagram */}
                      <div>
                        <label className="neo-eyebrow mb-2">Instagram</label>
                        <div className="neo-field-group">
                          <span className="text-sm font-black" style={{ color: 'var(--ns-text-muted)' }}>@</span>
                          <input value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="tu_negocio" aria-label="Usuario de Instagram" className="flex-1 bg-transparent outline-none text-sm font-bold" style={{ color: 'var(--ns-text)' }} />
                        </div>
                      </div>

                      {/* Upload Logo y Portada */}
                      <div className="grid grid-cols-2 gap-3 md:gap-4">
                        <div className="space-y-2">
                          <label className="neo-eyebrow flex justify-between items-center">
                            Logo
                            {subiendoLogo && <div className="neo-spinner" style={{ width: 14, height: 14, borderWidth: 2 }}></div>}
                          </label>
                          <div className="relative aspect-square rounded-[20px] flex items-center justify-center overflow-hidden group" style={{ background: 'var(--ns-sunken)', boxShadow: 'var(--neo-inset)' }}>
                            {logoUrl ? <img src={logoUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform" /> : <svg className="h-5 w-5" style={{ color: 'var(--ns-text-faint)' }} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
                            <input type="file" accept="image/*" onChange={(e) => manejarSubidaImagen(e, 'logo')} className="absolute inset-0 opacity-0 cursor-pointer" />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="neo-eyebrow flex justify-between items-center">
                            Portada
                            {subiendoPortada && <div className="neo-spinner" style={{ width: 14, height: 14, borderWidth: 2 }}></div>}
                          </label>
                          <div className="relative aspect-square rounded-[20px] flex items-center justify-center overflow-hidden group" style={{ background: 'var(--ns-sunken)', boxShadow: 'var(--neo-inset)' }}>
                            {portadaUrl ? <img src={portadaUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform" /> : <svg className="h-5 w-5" style={{ color: 'var(--ns-text-faint)' }} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
                            <input type="file" accept="image/*" onChange={(e) => manejarSubidaImagen(e, 'portada')} className="absolute inset-0 opacity-0 cursor-pointer" />
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={actualizarBranding}
                        disabled={guardandoPerfil || subiendoLogo || subiendoPortada}
                        className="neo-btn neo-btn--primary neo-btn--block py-4 text-[9px] md:text-[10px] uppercase tracking-[0.2em]"
                      >
                        {guardandoPerfil ? <span className="neo-spinner neo-spinner--sm" style={{ borderTopColor: 'var(--ns-paper)' }} /> : 'Guardar Perfil'}
                      </button>
                    </div>
                  </div>

                  {/* SECCIÓN: DATOS DE CONTACTO */}
                  <div className="ns-settings-card">
                    <div className="ns-settings-card-header">
                      <svg className="w-4 h-4" style={{ color: 'var(--ns-text-muted)' }} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      <h4>Datos de Contacto</h4>
                    </div>
                    <div className="p-5 md:p-6 space-y-4">
                      <div>
                        <label className="neo-eyebrow mb-2">Teléfono / WhatsApp del Negocio</label>
                        <input value={telefonoNegocio} onChange={(e) => setTelefonoNegocio(e.target.value)} placeholder="Ej: +5493515551234" className="neo-field" />
                      </div>
                      <div>
                        <label className="neo-eyebrow mb-2">Dirección</label>
                        <input value={direccionNegocio} onChange={(e) => setDireccionNegocio(e.target.value)} placeholder="Ej: Av. Colón 1234, Córdoba" className="neo-field" />
                      </div>
                      <div>
                        <label className="neo-eyebrow mb-2">Ubicación — Google Maps</label>
                        <input value={mapaUrl} onChange={(e) => setMapaUrl(e.target.value)} placeholder='Pegá el link de Google Maps de tu negocio' className="neo-field" />
                        <p className="neo-tip">Abrí Google Maps, buscá tu negocio, tocá «Compartir» y pegá el link acá.</p>
                        {mapaUrl && !mapaEmbedUrl(mapaUrl, direccionNegocio) && (
                          <p className="neo-tip mt-2" style={{ color: 'var(--ns-primary)' }}>Ese link no parece de Google Maps. Pegá el que te da el botón «Compartir».</p>
                        )}
                        {mapaUrl && mapaEmbedUrl(mapaUrl, direccionNegocio) && (
                          <div className="mt-3 rounded-[18px] overflow-hidden h-40" style={{ boxShadow: 'var(--neo-inset)' }}>
                            <iframe
                              title="Ubicación del negocio"
                              src={mapaEmbedUrl(mapaUrl, direccionNegocio)}
                              width="100%" height="100%" style={{ border: 0 }} allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade"
                            ></iframe>
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="neo-eyebrow mb-2">Mensaje de Bienvenida</label>
                        <textarea value={mensajeBienvenida} onChange={(e) => setMensajeBienvenida(e.target.value)} placeholder="Mensaje que verán tus clientes al abrir la app de reservas..." className="neo-field resize-none h-20" />
                      </div>
                      <button
                        onClick={actualizarBranding}
                        disabled={guardandoPerfil}
                        className="neo-btn neo-btn--primary neo-btn--block"
                      >
                        {guardandoPerfil ? <span className="neo-spinner neo-spinner--sm" style={{ borderTopColor: 'var(--ns-paper)' }} /> : 'Guardar Contacto'}
                      </button>
                    </div>
                  </div>

                  {/* SECCIÓN: LINK PÚBLICO */}
                  <div className="ns-settings-card" data-tour="link">
                    <div className="ns-settings-card-header">
                      <svg className="w-4 h-4" style={{ color: 'var(--ns-text-muted)' }} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      <h4>Link Público</h4>
                    </div>
                    <div className="p-5 md:p-6">
                      <p className="text-[12px] font-medium mb-3 leading-relaxed" style={{ color: 'var(--ns-text-secondary)' }}>Este es tu link de reservas. Compartilo con tus clientes por WhatsApp, redes o donde quieras.</p>
                      <button type="button" className="w-full text-left flex items-center gap-2 rounded-[18px] p-3.5 cursor-pointer transition-all" style={{ background: 'var(--ns-sunken)', boxShadow: 'var(--neo-inset-sm)' }} onClick={showCopyToast}>
                        <code className="text-[10px] md:text-[11px] font-mono truncate flex-1" style={{ color: 'var(--ns-primary)' }}>{publicLink}</code>
                        <svg className="w-4 h-4 ml-auto shrink-0" style={{ color: 'var(--ns-text-muted)' }} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
                      </button>

                      {/* QR Code */}
                      <div className="mt-4 p-5 rounded-[22px] text-center" style={{ background: 'var(--ns-surface)', boxShadow: 'var(--neo-raised-sm)' }}>
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(publicLink)}&bgcolor=FCF6F5&color=990011&margin=8`}
                          alt="QR de reservas"
                          className="w-32 h-32 md:w-40 md:h-40 mx-auto rounded-lg"
                          loading="lazy"
                        />
                        <p className="neo-eyebrow mt-3">Escaneá para reservar</p>
                      </div>

                      <div className="grid grid-cols-3 gap-2 mt-3">
                        <button onClick={() => window.open(publicLink, '_blank')} className="neo-btn text-[10px] uppercase tracking-[0.14em] py-3">
                          Vista previa
                        </button>
                        <button onClick={() => {
                          const waMje = encodeURIComponent(`${vocab.shareWA} ${negocio.nombre}: ${publicLink}`)
                          window.open(`https://wa.me/?text=${waMje}`, '_blank')
                        }} className="neo-btn neo-btn--primary text-[10px] uppercase tracking-[0.14em] py-3">
                          Compartir
                        </button>
                        <button onClick={() => {
                          const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${encodeURIComponent(publicLink)}&bgcolor=FCF6F5&color=990011&margin=16&format=png`
                          const a = document.createElement('a')
                          a.href = qrUrl
                          a.download = `qr-${negocio?.nombre?.replace(/\s+/g, '-')?.toLowerCase() || 'reservas'}.png`
                          a.target = '_blank'
                          a.click()
                        }} className="neo-btn text-[10px] uppercase tracking-[0.14em] py-3">
                          Bajar QR
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* SECCIÓN: INFORMACIÓN DE CUENTA */}
                  <div className="ns-settings-card">
                    <div className="ns-settings-card-header">
                      <svg className="w-4 h-4" style={{ color: 'var(--ns-text-muted)' }} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      <h4>Cuenta</h4>
                    </div>
                    <div className="ns-settings-row">
                      <div>
                        <p className="neo-eyebrow">Email</p>
                        <p className="text-sm font-bold mt-0.5" style={{ color: 'var(--ns-text)' }}>{session.user.email}</p>
                      </div>
                    </div>
                    <div className="ns-settings-row">
                      <div>
                        <p className="neo-eyebrow">Rubro</p>
                        <p className="text-sm font-bold mt-0.5" style={{ color: 'var(--ns-text)' }}>{negocio.rubro}</p>
                      </div>
                    </div>
                    <div className="ns-settings-row">
                      <div>
                        <p className="neo-eyebrow">Estado</p>
                        <p className="text-sm font-bold mt-0.5" style={{ color: 'var(--ns-text)' }}>{etiquetaEstado(accesoSub.estado)}{accesoSub.diasRestantes != null ? ` · ${accesoSub.diasRestantes}d` : ''}</p>
                      </div>
                      <span className={`neo-chip ${accesoSub.acceso ? (accesoSub.estado === 'trial' ? 'neo-chip--outline' : 'neo-chip--solid') : 'neo-chip--quiet'}`}>
                        {accesoSub.acceso ? (accesoSub.estado === 'trial' ? 'En prueba' : 'Al día') : 'Sin acceso'}
                      </span>
                    </div>
                    <div className="ns-settings-row">
                      <div>
                        <p className="neo-eyebrow">ID del Negocio</p>
                        <p className="text-[10px] font-mono mt-0.5 break-all" style={{ color: 'var(--ns-text-muted)' }}>{negocio.id}</p>
                      </div>
                    </div>
                  </div>

                  {/* SECCIÓN: SUSCRIPCIÓN / PLAN */}
                  <div className="ns-settings-card" data-testid="subscription-card">
                    <div className="ns-settings-card-header">
                      <svg className="w-4 h-4" style={{ color: 'var(--ns-text-muted)' }} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 10h18M7 15h1m4 0h1m-7 4h12a2 2 0 002-2V7a2 2 0 00-2-2H6a2 2 0 00-2 2v10a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      <h4>Suscripción</h4>
                    </div>
                    <div className="p-4 md:p-5">
                      <div className="neo-well overflow-hidden p-0">
                        <div className="p-5">
                          <div className="flex items-center justify-between gap-2 mb-3">
                            <span className="neo-eyebrow">Plan {PLAN.nombre}</span>
                            <span className={`neo-chip ${accesoSub.estado === 'trial' ? 'neo-chip--outline' : accesoSub.acceso ? 'neo-chip--solid' : 'neo-chip--quiet'}`}>{etiquetaEstado(accesoSub.estado)}</span>
                          </div>
                          <div className="flex items-end gap-1 mb-1">
                            <span className="font-display text-3xl font-black tracking-tighter" style={{ color: 'var(--ns-text)' }}>{formatearPrecio()}</span>
                            <span className="text-xs font-bold mb-1" style={{ color: 'var(--ns-text-muted)' }}>/mes</span>
                          </div>
                          {accesoSub.diasRestantes != null ? (
                            <p className="text-[12px] font-medium" style={{ color: 'var(--ns-text-muted)' }}>
                              {accesoSub.estado === 'trial' ? 'Prueba gratis · ' : 'Activo · '}
                              te {accesoSub.diasRestantes === 1 ? 'queda 1 día' : `quedan ${accesoSub.diasRestantes} días`}
                              {accesoSub.vence ? ` (hasta ${new Date(accesoSub.vence).toLocaleDateString('es-AR')})` : ''}
                            </p>
                          ) : (
                            <p className="text-[12px] font-medium" style={{ color: 'var(--ns-text-muted)' }}>Todo incluido: reservas, CRM, reportes e inventario.</p>
                          )}
                        </div>
                        <div className="px-5 pb-5">
                          <a
                            href={whatsappActivacion(negocio, session.user.email)}
                            target="_blank" rel="noopener noreferrer"
                            data-testid="subscription-card-cta"
                            className="neo-btn neo-btn--primary neo-btn--block py-3.5 text-[10px] uppercase tracking-[0.2em] gap-2"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-4 4v-4z" strokeLinecap="round" strokeLinejoin="round" /></svg>
                            {accesoSub.estado === 'activo' ? 'Renovar suscripción' : 'Activar plan'}
                          </a>
                          <p className="neo-tip text-center mt-2.5">Activación manual · te respondemos al toque</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* SECCIÓN: ZONA DE SEGURIDAD */}
                  <div className="ns-settings-card">
                    <div className="ns-settings-card-header">
                      <svg className="w-4 h-4" style={{ color: 'var(--ns-text-muted)' }} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      <h4>Seguridad</h4>
                    </div>
                    <button onClick={() => window.location.href = '/actualizar-clave'} className="ns-settings-row cursor-pointer w-full text-left">
                      <div className="flex items-center gap-3">
                        <svg className="w-4 h-4" style={{ color: 'var(--ns-text-muted)' }} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        <span className="text-sm font-bold" style={{ color: 'var(--ns-text)' }}>Cambiar contraseña</span>
                      </div>
                      <svg className="w-4 h-4" style={{ color: 'var(--ns-text-muted)' }} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </button>
                    <button onClick={cerrarSesion} className="ns-settings-row cursor-pointer w-full text-left group">
                      <div className="flex items-center gap-3">
                        <svg className="w-4 h-4" style={{ color: 'var(--ns-primary)' }} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        <span className="text-sm font-black" style={{ color: 'var(--ns-primary)' }}>Cerrar sesión</span>
                      </div>
                      <svg className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" style={{ color: 'var(--ns-primary)' }} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </button>
                  </div>

                </div>
              )}

            </div>
          </div>
        )}
        </div>
      </main>

        </div>
      </div>

      {/* ====== DOCK INFERIOR — navegación móvil ====== */}
      {esPanelNegocio && (
        <nav className="ns-bottom-nav" aria-label="Navegación principal" data-tour="nav-mobile">
          {bottomNavTabs.map(item => (
            <button
              key={item.id}
              onClick={() => { haptic(); setTab(item.id) }}
              aria-current={tab === item.id ? 'page' : undefined}
              className={`ns-bottom-nav-item ${tab === item.id ? 'active' : ''}`}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><path d={item.d} strokeLinecap="round" strokeLinejoin="round" /></svg>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      )}

      {/* Ayuda de atajos con "?" */}
      <Atajos />

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
            hasShared: !!localStorage.getItem('ns_link_shared'),
            hasTurnos: stats.hoy > 0 || actividadReciente.length > 0,
          }}
          vocab={vocab}
          publicLink={publicLink}
          onNavigate={(t) => setTab(t)}
          onStartTour={() => tour.start()}
          negocio={negocio}
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