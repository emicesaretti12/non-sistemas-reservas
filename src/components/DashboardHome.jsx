import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { supabase } from '../supabaseClient'
import { ocupaHorario, precioTurno, normalizarHorarios } from '../utils/reservas'
import { haptic } from '../utils/haptics'
import { mayusculaInicial } from '../utils/vocabulario'
import Contador from './ui/Contador'

/**
 * DashboardHome — el resumen del día: lo que viene, lo que falta y cómo va la semana.
 * Muestra de un vistazo: citas de hoy, turnos próximos y lugares disponibles.
 * Pensado para usarse con el dedo (targets grandes, scroll vertical).
 */

const DIAS_MAP = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']
const DIAS_LABEL = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

function saludo() {
  const h = new Date().getHours()
  if (h < 12) return 'Buenos días'
  if (h < 19) return 'Buenas tardes'
  return 'Buenas noches'
}

const fmtHora = (d) => new Date(d).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })

export default function DashboardHome({
  negocio,
  vocab,
  onNavigate,
  publicLink,
  showToast,
  clientesCount = 0,
  stats = {},
  distribucionSemanal = [0, 0, 0, 0, 0, 0, 0],
}) {
  const [loading, setLoading] = useState(true)
  const [falloCarga, setFalloCarga] = useState(false)
  const cancelRef = useRef(false)
  const [turnosHoy, setTurnosHoy] = useState([])
  const [servicios, setServicios] = useState([])
  const [empleados, setEmpleados] = useState([])
  // Reloj interno: se refresca cada minuto para que el countdown de la próxima
  // cita y los "lugares libres" no queden congelados con la pantalla abierta.
  const [ahora, setAhora] = useState(() => new Date())
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  // Barra del pulso semanal sobre la que está el dedo o el mouse.
  const [barraActiva, setBarraActiva] = useState(null)
  const [showInstallBtn, setShowInstallBtn] = useState(false)

  // Lógica de instalación PWA
  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBtn(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowInstallBtn(false);
    }
    setDeferredPrompt(null);
  };

  useEffect(() => {
    const t = setInterval(() => setAhora(new Date()), 60000)
    return () => clearInterval(t)
  }, [])

  const cargar = useCallback(async () => {
    if (!negocio?.id) return
    setLoading(true)
    setFalloCarga(false)
    const hoy = new Date()
    const ini = new Date(hoy); ini.setHours(0, 0, 0, 0)
    const fin = new Date(hoy); fin.setHours(23, 59, 59, 999)

    try {
      const [tRes, sRes, eRes] = await Promise.all([
        supabase.from('turnos')
          .select('*, servicios(nombre, precio, duracion_minutos), empleados(nombre, foto_url)')
          .eq('negocio_id', negocio.id)
          .gte('fecha_hora', ini.toISOString())
          .lte('fecha_hora', fin.toISOString())
          .order('fecha_hora', { ascending: true }),
        supabase.from('servicios').select('id, nombre, precio, duracion_minutos').eq('negocio_id', negocio.id),
        supabase.from('empleados').select('id, nombre, estado, foto_url').eq('negocio_id', negocio.id),
      ])

      if (cancelRef.current) return
      if (tRes.error || sRes.error || eRes.error) setFalloCarga(true)
      // Cancelados y ausencias no ocupan lugar ni cuentan (utils/reservas.js).
      setTurnosHoy((tRes.data || []).filter(ocupaHorario))
      setServicios(sRes.data || [])
      setEmpleados(eRes.data || [])
    } catch {
      // Sin señal o servidor caído: antes la promesa quedaba colgada y el
      // panel se quedaba girando para siempre, sin forma de reintentar.
      if (!cancelRef.current) setFalloCarga(true)
    } finally {
      if (!cancelRef.current) setLoading(false)
    }
  }, [negocio?.id])

  useEffect(() => {
    cancelRef.current = false
    cargar()
    return () => { cancelRef.current = true }
  }, [cargar])

  // ── Derivados de citas de hoy ──────────────────────────────────────────────
  // "Por venir" = todavía no empezó Y no fue marcado como resuelto.
  const proximos = useMemo(
    () => turnosHoy.filter((t) => (
      new Date(t.fecha_hora) > ahora && t.estado !== 'completado' && t.estado !== 'no_show'
    )),
    [turnosHoy, ahora]
  )
  const atendidos = turnosHoy.length - proximos.length
  const ingresosHoy = turnosHoy.reduce((a, t) => a + precioTurno(t), 0)
  const proximaCita = proximos[0] || null

  let countdown = ''
  if (proximaCita) {
    const diff = Math.round((new Date(proximaCita.fecha_hora) - ahora) / 60000)
    if (diff <= 0) countdown = 'ahora'
    else if (diff < 60) countdown = `en ${diff} min`
    else countdown = `en ${Math.floor(diff / 60)}h ${diff % 60}m`
  }

  // ── Lugares disponibles hoy (mismo algoritmo que la Agenda) ─────────────────
  const lugares = useMemo(() => {
    const horarios = negocio?.horarios ? normalizarHorarios(negocio.horarios) : null
    if (!horarios) return { estado: 'sin-config', slots: [] }
    const config = horarios[DIAS_MAP[ahora.getDay()]]
    if (!config || !config.abierto) return { estado: 'cerrado', slots: [] }

    const minDur = servicios.length > 0 ? Math.min(...servicios.map((s) => s.duracion_minutos || 30)) : 30
    const parse = (str) => { const [h, m] = String(str).split(':').map(Number); return h * 60 + m }
    const ini = parse(config.inicio)
    const fin = parse(config.fin)
    const pIni = config.pausa ? parse(config.inicioPausa) : null
    const pFin = config.pausa ? parse(config.finPausa) : null
    const nowMin = ahora.getHours() * 60 + ahora.getMinutes()

    const booked = turnosHoy.map((t) => {
      const d = new Date(t.fecha_hora)
      const start = d.getHours() * 60 + d.getMinutes()
      return { start, end: start + (t.servicios?.duracion_minutos || 30), empId: t.empleado_id }
    })

    const empsActivos = empleados.filter((e) => e.estado === 'activo' || !e.estado)
    const free = []
    const pool = empsActivos.length > 0 ? empsActivos : [{ id: null, nombre: vocab?.fallbackStaff || 'Disponible' }]

    pool.forEach((emp) => {
      const eb = booked.filter((b) => b.empId === emp.id)
      for (let slot = ini; slot + minDur <= fin; slot += minDur) {
        if (pIni !== null && slot >= pIni && slot < pFin) continue
        if (slot < nowMin) continue
        const overlap = eb.some((b) => (slot >= b.start && slot < b.end) || (slot + minDur > b.start && slot < b.end))
        if (!overlap) free.push({ timeStr: `${String(Math.floor(slot / 60)).padStart(2, '0')}:${String(slot % 60).padStart(2, '0')}`, emp })
      }
    })

    const byTime = {}
    free.forEach((s) => { (byTime[s.timeStr] = byTime[s.timeStr] || []).push(s.emp) })
    const slots = Object.keys(byTime).sort().map((time) => ({ time, emps: byTime[time] }))
    return { estado: slots.length ? 'ok' : 'lleno', slots }
  }, [negocio?.horarios, servicios, empleados, turnosHoy, ahora, vocab?.fallbackStaff])

  const lugaresCount = lugares.slots.length

  // ── Recordatorio WhatsApp ───────────────────────────────────────────────────
  async function recordar(t) {
    const num = t.cliente_telefono?.replace(/[^0-9]/g, '') || ''
    const nombre = t.cliente_nombre?.split(' ')[0] || ''
    const serv = t.servicios?.nombre?.toLowerCase() || vocab?.servicio || 'turno'
    const msg = `Hola ${nombre}, te recuerdo tu ${serv} hoy a las ${fmtHora(t.fecha_hora)} hs. ¡Te esperamos!`
    if (num) window.open(`https://wa.me/${num}?text=${encodeURIComponent(msg)}`, '_blank')
    await supabase.from('turnos').update({ recordatorio_enviado: true }).eq('id', t.id)
    setTurnosHoy((prev) => prev.map((x) => (x.id === t.id ? { ...x, recordatorio_enviado: true } : x)))
  }

  const maxSem = Math.max(...distribucionSemanal, 1)
  const hoyIdx = ahora.getDay() === 0 ? 6 : ahora.getDay() - 1
  const fechaLarga = ahora.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })

  if (loading) {
    // Esqueleto en vez de un spinner suelto: se ve la forma de lo que viene
    // y la espera se siente más corta.
    return (
      <div className="space-y-4 md:space-y-5" data-testid="home-loading" aria-busy="true">
        <div className="ns-skeleton" style={{ height: 132 }} />
        <div className="grid grid-cols-3 gap-3 md:gap-4">
          <div className="ns-skeleton" style={{ height: 96 }} />
          <div className="ns-skeleton" style={{ height: 96 }} />
          <div className="ns-skeleton" style={{ height: 96 }} />
        </div>
        <div className="ns-skeleton" style={{ height: 220 }} />
        <span className="ns-sr-only">Cargando tu resumen del día…</span>
      </div>
    )
  }

  if (falloCarga) {
    return (
      <section className="ui-card p-7 text-center" data-testid="home-error">
        <span className="ui-avatar w-14 h-14 mx-auto mb-4">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24"><path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </span>
        <h2 className="font-display text-lg font-bold tracking-tight" style={{ color: 'var(--ns-text)' }}>No pudimos traer tu día</h2>
        <p className="text-[13px] mt-2 mb-5 leading-relaxed" style={{ color: 'var(--ns-text-secondary)' }}>
          Puede ser la conexión. Tus datos están a salvo: probá de nuevo en un momento.
        </p>
        <button onClick={cargar} className="ui-btn ui-btn--primary">Reintentar</button>
      </section>
    )
  }

  return (
    <div className="flex flex-col gap-4 md:gap-5" data-testid="dashboard-home">

      {/* ═══════════ SALUDO ═══════════ */}
      <header className="ui-card p-5 md:p-8 overflow-hidden relative" data-testid="home-hero">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-5">
          <div className="flex items-center gap-4 min-w-0">
            <span className="ui-pod ui-pod--lg overflow-hidden p-0">
              {negocio?.logo_url
                ? <img src={negocio.logo_url} alt="" className="w-full h-full object-cover" />
                : <span className="font-display text-2xl font-bold">{negocio?.nombre?.charAt(0) || 'N'}</span>}
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="ns-live-dot" style={{ width: 7, height: 7 }} />
                <span className="ui-eyebrow">{saludo()}</span>
              </div>
              <h1 className="font-display text-2xl md:text-4xl font-bold tracking-tight leading-none truncate" style={{ color: 'var(--ns-text)' }}>
                {negocio?.nombre || 'Tu negocio'}
              </h1>
              <p className="text-[11px] font-semibold mt-1.5" style={{ color: 'var(--ns-text-muted)' }}>{mayusculaInicial(fechaLarga)}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 md:ml-auto shrink-0">
            <button
              onClick={() => { haptic(); window.open(publicLink, '_blank') }}
              className="ui-icon-btn"
              title="Ver mi app pública"
              data-testid="home-view-app"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" className="w-[18px] h-[18px]"><path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
            <button onClick={() => { haptic(); onNavigate?.('ajustes') }} className="ui-icon-btn" title="Ajustes">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" className="w-[18px] h-[18px]"><path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" strokeLinecap="round" strokeLinejoin="round" /><circle cx="12" cy="12" r="3" /></svg>
            </button>
          </div>
        </div>

        {showInstallBtn && (
          <div className="ui-well mt-5 flex items-center justify-between gap-4 !py-3.5">
            <div className="flex items-center gap-3 min-w-0">
              <span className="ui-pod ui-pod--sm">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" className="w-4 h-4"><path d="M12 18v-6m0 0l-3 3m3-3l3 3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </span>
              <div className="min-w-0">
                <p className="text-[13px] font-bold leading-tight" style={{ color: 'var(--ns-text)' }}>Instalar Noni</p>
                <p className="text-[11px] font-medium truncate" style={{ color: 'var(--ns-text-muted)' }}>Queda en tu pantalla de inicio, como cualquier app.</p>
              </div>
            </div>
            <button onClick={handleInstallClick} className="ui-btn ui-btn--primary ui-btn--quiet shrink-0">Instalar</button>
          </div>
        )}
      </header>

      {/* ═══════════ MÉTRICAS DEL DÍA ═══════════ */}
      <div className="grid grid-cols-3 gap-3 md:gap-4" data-testid="home-today-stats">
        <button onClick={() => { haptic(); onNavigate?.('agenda') }} className="ui-tile ui-tile--blue" data-testid="metric-citas">
          <span className="ui-pod ui-pod--sm  mb-3" aria-hidden="true"><svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24"><path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" /></svg></span>
          <span className="ui-stat__label">{mayusculaInicial(vocab?.turnos || 'Citas')} hoy</span>
          <span className="ui-stat__value"><Contador valor={turnosHoy.length} /></span>
          <span className="ui-stat__foot">{proximos.length} por venir</span>
        </button>
        <button onClick={() => { haptic(); onNavigate?.('agenda') }} className="ui-tile ui-tile--violet" data-testid="metric-lugares">
          <span className="ui-pod ui-pod--sm ui-pod--violet mb-3" aria-hidden="true"><svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" /></svg></span>
          <span className="ui-stat__label">Libres hoy</span>
          <span className="ui-stat__value"><Contador valor={lugaresCount} /></span>
          <span className="ui-stat__foot">{lugaresCount === 1 ? 'Cupo disponible' : 'Cupos disponibles'}</span>
        </button>
        <div className="ui-tile ui-tile--green" data-testid="metric-ingresos">
          <span className="ui-pod ui-pod--sm ui-pod--green mb-3" aria-hidden="true"><svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24"><path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" /></svg></span>
          <span className="ui-stat__label">Ingresos</span>
          <span className="ui-stat__value" style={{ fontSize: 'clamp(20px, 4.4vw, 32px)' }}>
            <Contador valor={ingresosHoy} prefijo="$" />
          </span>
          <span className="ui-stat__foot">{atendidos} {atendidos === 1 ? 'atendido' : 'atendidos'}</span>
        </div>
      </div>

      {/* ═══════════ PRÓXIMA CITA ═══════════ */}
      {proximaCita && (
        <section className="ui-card p-5 md:p-6" data-testid="home-next-appointment">
          <div className="flex items-center gap-4">
            <span className="ui-pod ui-pod--brand ui-pod--lg flex-col leading-none">
              <span className="font-display text-xl font-bold">{fmtHora(proximaCita.fecha_hora).split(':')[0]}</span>
              <span className="text-[10px] font-bold opacity-80">:{fmtHora(proximaCita.fecha_hora).split(':')[1]}</span>
            </span>

            <div className="flex-1 min-w-0">
              <span className="ui-chip ui-chip--soft mb-1.5">Próxima · {countdown}</span>
              <p className="text-base md:text-xl font-bold truncate leading-tight" style={{ color: 'var(--ns-text)' }}>
                {proximaCita.cliente_nombre || 'Cliente'}
              </p>
              <p className="text-[11px] font-medium truncate mt-0.5" style={{ color: 'var(--ns-text-muted)' }}>
                {proximaCita.servicios?.nombre || vocab?.servicio}
                {proximaCita.empleados?.nombre ? ` · ${proximaCita.empleados.nombre.split(' ')[0]}` : ''}
              </p>
            </div>

            <button
              onClick={() => recordar(proximaCita)}
              className={`nh-wa-btn shrink-0 ${proximaCita.recordatorio_enviado ? 'is-sent' : ''}`}
              title={proximaCita.recordatorio_enviado ? 'Recordatorio enviado' : 'Recordar por WhatsApp'}
              data-testid="home-remind-next"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" /></svg>
            </button>
          </div>
        </section>
      )}

      {/* ═══════════ PRÓXIMOS TURNOS ═══════════ */}
      <section className="ui-list" data-testid="home-upcoming">
        <div className="ui-head p-5 pb-3 mb-0">
          <div>
            <h2 className="ui-head__title text-lg md:text-xl">Próximos turnos</h2>
            <p className="text-[11px] font-semibold mt-1" style={{ color: 'var(--ns-text-muted)' }}>
              {proximos.length} {proximos.length === 1 ? 'pendiente' : 'pendientes'} hoy
            </p>
          </div>
          <button onClick={() => { haptic(); onNavigate?.('agenda') }} className="nh-link" data-testid="home-goto-agenda">
            Ver agenda
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" className="w-3 h-3"><path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        </div>

        {proximos.length === 0 ? (
          <div className="ui-empty">
            <span className="ui-pod ui-pod--sunken ui-pod--lg">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-6 h-6"><path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </span>
            <p className="ui-empty__title">Agenda despejada</p>
            <p className="ui-empty__text">No quedan turnos por atender hoy. Es buen momento para mover tu link.</p>
            <button
              onClick={() => { haptic('success'); navigator.clipboard?.writeText(publicLink); showToast?.('¡Link copiado!', 'copy') }}
              className="ui-btn ui-btn--primary mt-1"
            >
              Compartir mi link
            </button>
          </div>
        ) : (
          <>
            {proximos.slice(0, 6).map((t) => {
              const diff = Math.round((new Date(t.fecha_hora) - ahora) / 60000)
              const pronto = diff <= 60
              return (
                <div key={t.id} className="ui-list__row" data-testid={`home-turno-${t.id}`}>
                  <div className="flex flex-col items-center w-14 shrink-0">
                    <span className="text-[15px] font-bold tabular-nums leading-none" style={{ color: 'var(--ns-text)' }}>{fmtHora(t.fecha_hora)}</span>
                    <span className={`text-[9px] font-bold uppercase tracking-[0.06em] mt-1 ${pronto ? 'ns-breathe' : ''}`} style={{ color: pronto ? 'var(--ns-primary)' : 'var(--ns-text-faint)' }}>
                      {diff < 60 ? `${diff}m` : `${Math.floor(diff / 60)}h`}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13.5px] font-bold truncate" style={{ color: 'var(--ns-text)' }}>{t.cliente_nombre || 'Cliente'}</p>
                    <p className="text-[11px] font-medium truncate mt-0.5" style={{ color: 'var(--ns-text-muted)' }}>
                      {t.servicios?.nombre || vocab?.servicio}
                      {t.empleados?.nombre ? ` · ${t.empleados.nombre.split(' ')[0]}` : ''}
                    </p>
                  </div>
                  <button
                    onClick={() => recordar(t)}
                    className={`nh-wa-btn nh-wa-btn--sm shrink-0 ${t.recordatorio_enviado ? 'is-sent' : ''}`}
                    title={t.recordatorio_enviado ? 'Recordatorio enviado' : 'Recordar por WhatsApp'}
                    data-testid={`home-remind-${t.id}`}
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" /></svg>
                  </button>
                </div>
              )
            })}
            {proximos.length > 6 && (
              <button onClick={() => onNavigate?.('agenda')} className="ui-list__row ui-list__row--interactive justify-center text-[10px] font-bold uppercase tracking-[0.15em]" style={{ color: 'var(--ns-text-muted)' }}>
                +{proximos.length - 6} turnos más
              </button>
            )}
          </>
        )}
      </section>

      {/* ═══════════ DISPONIBILIDAD ═══════════ */}
      <section className="ui-card p-5 md:p-6" data-testid="home-available">
        <div className="ui-head">
          <div className="flex items-center gap-3">
            <span className="ui-pod ui-pod--sunken">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" className="w-[18px] h-[18px]"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </span>
            <div>
              <h2 className="ui-head__title text-lg">Disponibilidad</h2>
              <p className="text-[11px] font-semibold" style={{ color: 'var(--ns-text-muted)' }}>Cupos libres para hoy</p>
            </div>
          </div>
          {lugares.estado === 'ok' && <span className="nh-count-badge">{lugaresCount} libres</span>}
        </div>

        {lugares.estado === 'sin-config' && (
          <button onClick={() => { haptic(); onNavigate?.('horarios') }} className="ui-well w-full text-center py-7">
            <p className="ui-empty__title mb-1">Todavía no cargaste tus horarios</p>
            <p className="ui-empty__text mx-auto">Sin horarios, tu link muestra todos los días cerrados.</p>
            <span className="ui-btn ui-btn--primary ui-btn--quiet mt-3">Configurarlos ahora</span>
          </button>
        )}
        {lugares.estado === 'cerrado' && (
          <div className="ui-well text-center py-7">
            <p className="ui-empty__title">Hoy está cerrado</p>
            <p className="ui-empty__text mx-auto mt-1">Según tus horarios, hoy no atendés.</p>
          </div>
        )}
        {lugares.estado === 'lleno' && (
          <div className="ui-well text-center py-7">
            <p className="ui-empty__title">Día completo</p>
            <p className="ui-empty__text mx-auto mt-1">No quedan cupos libres por el resto del día.</p>
          </div>
        )}
        {lugares.estado === 'ok' && (
          <div className="ui-well">
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2.5 ns-stagger">
              {lugares.slots.slice(0, 11).map(({ time, emps }) => (
                <button
                  key={time}
                  onClick={() => { haptic(); onNavigate?.('agenda') }}
                  className="nh-slot"
                  data-testid={`available-slot-${time}`}
                  title={`${emps.length} ${emps.length === 1 ? 'lugar libre' : 'lugares libres'} a las ${time}`}
                >
                  <span className="nh-slot-time">{time}</span>
                  <span className="nh-slot-sub">{emps.length} {emps.length === 1 ? 'libre' : 'libres'}</span>
                </button>
              ))}
              {lugaresCount > 11 && (
                <button onClick={() => onNavigate?.('agenda')} className="nh-slot" style={{ color: 'var(--ns-primary)' }}>
                  <span className="nh-slot-time">+{lugaresCount - 11}</span>
                  <span className="nh-slot-sub">más</span>
                </button>
              )}
            </div>
          </div>
        )}
      </section>

      {/* ═══════════ ACCIONES RÁPIDAS ═══════════ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4" data-testid="home-quick-actions">
        {[
          { label: vocab?.nuevaCita || 'Nueva cita', icon: 'M12 4v16m8-8H4', action: () => onNavigate?.('agenda') },
          { label: 'Compartir', icon: 'M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z', action: () => { const wa = encodeURIComponent(`${vocab?.shareWA || 'Reservá en'} ${negocio?.nombre}: ${publicLink}`); window.open(`https://wa.me/?text=${wa}`, '_blank') } },
          { label: 'Clientes', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z', action: () => onNavigate?.('clientes') },
          { label: 'Reportes', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z', action: () => onNavigate?.('reportes') },
        ].map((a, i) => (
          <button key={i} onClick={() => { haptic(); a.action() }} className="nh-action" data-testid={`quick-action-${i}`}>
            <span className="nh-action-ic">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" className="w-5 h-5"><path d={a.icon} strokeLinecap="round" strokeLinejoin="round" /></svg>
            </span>
            <span className="nh-action-label">{a.label}</span>
          </button>
        ))}
      </div>

      {/* ═══════════ PULSO SEMANAL ═══════════ */}
      <section className="ui-card p-5 md:p-7" data-testid="home-weekly-pulse">
        <div className="ui-head">
          <div>
            <h2 className="ui-head__title text-lg md:text-xl">Pulso semanal</h2>
            <p className="text-[11px] font-semibold mt-1" style={{ color: 'var(--ns-text-muted)' }}>
              {stats.semana || 0} {vocab?.turnos || 'turnos'} · {clientesCount} clientes
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="font-display text-2xl md:text-3xl font-bold tabular-nums leading-none" style={{ color: 'var(--ns-text)' }}>
              <Contador valor={stats.tasaOcupacion || 0} sufijo="%" />
            </p>
            <p className="ui-eyebrow mt-1.5">Ocupación</p>
          </div>
        </div>

        <div className="ui-well">
          <div className="flex items-end justify-between h-32 md:h-40 gap-2 md:gap-4">
            {distribucionSemanal.map((val, idx) => {
              const esHoy = idx === hoyIdx
              const alto = Math.max((val / maxSem) * 100, 4)
              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full min-w-0">
                  <div
                    className="relative w-full flex-1 flex items-end"
                    onMouseEnter={() => setBarraActiva(idx)}
                    onMouseLeave={() => setBarraActiva(null)}
                    onTouchStart={() => setBarraActiva(idx)}
                  >
                    {barraActiva === idx && (
                      <span className="ui-tip" style={{ bottom: `calc(${alto}% + 12px)`, left: '50%', transform: 'translateX(-50%)' }}>
                        {val} {val === 1 ? (vocab?.turno || 'turno') : (vocab?.turnos || 'turnos')}
                      </span>
                    )}
                    <div
                      className={`ui-bar ${esHoy ? '' : 'ui-bar--quiet'}`}
                      style={{ height: `${alto}%`, animationDelay: `${idx * 60}ms` }}
                      aria-label={`${DIAS_LABEL[idx]}: ${val}`}
                    />
                  </div>
                  <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-[0.06em]" style={{ color: esHoy ? 'var(--ns-primary)' : 'var(--ns-text-faint)' }}>
                    {DIAS_LABEL[idx]}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </section>
    </div>
  )
}
