import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '../supabaseClient'
import { getVocabulario, mayusculaInicial } from '../utils/vocabulario'
import Lente from './ui/Lente'
import { verificarDisponibilidad, parseFecha, normalizarHorarios } from '../utils/reservas'
import { useToast } from './Toast'
import { haptic } from '../utils/haptics'
import { IconRobot } from './NoniIcons'
import { usePersistentState } from '../hooks/usePersistentState'

const TURNO_VACIO = { cliente_nombre: '', cliente_telefono: '', empleado_id: '', servicio_id: '', hora: '09:00' }
const DOCE_HORAS = 12 * 60 * 60 * 1000

export default function Turnos({ negocioId, rubro, negocio }) {
  const vocab = getVocabulario(rubro)
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [fechaActual, setFechaActual] = useState(new Date())
  const [turnos, setTurnos] = useState([])
  const [todosLosTurnos, setTodosLosTurnos] = useState([])
  const [empleados, setEmpleados] = useState([])
  const [servicios, setServicios] = useState([])
  // El filtro de profesional se recuerda por negocio: quien mira siempre la
  // agenda de una sola persona no tiene que elegirla cada vez.
  const [filtroEmpleado, setFiltroEmpleado] = usePersistentState(`ui:agenda:empleado:${negocioId}`, 'todos')

  const [modalDiaAbierto, setModalDiaAbierto] = useState(false)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [confirmDialog, setConfirmDialog] = useState({ show: false, id: null })
  // Borrador de la cita nueva: si se cierra la hoja sin querer, se va la señal
  // o el sistema mata la pestaña, los datos siguen ahí al volver (12 horas).
  const [nuevoTurno, setNuevoTurno] = usePersistentState(`borrador:turno:${negocioId}`, TURNO_VACIO, { ttl: DOCE_HORAS })
  const hayBorrador = Boolean(nuevoTurno.cliente_nombre || nuevoTurno.cliente_telefono)

  // Parseo unificado de los timestamps de Supabase (ver utils/reservas.js)
  const safeParseDate = parseFecha

  // La consulta arranca dos meses antes del mes que se está mirando, así que
  // al navegar hacia atrás hay que volver a pedirla: antes el calendario se
  // quedaba vacío a partir del tercer mes hacia atrás y parecía que no había
  // turnos.
  const mesVisible = `${fechaActual.getFullYear()}-${fechaActual.getMonth()}`

  useEffect(() => {
    if (negocioId) bootSmartAgenda()
  }, [negocioId, filtroEmpleado, mesVisible])

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

      if (resEmp.data) {
        setEmpleados(resEmp.data)
        // Un filtro guardado de alguien que ya no está en el equipo no sirve.
        if (filtroEmpleado !== 'todos' && !resEmp.data.some((e) => String(e.id) === String(filtroEmpleado))) {
          setFiltroEmpleado('todos')
        }
      }
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
      if (e.message?.includes('JWT') || e.message?.includes('expired')) {
        const { error: refreshErr } = await supabase.auth.refreshSession()
        if (refreshErr) {
          toast.error('Tu sesión expiró. Serás redirigido al login.')
          await supabase.auth.signOut()
          window.location.href = '/login'
        } else {
          bootSmartAgenda()
          return
        }
      }
    } finally {
      setLoading(false)
    }
  }

  async function marcarEstado(id, estado) {
    const { error } = await supabase.from('turnos').update({ estado }).eq('id', id)
    if (error) {
      toast.error('Error al actualizar el estado del turno')
    } else {
      const msg = estado === 'completado' ? 'Turno marcado como atendido' :
                  estado === 'no_show'    ? 'Turno marcado como no presentado' :
                                           'Turno revertido a confirmado'
      toast.success(msg)
      bootSmartAgenda()
    }
  }

  function enviarRecordatorio(t) {
    const tDate = safeParseDate(t.fecha_hora)
    const horaStr  = tDate ? tDate.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }) : ''
    const fechaStr = tDate ? tDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }) : ''
    const negocioNombre = negocio?.nombre || 'nuestro local'
    const msg = encodeURIComponent(
      `Hola ${t.cliente_nombre}! Te recordamos tu turno para el ${fechaStr} a las ${horaStr} en ${negocioNombre}. ¡Te esperamos!`
    )
    const phone = t.cliente_telefono?.replace(/[^0-9]/g, '')
    window.open(`https://wa.me/${phone}?text=${msg}`, '_blank')
    supabase.from('turnos').update({ recordatorio_enviado: true }).eq('id', t.id)
      .then(() => bootSmartAgenda())
  }

  /**
   * Cancelar un turno.
   *
   * Antes esto borraba la fila: se perdía el historial del cliente y la
   * facturación del período. Ahora lo marcamos como 'cancelado' (el horario
   * queda libre igual) y sólo borramos como último recurso, si la base rechaza
   * el estado por un CHECK viejo.
   */
  async function confirmarYCancelarTurno(idForzado = null) {
    const id = idForzado || confirmDialog.id
    if (!id) return
    setConfirmDialog({ show: false, id: null })

    const { error } = await supabase
      .from('turnos')
      .update({ estado: 'cancelado' })
      .eq('id', id)
      .eq('negocio_id', negocioId)

    if (error) {
      if (error.message?.includes('JWT') || error.code === '401' || error.message?.includes('expired')) {
        const { error: refreshErr } = await supabase.auth.refreshSession()
        if (refreshErr) {
          toast.error('Tu sesión expiró. Serás redirigido al login.')
          await supabase.auth.signOut()
          window.location.href = '/login'
          return
        }
        return confirmarYCancelarTurno(id)
      }

      // 23514 = violación de CHECK: la base no acepta el estado 'cancelado'.
      if (error.code === '23514' || /check constraint/i.test(error.message || '')) {
        const { error: delErr } = await supabase.from('turnos').delete().eq('id', id).eq('negocio_id', negocioId)
        if (delErr) { toast.error('No se pudo cancelar el turno: ' + delErr.message); return }
        toast.success('Turno cancelado')
        bootSmartAgenda()
        return
      }

      toast.error('No se pudo cancelar el turno: ' + error.message)
      return
    }

    toast.success('Turno cancelado · el horario volvió a quedar libre')
    bootSmartAgenda()
  }

  const dispararGoogleCalendar = (turnoRaw, servicioData, empleadoData) => {
    // Si es un turno de DB, viene en UTC. Si es un insert manual fresco, armamos el Date
    const inicio = turnoRaw.fecha_hora ? new Date(turnoRaw.fecha_hora) : new Date(`${fechaActual.getFullYear()}-${String(fechaActual.getMonth() + 1).padStart(2, '0')}-${String(fechaActual.getDate()).padStart(2, '0')}T${turnoRaw.hora}:00`)

    const duracion = servicioData?.duracion_minutos || 30
    const fin = new Date(inicio.getTime() + duracion * 60000)

    const fmt = (d) => d.toISOString().replace(/-|:|\.\d\d\d/g, "")

    const titulo = encodeURIComponent(`RESERVA: ${servicioData?.nombre || vocab.servicio} - ${turnoRaw.cliente_nombre}`)
    const detalles = encodeURIComponent(`Cliente: ${turnoRaw.cliente_nombre}\nWhatsApp: ${turnoRaw.cliente_telefono}\n${vocab.empleado.charAt(0).toUpperCase() + vocab.empleado.slice(1)}: ${empleadoData?.nombre}\n\nGestión: Non Sistemas`)
    const intervalo = `${fmt(inicio)}/${fmt(fin)}`

    const win = window.open(`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${titulo}&dates=${intervalo}&details=${detalles}&sf=true&output=xml`, '_blank', 'noopener')
    if (!win) toast.info('Permití las ventanas emergentes si querés agendarlo en Google Calendar.')
  }

  /* ═══════════════════════════════════════════
     CALENDAR — Light theme, brand colors
     ═══════════════════════════════════════════ */
  const renderCalendarioCompleto = () => {
    const year = fechaActual.getFullYear()
    const month = fechaActual.getMonth()
    const primerDia = new Date(year, month, 1).getDay()
    const diasEnMes = new Date(year, month + 1, 0).getDate()

    const nombresDias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
    const blanks = Array.from({ length: primerDia }).map((_, i) => (
      <div key={`b-${i}`} className="h-11 md:h-12" aria-hidden="true" />
    ))

    const days = Array.from({ length: diasEnMes }).map((_, i) => {
      const dayNum = i + 1
      const d = new Date(year, month, dayNum)
      const isSelected = d.toDateString() === fechaActual.toDateString()
      const isToday = d.toDateString() === new Date().toDateString()

      const turnosEseDia = todosLosTurnos.filter(t => {
        if (t.estado === 'cancelado') return false
        const tDate = safeParseDate(t.fecha_hora)
        if (!tDate) return false
        return tDate.getFullYear() === year && tDate.getMonth() === month && tDate.getDate() === dayNum
      })
      const contador = turnosEseDia.length
      const etiquetaDia = `${dayNum} de ${d.toLocaleDateString('es-ES', { month: 'long' })}` +
        (contador ? ` · ${contador} ${contador === 1 ? 'turno' : 'turnos'}` : ' · sin turnos')

      return (
        <button
          key={dayNum}
          onClick={() => { haptic('select'); setFechaActual(d); setModalDiaAbierto(true) }}
          aria-label={etiquetaDia}
          aria-current={isToday ? 'date' : undefined}
          title={etiquetaDia}
          className="ns-cal-day h-11 md:h-12 flex flex-col items-center justify-center gap-1 rounded-[12px] transition-colors duration-150"
          style={isSelected
            ? {
                background: 'var(--ns-primary)',
                color: '#FFFFFF',
              }
            : {
                background: 'transparent',
                color: isToday ? 'var(--ns-primary)' : 'var(--ns-text)',
              }}
        >
          <span className={`text-[14px] tabular-nums ${isSelected || isToday ? 'font-bold' : 'font-medium'}`}>{dayNum}</span>

          {contador > 0 && (
            <span className="flex gap-[3px] items-center h-1.5">
              {contador < 4
                ? Array.from({ length: contador }).map((_, idx) => (
                    <span
                      key={idx}
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ background: isSelected ? 'var(--ns-paper)' : 'var(--ns-primary)', opacity: isSelected ? 0.85 : 1 }}
                    />
                  ))
                : (
                  <span className="text-[9px] font-bold leading-none" style={{ opacity: isSelected ? 0.9 : 0.75 }}>
                    {contador}
                  </span>
                )}
            </span>
          )}
        </button>
      )
    })

    return (
      <div className="ui-card p-4 md:p-6 w-full">
        <div className="flex justify-between items-center mb-5">
          <button
            onClick={() => { haptic(); setFechaActual(new Date(year, month - 1, 1)) }}
            className="ui-icon-btn"
            aria-label="Mes anterior"
          >
            <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="2.6" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          </button>
          <h3 className="font-display text-base md:text-lg font-bold tracking-tight" style={{ color: 'var(--ns-text)' }}>
            {mayusculaInicial(new Date(year, month, 1).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }))}
          </h3>
          <button
            onClick={() => { haptic(); setFechaActual(new Date(year, month + 1, 1)) }}
            className="ui-icon-btn"
            aria-label="Mes siguiente"
          >
            <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="2.6" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>

        <div className="ui-well !p-3 md:!p-4">
          <div className="grid grid-cols-7 gap-1 mb-1 text-center">
            {nombresDias.map(n => (
              <div key={n} className="text-[9px] font-bold uppercase tracking-[0.06em]" style={{ color: 'var(--ns-text-faint)' }}>{n}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {blanks}
            {days}
          </div>
        </div>
      </div>
    )
  }

  async function handleGuardarTurno(e) {
    e.preventDefault()

    const nombre = nuevoTurno.cliente_nombre.trim()
    const telefono = nuevoTurno.cliente_telefono.trim()
    if (nombre.length < 2) return toast.error('Poné el nombre del cliente.')
    if (!nuevoTurno.servicio_id) return toast.error(`Elegí un ${vocab.servicio}.`)
    if (!/^\d{2}:\d{2}$/.test(nuevoTurno.hora)) return toast.error('La hora no es válida.')

    setGuardando(true)
    try {
      // FORMATEO LOCAL ESTRICTO
      const yyyy = fechaActual.getFullYear()
      const mm = String(fechaActual.getMonth() + 1).padStart(2, '0')
      const dd = String(fechaActual.getDate()).padStart(2, '0')
      const dateObj = new Date(`${yyyy}-${mm}-${dd}T${nuevoTurno.hora}:00`)
      const fechaHoraExacta = dateObj.toISOString()

      const serv = servicios.find(s => s.id === nuevoTurno.servicio_id)
      const emp = empleados.find(e => e.id === nuevoTurno.empleado_id)

      // Colisión considerando la duración real del servicio (antes sólo se
      // comparaba la hora exacta y se podían superponer turnos largos).
      const { ok, motivo } = await verificarDisponibilidad(supabase, {
        negocioId,
        empleadoId: nuevoTurno.empleado_id || null,
        inicio: dateObj,
        duracionMin: serv?.duracion_minutos || 30,
      })

      if (!ok) {
        toast.warning(motivo)
        setGuardando(false)
        return
      }

      const { hora: _hora, empleado_id, ...turnoData } = nuevoTurno
      const { error } = await supabase.from('turnos').insert([{
        ...turnoData,
        cliente_nombre: nombre,
        cliente_telefono: telefono,
        empleado_id: empleado_id || null,
        negocio_id: negocioId,
        fecha_hora: fechaHoraExacta,
        estado: 'confirmado'
      }])

      if (error) {
        if (error.code === '23505') {
          toast.warning('Ese horario acaba de ocuparse. Elegí otro.')
          setGuardando(false)
          bootSmartAgenda()
          return
        }
        throw error
      }

      toast.success("Turno agendado con éxito")
      setModalAbierto(false)
      setNuevoTurno(TURNO_VACIO)
      bootSmartAgenda()
      dispararGoogleCalendar({ ...nuevoTurno, cliente_nombre: nombre, cliente_telefono: telefono }, serv, emp)
    } catch (err) {
      toast.error("Error al agendar: " + err.message)
    } finally {
      setGuardando(false)
    }
  }

  function cancelarTurno(id) {
    setConfirmDialog({ show: true, id })
  }

  const extraeHoraSegura = (fechaString) => {
    const tDate = safeParseDate(fechaString)
    return tDate ? tDate.getHours() : 0
  }

  // Un turno cancelado ya no cuenta en la agenda del día.
  const turnosVigentes = turnos.filter(t => t.estado !== 'cancelado')

  const turnosMañana = turnosVigentes.filter(t => extraeHoraSegura(t.fecha_hora) < 12)
  const turnosTarde = turnosVigentes.filter(t => {
    const h = extraeHoraSegura(t.fecha_hora)
    return h >= 12 && h < 18
  })
  const turnosNoche = turnosVigentes.filter(t => extraeHoraSegura(t.fecha_hora) >= 18)

  /**
   * Tarjeta de un turno.
   *
   * Con una sola tinta, el estado NO puede depender del color: antes esto
   * usaba verde para atendido, rojo para ausente y gris para cancelado, y al
   * unificar la paleta los tres quedaban idénticos —lo mismo los cinco
   * botones de acción—. Ahora el estado se lee por relieve y forma:
   * en relieve = activo, hundido = resuelto, con la etiqueta diciendo cuál.
   */
  const renderTurnoCard = (t) => {
    const fechaTurno = safeParseDate(t.fecha_hora) || new Date(t.fecha_hora)
    const horaLocal = fechaTurno.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
    const fechaAmigable = fechaTurno.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })
    const esResuelto = t.estado === 'completado' || t.estado === 'no_show' || t.estado === 'cancelado'
    const esFuturo = fechaTurno > new Date()
    const tituloAccesible = `${t.cliente_nombre} · ${fechaAmigable} a las ${horaLocal}${esFuturo ? '' : ' (ya pasó)'}`

    const etiqueta = t.estado === 'completado'
      ? { texto: 'Atendido', clase: 'ui-chip--solid' }
      : t.estado === 'no_show'
      ? { texto: 'No vino', clase: 'ui-chip--outline' }
      : t.estado === 'cancelado'
      ? { texto: 'Cancelado', clase: 'ui-chip--cancelled' }
      : null

    return (
      <article
        key={t.id}
        title={tituloAccesible}
        data-testid={`turno-${t.id}`}
        className="rounded-[26px] p-4 md:p-5 flex flex-col md:flex-row md:flex-wrap items-start md:items-center gap-3 md:gap-5 transition-all"
        style={esResuelto
          ? { background: 'var(--ns-sunken)', boxShadow: 'var(--ui-field-sm)' }
          : { background: 'var(--ns-surface)', boxShadow: 'var(--ui-shadow)' }}
      >
        {/* Hora */}
        <div className="flex md:flex-col items-center gap-2.5 md:gap-1 justify-between md:justify-center shrink-0 w-full md:w-24">
          <span
            className="font-display text-2xl md:text-[32px] font-bold tracking-tight leading-none tabular-nums"
            style={{ color: esResuelto ? 'var(--ns-text-muted)' : 'var(--ns-text)' }}
          >
            {horaLocal}
          </span>
          <div className="flex items-center gap-1.5 flex-wrap md:justify-center">
            <span className="text-[9px] font-bold uppercase tracking-[0.06em]" style={{ color: 'var(--ns-text-faint)' }}>
              {t.servicios?.duracion_minutos || 30} min
            </span>
            {etiqueta && <span className={`ui-chip ${etiqueta.clase}`}>{etiqueta.texto}</span>}
          </div>
        </div>

        {/* Datos del cliente */}
        <div className="flex-1 overflow-hidden w-full md:min-w-[200px]">
          <h4
            className="text-base md:text-lg font-bold truncate leading-tight mb-1"
            style={{ color: esResuelto ? 'var(--ns-text-muted)' : 'var(--ns-text)' }}
          >
            {t.cliente_nombre}
          </h4>

          <div className="flex items-center gap-2 mb-2 flex-wrap" style={{ color: 'var(--ns-text-muted)' }}>
            {t.cliente_telefono && (
              <a
                href={`tel:${t.cliente_telefono.replace(/[^0-9+]/g, '')}`}
                className="flex items-center gap-1.5 text-xs font-semibold hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                {t.cliente_telefono}
              </a>
            )}
            {t.cliente_email && (
              <span className="flex items-center gap-1.5 text-xs font-semibold truncate max-w-[220px]">
                <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                {t.cliente_email}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {t.servicios?.nombre && <span className="ui-chip ui-chip--soft">{t.servicios.nombre}</span>}
            <span className="ui-chip ui-chip--quiet">
              {t.empleados ? t.empleados.nombre.split(' ')[0] : vocab.fallbackStaff}
            </span>
            {t.servicios?.precio > 0 && (
              <span className="ui-chip tabular-nums">${Number(t.servicios.precio).toLocaleString('es-AR')}</span>
            )}
            {t.notas && <span className="ui-chip ui-chip--quiet truncate max-w-[220px]">{t.notas}</span>}
          </div>
        </div>

        {/* Acciones */}
        <div className="flex flex-row flex-wrap gap-2 shrink-0 w-full md:w-auto md:ml-auto justify-end">
          {esResuelto ? (
            <button onClick={() => marcarEstado(t.id, 'confirmado')} className="ui-btn ui-btn--quiet" title="Volver a dejarlo activo">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a5 5 0 010 10H9m-6-10l4-4m-4 4l4 4" /></svg>
              Reabrir
            </button>
          ) : (
            <>
              <button
                onClick={() => marcarEstado(t.id, 'completado')}
                className="ui-btn ui-btn--primary ui-btn--quiet"
                title="Marcar como atendido"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.6" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
                Atendido
              </button>
              <button onClick={() => marcarEstado(t.id, 'no_show')} className="ui-icon-btn" title="No se presentó" aria-label="Marcar que no se presentó">
                <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="2.4" viewBox="0 0 24 24"><path d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
              <button
                onClick={() => enviarRecordatorio(t)}
                className={`ui-icon-btn ${t.recordatorio_enviado ? 'ui-icon-btn--active' : ''}`}
                title={t.recordatorio_enviado ? 'Recordatorio ya enviado' : 'Recordar por WhatsApp'}
                aria-label="Recordar por WhatsApp"
              >
                <svg className="w-[18px] h-[18px]" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" /></svg>
              </button>
              <button onClick={() => dispararGoogleCalendar(t, t.servicios, t.empleados)} className="ui-icon-btn" title="Agendar en Google Calendar" aria-label="Agendar en Google Calendar">
                <svg className="w-[18px] h-[18px]" fill="currentColor" viewBox="0 0 24 24"><path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zM9 14H7v-2h2v2zm4 0h-2v-2h2v2zm4 0h-2v-2h2v2zm-8 4H7v-2h2v2zm4 0h-2v-2h2v2zm4 0h-2v-2h2v2z" /></svg>
              </button>
              <button onClick={() => cancelarTurno(t.id)} className="ui-icon-btn" title="Cancelar turno" aria-label="Cancelar turno">
                <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="2.4" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
            </>
          )}
        </div>
      </article>
    )
  }

  return (
    <div className="flex flex-col w-full overflow-hidden relative">

      {loading && (
        <div className="absolute top-2 right-2 z-50" aria-live="polite">
          <span className="ui-spinner ui-spinner--sm" role="status" aria-label="Actualizando la agenda" />
        </div>
      )}

      {/* VISTA PRINCIPAL: CALENDARIO */}
      <div className="flex-1 space-y-6 w-full">

        {/* Header */}
        <div className="flex items-end justify-between">
          <div>
            <h1 className="ui-head__title">Agenda</h1>
            <div className="flex items-center gap-2 mt-2">
              <span className="ns-live-dot" style={{ width: 7, height: 7 }} />
              <p className="ui-eyebrow">{todosLosTurnos.length} {vocab.citasRegistradas.toLowerCase()}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setFechaActual(new Date()); setModalDiaAbierto(true); }}
              className="ui-btn ui-btn--quiet"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.4" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              Hoy
            </button>
            <button
              onClick={() => { haptic('select'); setModalAbierto(true) }}
              className="ui-btn ui-btn--primary hidden lg:inline-flex"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.6" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" strokeLinecap="round" /></svg>
              {vocab.nuevaCita}
            </button>
          </div>
        </div>

        {/* En escritorio: calendario a la izquierda, turnos y cupos a la
            derecha. Antes todo se apilaba en una sola columna angosta y la
            agenda medía más de 1700px de alto con media pantalla vacía. */}
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:items-start">

        {/* Calendar */}
        <div className="w-full min-w-0">
          {renderCalendarioCompleto()}
        </div>

        <div className="space-y-6 min-w-0">

        {/* Employee Filters */}
        <div className="overflow-x-auto no-scrollbar -mx-1 px-1">
          <div className="ui-segment w-max">
            <button
              onClick={() => { haptic(); setFiltroEmpleado('todos') }}
              className={filtroEmpleado === 'todos' ? 'is-active' : ''}
              aria-pressed={filtroEmpleado === 'todos'}
            >
              {filtroEmpleado === 'todos' && <Lente grupo="agenda-equipo" />}
              {vocab.filtroTodos}
            </button>
            {empleados.map(e => (
              <button
                key={e.id}
                onClick={() => { haptic(); setFiltroEmpleado(e.id) }}
                className={`flex items-center gap-2 ${filtroEmpleado === e.id ? 'is-active' : ''}`}
                aria-pressed={filtroEmpleado === e.id}
              >
                {filtroEmpleado === e.id && <Lente grupo="agenda-equipo" />}
                <span className="w-6 h-6 rounded-full overflow-hidden shrink-0" style={{ boxShadow: 'var(--ui-shadow-sm)' }}>
                  {e.foto_url
                    ? <img src={e.foto_url} alt="" className="object-cover h-full w-full" />
                    : <span className="w-full h-full flex items-center justify-center text-[10px] font-bold" style={{ background: 'var(--ns-sunken)', color: 'var(--ns-primary)' }}>{e.nombre[0]}</span>}
                </span>
                {e.nombre.split(' ')[0]}
              </button>
            ))}
          </div>
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
            <div className="space-y-4">
              <div className="flex items-center gap-2.5">
                <span className="ns-live-dot" style={{ width: 7, height: 7 }} />
                <h3 className="ui-eyebrow">Próximos {vocab.turnos}</h3>
              </div>
              <div className="grid gap-3">
                {proximos.map(t => {
                  const tDate = safeParseDate(t.fecha_hora)
                  const horaStr = tDate.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
                  const fechaStr = tDate.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' }).replace('.', '')
                  const esHoy = tDate.toDateString() === new Date().toDateString()
                  return (
                    <div key={t.id} className="ui-tile !flex-row items-center gap-4 !py-3.5">
                      <span className={`ui-pod ui-pod--lg flex-col leading-none ${esHoy ? 'ui-pod--brand' : 'ui-pod--sunken'}`}>
                        <span className="text-sm font-bold tabular-nums">{horaStr}</span>
                        <span className="text-[8px] font-bold uppercase tracking-wider mt-0.5 opacity-80">{esHoy ? 'Hoy' : fechaStr}</span>
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold truncate mb-0.5" style={{ color: 'var(--ns-text)' }}>{t.cliente_nombre}</p>
                        <p className="text-[11px] font-medium truncate" style={{ color: 'var(--ns-text-muted)' }}>
                          {[t.servicios?.nombre, t.empleados?.nombre ? t.empleados.nombre.split(' ')[0] : vocab.fallbackStaff]
                            .filter(Boolean)
                            .join(' · ')}
                        </p>
                      </div>
                      <a
                        href={`https://wa.me/${t.cliente_telefono?.replace(/[^0-9]/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="nh-wa-btn shrink-0"
                        title="Escribir por WhatsApp"
                      >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" /></svg>
                      </a>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })()}

        {/* === CUPOS DISPONIBLES === */}
        {(() => {
          // Normalizamos antes de leer: hay negocios con el día marcado como
          // abierto pero sin hora de inicio, y `parseTime` reventaba la pestaña
          // entera de la agenda con "cannot read properties of undefined".
          const horarios = negocio?.horarios ? normalizarHorarios(negocio.horarios) : null
          if (!horarios) return null

          const diasMap = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']
          const hoy = new Date()
          const diaKey = diasMap[hoy.getDay()]
          const config = horarios[diaKey]

          if (!config || !config.abierto) return (
            <div className="pt-2">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 bg-[#BFDBFE] rounded-full" />
                <h3 className="ui-eyebrow">Lugares libres hoy</h3>
              </div>
              <div className="ui-well text-center py-6">
                <p className="ui-empty__title">Hoy no atendés</p>
                <p className="ui-empty__text mx-auto mt-1">No hay horario configurado para este día.</p>
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
            <div className="pt-2">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2 h-2 rounded-full" style={{ background: 'var(--ns-primary)' }} />
                <h3 className="ui-eyebrow">Lugares libres hoy</h3>
              </div>
              <div className="ui-well text-center py-6">
                <p className="ui-empty__title">Sin cupos por hoy</p>
                <p className="ui-empty__text mx-auto mt-1">No quedan horarios libres por el resto del día.</p>
              </div>
            </div>
          )

          return (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="ns-live-dot" style={{ width: 7, height: 7 }} />
                  <h3 className="ui-eyebrow">Cupos disponibles</h3>
                </div>
                <span className="nh-count-badge">
                  {timeKeys.length} {timeKeys.length === 1 ? 'horario' : 'horarios'}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {timeKeys.slice(0, 12).map(time => (
                  <button
                    key={time}
                    onClick={() => {
                      setFechaActual(new Date())
                      setNuevoTurno(prev => ({ ...prev, hora: time, empleado_id: byTime[time][0]?.id || '' }))
                      setModalAbierto(true)
                    }}
                    className="ui-tile !gap-2"
                    title={`Agendar a las ${time}`}
                  >
                    <p className="font-display text-2xl font-bold tracking-tight tabular-nums" style={{ color: 'var(--ns-text)' }}>{time}</p>
                    <div className="flex items-center gap-1.5">
                      <div className="flex -space-x-2">
                        {byTime[time].slice(0, 3).map(emp => (
                          <span key={emp.id} className="w-6 h-6 rounded-full overflow-hidden" style={{ background: 'var(--ns-sunken)', boxShadow: 'var(--ui-shadow-sm)' }} title={emp.nombre}>
                            {emp.foto_url
                              ? <img src={emp.foto_url} alt="" className="w-full h-full object-cover" />
                              : <span className="w-full h-full flex items-center justify-center text-[9px] font-bold" style={{ color: 'var(--ns-primary)' }}>{emp.nombre[0]}</span>}
                          </span>
                        ))}
                      </div>
                      {byTime[time].length > 3 && <span className="text-[10px] font-bold" style={{ color: 'var(--ns-text-muted)' }}>+{byTime[time].length - 3}</span>}
                    </div>
                    <p className="ui-eyebrow">{byTime[time].length} {byTime[time].length === 1 ? 'libre' : 'libres'}</p>
                  </button>
                ))}
              </div>
              {timeKeys.length > 12 && (
                <p className="ui-eyebrow text-center mt-2">Y {timeKeys.length - 12} horarios más disponibles</p>
              )}
            </div>
          )
        })()}

        </div>{/* fin columna derecha */}
        </div>{/* fin grilla de dos columnas */}

        {/* Spacer for FAB */}
        <div className="h-24 md:h-6" />
      </div>

      {/* Botón principal flotante. Antes el contenedor llevaba `.ns-fab-mobile`
          (56x56 fijos) con un botón más ancho adentro, y el bloque rojo se veía
          cortado por detrás. */}
      {/* Va al <body> por portal: la sección entra con una transformación y un
          `position: fixed` adentro de algo transformado se ubica respecto de
          ese algo, no de la pantalla. */}
      {createPortal(
        <button
          onClick={() => { haptic('select'); setModalAbierto(true) }}
          className="ns-page-fab lg:hidden"
          data-testid="agenda-nueva-cita"
          aria-label={vocab.nuevaCita}
        >
          <svg className="w-[22px] h-[22px]" fill="none" stroke="currentColor" strokeWidth="2.8" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" strokeLinecap="round" /></svg>
          <span className="ns-page-fab__label">{vocab.nuevaCita}</span>
          {hayBorrador && <span className="ns-page-fab__dot" aria-hidden="true" />}
        </button>,
        document.body,
      )}

      {/* MODAL BOTTOM-SHEET PARA VER TURNOS DEL DIA SELECCIONADO */}
      {modalDiaAbierto && (
        <div
          className="ui-scrim flex items-end sm:items-center justify-center"
          onClick={() => setModalDiaAbierto(false)}
          role="presentation"
        >
          <div
            className="w-full max-w-lg sm:max-w-2xl lg:max-w-4xl h-[86dvh] sm:h-[80dvh] flex flex-col overflow-hidden sm:m-4 ns-hoja"
            style={{
              paddingBottom: 'env(safe-area-inset-bottom, 0px)',
            }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={`Turnos del ${fechaActual.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}`}
          >
            <div className="ui-sheet__handle sm:hidden" />

            <div className="px-5 sm:px-6 pt-3 sm:pt-6 pb-4 flex justify-between items-center shrink-0">
              <div>
                <h2 className="ui-head__title text-2xl sm:text-3xl">
                  {fechaActual.getDate()} de {fechaActual.toLocaleDateString('es-ES', { month: 'long' })}
                </h2>
                <p className="ui-eyebrow mt-1.5">{turnosVigentes.length} {vocab.citasAsignadas}</p>
              </div>
              <button onClick={() => setModalDiaAbierto(false)} className="ui-icon-btn" aria-label="Cerrar">
                <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="2.6" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" /></svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto overscroll-contain p-4 md:p-6 no-scrollbar" style={{ background: 'var(--ns-sunken)', boxShadow: 'var(--ui-field-sm)' }}>
              {turnosVigentes.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-20 pb-40">
                  {servicios.length === 0 ? (
                    <>
                      <span className="ui-pod ui-pod--lg mb-4">
                        <IconRobot size={26} />
                      </span>
                      <p className="ui-empty__title">Todavía no podés recibir turnos</p>
                      <p className="ui-empty__text mt-2">
                        Creá al menos un {vocab.servicio} para que tus clientes puedan reservar desde tu link.
                      </p>
                    </>
                  ) : (
                    <>
                      <span className="ui-pod ui-pod--sunken ui-pod--lg mb-4">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      </span>
                      <p className="ui-empty__title">Día libre</p>
                      <p className="ui-empty__text mt-2">No hay turnos para este día. Podés cargar uno a mano con el botón de abajo.</p>
                      <button onClick={() => { setModalDiaAbierto(false); setModalAbierto(true) }} className="ui-btn ui-btn--primary mt-4">
                        {vocab.nuevaCita}
                      </button>
                    </>
                  )}
                </div>
              ) : (
                <div className="space-y-8 pb-32">
                  {turnosMañana.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 px-1">
                        <svg className="w-4 h-4" style={{ color: 'var(--ns-primary)' }} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                        <h3 className="ui-eyebrow">Mañana</h3>
                        <div className="flex-1 ui-divider" />
                      </div>
                      <div className="space-y-2.5">{turnosMañana.map(t => renderTurnoCard(t))}</div>
                    </div>
                  )}
                  {turnosTarde.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 px-1">
                        <svg className="w-4 h-4" style={{ color: 'var(--ns-primary)' }} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" /></svg>
                        <h3 className="ui-eyebrow">Tarde</h3>
                        <div className="flex-1 ui-divider" />
                      </div>
                      <div className="space-y-2.5">{turnosTarde.map(t => renderTurnoCard(t))}</div>
                    </div>
                  )}
                  {turnosNoche.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 px-1">
                        <svg className="w-4 h-4" style={{ color: 'var(--ns-primary)' }} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
                        <h3 className="ui-eyebrow">Noche</h3>
                        <div className="flex-1 ui-divider" />
                      </div>
                      <div className="space-y-2.5">{turnosNoche.map(t => renderTurnoCard(t))}</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* HOJA PARA AGREGAR UN TURNO A MANO */}
      {modalAbierto && (
        <div
          className="ui-scrim flex items-end sm:items-center justify-center"
          onClick={() => setModalAbierto(false)}
          role="presentation"
        >
          <div
            className="w-full max-w-lg max-h-[92dvh] overflow-y-auto overscroll-contain ns-hoja"
            style={{
              paddingBottom: 'calc(20px + env(safe-area-inset-bottom, 0px))',
            }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={vocab.nuevaCita}
          >
            <div className="ui-sheet__handle sm:hidden" />

            <div className="px-5 sm:px-8 pt-3 sm:pt-7">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="ui-head__title text-2xl md:text-3xl">{vocab.nuevaCita}</h2>
                  <p className="ui-eyebrow mt-1.5">
                    {fechaActual.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </p>
                  {hayBorrador && (
                    <p className="mt-2 flex items-center gap-2 text-[12px] font-medium text-[#6B7686]">
                      <span className="ui-chip ui-chip--soft">Borrador</span>
                      Seguís donde lo dejaste
                      <button type="button" onClick={() => { haptic(); setNuevoTurno(TURNO_VACIO) }} className="font-semibold text-[#007AFF]">
                        Limpiar
                      </button>
                    </p>
                  )}
                </div>
                <button onClick={() => setModalAbierto(false)} className="ui-icon-btn" aria-label="Cerrar">
                  <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="2.6" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" /></svg>
                </button>
              </div>

              <form onSubmit={handleGuardarTurno} className="flex flex-col gap-4">
                <label className="flex flex-col gap-2">
                  <span className="ui-eyebrow">Nombre del cliente</span>
                  <input
                    required
                    className="ui-field"
                    placeholder="Ej: Juan Pérez"
                    value={nuevoTurno.cliente_nombre}
                    onChange={e => setNuevoTurno({ ...nuevoTurno, cliente_nombre: e.target.value })}
                  />
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <label className="flex flex-col gap-2">
                    <span className="ui-eyebrow">WhatsApp</span>
                    <input
                      required
                      type="tel"
                      inputMode="tel"
                      className="ui-field"
                      placeholder="351..."
                      value={nuevoTurno.cliente_telefono}
                      onChange={e => setNuevoTurno({ ...nuevoTurno, cliente_telefono: e.target.value })}
                    />
                  </label>
                  <label className="flex flex-col gap-2">
                    <span className="ui-eyebrow">Hora</span>
                    <input
                      required
                      type="time"
                      className="ui-field"
                      value={nuevoTurno.hora}
                      onChange={e => setNuevoTurno({ ...nuevoTurno, hora: e.target.value })}
                    />
                  </label>
                </div>

                <label className="flex flex-col gap-2">
                  <span className="ui-eyebrow">{vocab.labelServicioRequerido}</span>
                  <select
                    required
                    className="ui-field cursor-pointer"
                    value={nuevoTurno.servicio_id}
                    onChange={e => setNuevoTurno({ ...nuevoTurno, servicio_id: e.target.value })}
                  >
                    <option value="">{vocab.seleccionarServicio}</option>
                    {servicios.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.nombre}{s.precio > 0 ? ` · $${Number(s.precio).toLocaleString('es-AR')}` : ''}
                      </option>
                    ))}
                  </select>
                  {servicios.length === 0 && (
                    <span className="text-[11px] font-semibold" style={{ color: 'var(--ns-primary)' }}>
                      Todavía no cargaste ningún {vocab.servicio}. Creá uno para poder agendar.
                    </span>
                  )}
                </label>

                {/* Sin `required`: con el negocio recién creado no hay nadie en
                    el equipo y el formulario no dejaba guardar ni un turno. */}
                <label className="flex flex-col gap-2">
                  <span className="ui-eyebrow">{vocab.labelEmpleado}</span>
                  <select
                    className="ui-field cursor-pointer"
                    value={nuevoTurno.empleado_id}
                    onChange={e => setNuevoTurno({ ...nuevoTurno, empleado_id: e.target.value })}
                  >
                    <option value="">{empleados.length ? vocab.seleccionarEmpleado : 'Sin asignar'}</option>
                    {empleados.map(emp => <option key={emp.id} value={emp.id}>{emp.nombre}</option>)}
                  </select>
                </label>

                <button
                  disabled={guardando || servicios.length === 0}
                  type="submit"
                  className="ui-btn ui-btn--primary ui-btn--block mt-2"
                >
                  {guardando ? <span className="ui-spinner ui-spinner--sm" style={{ borderTopColor: 'var(--ns-paper)' }} /> : vocab.confirmarCita}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMAR CANCELACIÓN */}
      {confirmDialog.show && (
        <div
          className="ui-scrim flex items-center justify-center p-4"
          onClick={() => setConfirmDialog({ show: false, id: null })}
          role="presentation"
        >
          <div
            className="ui-modal"
            onClick={(e) => e.stopPropagation()}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="ns-cancel-title"
          >
            <span className="ui-pod ui-pod--brand mb-4">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            </span>
            <h3 id="ns-cancel-title" className="ui-head__title text-xl mb-2">¿Cancelar el turno?</h3>
            <p className="text-[13.5px] font-medium leading-relaxed mb-6" style={{ color: 'var(--ns-text-secondary)' }}>
              El horario queda libre al instante y vuelve a aparecer en tu link. El turno se guarda como cancelado, así no perdés el historial del cliente.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDialog({ show: false, id: null })} className="ui-btn flex-1">Volver</button>
              <button onClick={() => confirmarYCancelarTurno()} className="ui-btn ui-btn--primary flex-1">Sí, cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}